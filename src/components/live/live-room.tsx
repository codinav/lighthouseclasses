"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  ChevronLeft,
  Crown,
  Hand,
  Megaphone,
  Mic,
  MicOff,
  MonitorUp,
  Radio,
  Send,
  Users,
  Video,
  VideoOff,
} from "lucide-react";
import type { LiveClass } from "@/lib/types";
import { getCourse, getTeacher } from "@/lib/data";
import { findTeacherMerged } from "@/lib/teachers";
import { useAuth } from "@/lib/providers";
import { recordLiveJoin } from "@/lib/activity";
import {
  createLiveTransport,
  type LiveChatRecord,
  type LiveTransport,
  type PresenceMember,
} from "@/lib/live-transport";
import { HostBroadcaster, ViewerReceiver } from "@/lib/rtc";
import { Avatar } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

interface ChatMsg extends LiveChatRecord {
  self?: boolean;
  system?: boolean;
}

function seedChat(teacherName: string): ChatMsg[] {
  return [
    { id: "s1", name: teacherName, text: "Welcome everyone! We start in a couple of minutes — keep your questions ready. ✨", teacher: true, ts: Date.now() - 60000 },
  ];
}

export function LiveRoom({ lc }: { lc: LiveClass }) {
  const { user } = useAuth();
  const [teacher, setTeacher] = useState<{ name: string; title: string; gradient: string } | null>(
    getTeacher(lc.teacherId) ?? null
  );
  const course = getCourse(lc.courseSlug);

  /* Custom (admin-created) teachers resolve from the DB */
  useEffect(() => {
    if (teacher) return;
    void findTeacherMerged(lc.teacherId).then((t) => {
      if (t) setTeacher({ name: t.name, title: t.title, gradient: t.gradient });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lc.teacherId]);
  const isHost = user?.role === "admin" || user?.role === "master";
  const myName = isHost ? `${user?.name ?? "Host"}` : (user?.name ?? "You");

  /* Attendance counts toward XP and the Mushaira Star badge */
  useEffect(() => {
    if (user?.email) recordLiveJoin(user.email, lc.id);
  }, [user?.email, lc.id]);

  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [draft, setDraft] = useState("");
  const [announceDraft, setAnnounceDraft] = useState("");
  const [announcement, setAnnouncement] = useState<{ name: string; text: string } | null>(null);
  const [members, setMembers] = useState<PresenceMember[]>([]);
  const [mode, setMode] = useState<"supabase" | "local" | null>(null);
  const [handRaised, setHandRaised] = useState(false);
  const [micOn, setMicOn] = useState(false);
  const [camOn, setCamOn] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [mediaError, setMediaError] = useState("");
  const [micLevel, setMicLevel] = useState(0);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [mediaFlowing, setMediaFlowing] = useState(false);
  const [rtcState, setRtcState] = useState<RTCPeerConnectionState | null>(null);
  const [needsTap, setNeedsTap] = useState(false);
  const [peerId] = useState(() =>
    typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : Math.random().toString(36).slice(2)
  );

  const transport = useRef<LiveTransport | null>(null);
  const broadcaster = useRef<HostBroadcaster | null>(null);
  const receiver = useRef<ViewerReceiver | null>(null);
  const hostPeerId = useRef<string | null>(null);
  const remoteVideo = useRef<HTMLVideoElement>(null);
  const remoteAudio = useRef<HTMLAudioElement>(null);
  const audioStream = useRef<MediaStream | null>(null);
  const videoStream = useRef<MediaStream | null>(null);
  const screenStream = useRef<MediaStream | null>(null);
  const selfVideo = useRef<HTMLVideoElement>(null);
  const stageVideo = useRef<HTMLVideoElement>(null);
  const screenVideo = useRef<HTMLVideoElement>(null);
  const audioCtx = useRef<AudioContext | null>(null);
  const meterRaf = useRef<number>(0);
  const announceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const chatEnd = useRef<HTMLDivElement>(null);

  const liveHost = useMemo(() => members.find((m) => m.host), [members]);
  const raisedHands = useMemo(() => members.filter((m) => m.hand && !m.host), [members]);

  const appendMessage = useCallback((msg: ChatMsg) => {
    setMessages((prev) => [...prev.slice(-300), msg]);
  }, []);

  const systemLine = useCallback(
    (text: string) => appendMessage({ id: crypto.randomUUID(), name: "", text, ts: Date.now(), system: true }),
    [appendMessage]
  );

  /* ---------------- Transport: chat, presence, events, RTC signaling ---------------- */

  useEffect(() => {
    let closed = false;

    void createLiveTransport(lc.id, peerId, {
      onEvent: (event) => {
        if (event.kind === "chat") appendMessage({ ...event.msg, self: false });
        if (event.kind === "hand") systemLine(`✋ ${event.name} ${event.raised ? "raised" : "lowered"} their hand`);
        if (event.kind === "announce") {
          setAnnouncement({ name: event.name, text: event.text });
          systemLine(`📣 Announcement from ${event.name}: ${event.text}`);
          if (announceTimer.current) clearTimeout(announceTimer.current);
          announceTimer.current = setTimeout(() => setAnnouncement(null), 12000);
        }
        if (event.kind === "rtc") {
          if (event.to && event.to !== peerId) return; // not addressed to me
          if (isHost) {
            void broadcaster.current?.handleSignal(event.from, event.data);
          } else {
            if (event.data.type === "offer") hostPeerId.current = event.from;
            void receiver.current?.handleSignal(event.data);
          }
        }
      },
      onPresence: (list) => setMembers(list),
    }).then(async (t) => {
      if (closed) {
        t.close();
        return;
      }
      transport.current = t;
      setMode(t.mode);
      t.setPresence({ name: myName, hand: false, host: isHost });

      // WebRTC roles
      if (isHost) {
        broadcaster.current = new HostBroadcaster((to, data) =>
          t.send({ kind: "rtc", from: peerId, to, data })
        );
      } else {
        receiver.current = new ViewerReceiver(
          (data) => t.send({ kind: "rtc", from: peerId, to: hostPeerId.current ?? undefined, data }),
          (stream) => {
            setRemoteStream(stream);
            if (!stream) setMediaFlowing(false);
          },
          (state) => setRtcState(state)
        );
      }

      const history = await t.history();
      setMessages((prev) => {
        if (prev.some((m) => !m.system)) return prev;
        const base = history.length > 0 ? history : seedChat(teacher?.name ?? "Your teacher");
        return [...base.map((m) => ({ ...m, self: false })), ...prev];
      });
    });

    return () => {
      closed = true;
      broadcaster.current?.close();
      broadcaster.current = null;
      receiver.current?.close();
      receiver.current = null;
      transport.current?.close();
      transport.current = null;
      if (announceTimer.current) clearTimeout(announceTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lc.id, isHost, peerId]);

  /* Viewers: request the host's stream when a host is present, and keep
     retrying every few seconds until connected (self-heals dropped signals) */
  useEffect(() => {
    if (isHost || !liveHost || remoteStream) return;
    const first = setTimeout(() => receiver.current?.request(), 400);
    const retry = setInterval(() => receiver.current?.request(), 6000);
    return () => {
      clearTimeout(first);
      clearInterval(retry);
    };
  }, [isHost, liveHost, remoteStream]);

  /* Host: keep broadcast tracks + presence media flags in sync with toggles */
  useEffect(() => {
    if (!transport.current) return;
    transport.current.setPresence({
      name: myName,
      hand: handRaised,
      host: isHost,
      cam: isHost ? camOn || sharing : undefined,
      mic: isHost ? micOn : undefined,
    });
    if (isHost) {
      const video = sharing
        ? screenStream.current?.getVideoTracks()[0] ?? null
        : camOn
          ? videoStream.current?.getVideoTracks()[0] ?? null
          : null;
      const audio = micOn ? audioStream.current?.getAudioTracks()[0] ?? null : null;
      broadcaster.current?.setTracks(video, audio);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [micOn, camOn, sharing, handRaised, isHost, myName, mode]);

  /* Viewers: attach the incoming stream to stage video + audio */
  useEffect(() => {
    if (isHost) return;
    if (remoteVideo.current) remoteVideo.current.srcObject = remoteStream;
    if (remoteAudio.current) {
      remoteAudio.current.srcObject = remoteStream;
      if (remoteStream) {
        remoteAudio.current.play().then(
          () => setNeedsTap(false),
          () => setNeedsTap(true) // browser wants a user gesture for sound
        );
      }
    }
  }, [remoteStream, isHost, liveHost?.cam]);

  useEffect(() => {
    chatEnd.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendChat = (e: React.FormEvent) => {
    e.preventDefault();
    if (!draft.trim()) return;
    const msg: LiveChatRecord = {
      id: crypto.randomUUID(),
      name: myName,
      text: draft.trim(),
      ts: Date.now(),
      avatarUrl: user?.avatarUrl,
      teacher: isHost,
    };
    appendMessage({ ...msg, self: true });
    transport.current?.send({ kind: "chat", msg });
    transport.current?.persist(msg);
    setDraft("");
  };

  const toggleHand = () => {
    const next = !handRaised;
    setHandRaised(next); // presence flags sync via the media-state effect
    transport.current?.send({ kind: "hand", name: myName, raised: next });
  };

  const sendAnnouncement = (e: React.FormEvent) => {
    e.preventDefault();
    const text = announceDraft.trim();
    if (!text) return;
    transport.current?.send({ kind: "announce", name: myName, text });
    setAnnouncement({ name: myName, text });
    systemLine(`📣 Announcement sent: ${text}`);
    if (announceTimer.current) clearTimeout(announceTimer.current);
    announceTimer.current = setTimeout(() => setAnnouncement(null), 12000);
    setAnnounceDraft("");
  };

  /* ---------------- Media: real mic, camera, screen ---------------- */

  const mediaFail = (e: unknown, what: string) => {
    const err = e as { name?: string };
    if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      setMediaError("Camera and mic need a secure connection — use localhost or HTTPS.");
    } else if (err?.name === "NotAllowedError") {
      setMediaError(`${what} permission was denied. Allow it from the icon in your browser's address bar, then try again.`);
    } else if (err?.name === "NotFoundError") {
      setMediaError(`No ${what.toLowerCase()} was found on this device.`);
    } else {
      setMediaError(`Couldn't start the ${what.toLowerCase()}. It may be in use by another app.`);
    }
  };

  const stopMeter = () => {
    cancelAnimationFrame(meterRaf.current);
    void audioCtx.current?.close().catch(() => {});
    audioCtx.current = null;
    setMicLevel(0);
  };

  const startMeter = (stream: MediaStream) => {
    try {
      const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const ctx = new Ctx();
      audioCtx.current = ctx;
      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      const data = new Uint8Array(analyser.frequencyBinCount);
      const tick = () => {
        analyser.getByteFrequencyData(data);
        setMicLevel(data.reduce((a, b) => a + b, 0) / data.length / 255);
        meterRaf.current = requestAnimationFrame(tick);
      };
      tick();
    } catch {}
  };

  const toggleMic = async () => {
    setMediaError("");
    if (micOn) {
      audioStream.current?.getTracks().forEach((t) => t.stop());
      audioStream.current = null;
      stopMeter();
      setMicOn(false);
      return;
    }
    try {
      const s = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
      audioStream.current = s;
      startMeter(s);
      setMicOn(true);
    } catch (e) {
      mediaFail(e, "Microphone");
    }
  };

  const toggleCam = async () => {
    setMediaError("");
    if (camOn) {
      videoStream.current?.getTracks().forEach((t) => t.stop());
      videoStream.current = null;
      if (selfVideo.current) selfVideo.current.srcObject = null;
      if (stageVideo.current) stageVideo.current.srcObject = null;
      setCamOn(false);
      return;
    }
    try {
      const s = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: "user" },
      });
      videoStream.current = s;
      setCamOn(true);
    } catch (e) {
      mediaFail(e, "Camera");
    }
  };

  const toggleShare = async () => {
    setMediaError("");
    if (sharing) {
      screenStream.current?.getTracks().forEach((t) => t.stop());
      screenStream.current = null;
      setSharing(false);
      return;
    }
    try {
      const s = await navigator.mediaDevices.getDisplayMedia({ video: true });
      screenStream.current = s;
      setSharing(true);
      s.getVideoTracks()[0].onended = () => {
        screenStream.current = null;
        setSharing(false);
      };
    } catch {
      /* picker cancelled */
    }
  };

  /* Attach streams to video elements */
  useEffect(() => {
    if (!camOn || !videoStream.current) return;
    const target = isHost ? stageVideo.current : selfVideo.current;
    if (target) target.srcObject = videoStream.current;
  }, [camOn, isHost, sharing]);

  useEffect(() => {
    if (sharing && screenVideo.current && screenStream.current) {
      screenVideo.current.srcObject = screenStream.current;
    }
  }, [sharing]);

  useEffect(() => {
    return () => {
      audioStream.current?.getTracks().forEach((t) => t.stop());
      videoStream.current?.getTracks().forEach((t) => t.stop());
      screenStream.current?.getTracks().forEach((t) => t.stop());
      stopMeter();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ------------------------------- UI ------------------------------- */

  const onlineCount = Math.max(members.length, 1);

  return (
    <div className="flex min-h-screen flex-col bg-navy-950 text-white">
      {/* Top bar */}
      <header className="flex h-14 items-center gap-3 border-b border-white/10 px-4">
        <Link href={isHost ? "/admin/live" : "/live"} className="flex items-center gap-1 rounded-full px-2 py-1.5 text-sm text-white/70 hover:bg-white/10 hover:text-white">
          <ChevronLeft className="h-4 w-4" aria-hidden /> <span className="hidden sm:inline">{isHost ? "Admin" : "Schedule"}</span>
        </Link>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-500 px-2.5 py-1 text-2xs font-bold uppercase tracking-wider">
          <Radio className="h-3 w-3" aria-hidden /> Live
        </span>
        {isHost && (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-gold-400 px-2.5 py-1 text-2xs font-bold uppercase tracking-wider text-navy-950">
            <Crown className="h-3 w-3" aria-hidden /> Host
          </span>
        )}
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold">{lc.title}</p>
          <p className="truncate text-2xs text-white/50">{course?.title}</p>
        </div>
        <span
          className="inline-flex items-center gap-1.5 text-xs text-white/70"
          title={mode === "supabase" ? "Realtime backend: Supabase" : "Same-device realtime (connect Supabase for cross-device)"}
        >
          <Users className="h-4 w-4" aria-hidden /> {onlineCount} online
          <span className={cn("h-1.5 w-1.5 rounded-full", mode === "supabase" ? "bg-emerald-400" : "bg-gold-400")} aria-hidden />
        </span>
      </header>

      <div className="grid flex-1 lg:grid-cols-[1fr_360px]">
        {/* Stage */}
        <div className="flex flex-col">
          <div className="relative flex-1 bg-gradient-to-br from-navy-900 to-navy-950 p-4 sm:p-6">
            {/* Announcement banner */}
            {announcement && (
              <p className="absolute inset-x-6 top-4 z-10 flex animate-scale-in items-center gap-2 rounded-2xl border border-gold-400/50 bg-navy-900/95 px-4 py-3 text-sm shadow-glow backdrop-blur">
                <Megaphone className="h-4 w-4 shrink-0 text-gold-400" aria-hidden />
                <span className="font-bold text-gold-300">{announcement.name}:</span>
                <span className="min-w-0 flex-1 truncate">{announcement.text}</span>
              </p>
            )}

            {/* Main tile */}
            {sharing ? (
              <div className="relative flex h-full min-h-[300px] items-center justify-center overflow-hidden rounded-3xl border border-gold-400/40 bg-black">
                <video ref={screenVideo} autoPlay playsInline muted className="max-h-full w-full object-contain" />
                <span className="absolute left-3 top-3 rounded-full bg-gold-400 px-3 py-1 text-2xs font-bold uppercase tracking-wider text-navy-950">
                  You're presenting
                </span>
              </div>
            ) : isHost && camOn ? (
              <div className="relative flex h-full min-h-[300px] items-center justify-center overflow-hidden rounded-3xl border border-gold-400/40 bg-black">
                <video ref={stageVideo} autoPlay playsInline muted className="h-full w-full -scale-x-100 object-cover" />
                <span className="absolute left-3 top-3 rounded-full bg-gold-400 px-3 py-1 text-2xs font-bold uppercase tracking-wider text-navy-950">
                  ● Live — streaming to students
                </span>
              </div>
            ) : !isHost && liveHost?.cam && remoteStream ? (
              <div className="relative flex h-full min-h-[300px] items-center justify-center overflow-hidden rounded-3xl border border-rose-500/40 bg-black">
                <video
                  ref={remoteVideo}
                  autoPlay
                  playsInline
                  muted
                  onPlaying={() => setMediaFlowing(true)}
                  className="h-full w-full object-contain"
                />
                <span className="absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-full bg-rose-500 px-3 py-1 text-2xs font-bold uppercase tracking-wider">
                  <Radio className="h-3 w-3" aria-hidden /> {liveHost.name} — live
                </span>
                {!mediaFlowing && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-navy-950/80">
                    <span className="h-8 w-8 animate-spin rounded-full border-2 border-gold-400 border-t-transparent" aria-hidden />
                    <p className="text-sm text-white/80">
                      {rtcState === "failed"
                        ? "Connection blocked — retrying via relay…"
                        : rtcState === "connected"
                          ? "Almost there — receiving video…"
                          : `Connecting to ${liveHost.name}'s stream…`}
                    </p>
                    <p className="max-w-xs text-center text-2xs text-white/40">
                      Usually takes a few seconds. Restrictive networks are routed through a relay automatically.
                    </p>
                  </div>
                )}
                {needsTap && mediaFlowing && (
                  <button
                    onClick={() => {
                      remoteAudio.current?.play().then(() => setNeedsTap(false), () => {});
                    }}
                    className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full bg-gold-400 px-5 py-2.5 text-sm font-bold text-navy-950 shadow-glow"
                  >
                    🔊 Tap for sound
                  </button>
                )}
              </div>
            ) : (
              <div className="flex h-full min-h-[300px] flex-col items-center justify-center rounded-3xl border border-white/10 bg-navy-900/60">
                {isHost ? (
                  <>
                    <Avatar name={myName} src={user?.avatarUrl} className="h-28 w-28 text-4xl ring-4 ring-gold-400/50" />
                    <p className="mt-4 font-display text-xl font-semibold">You're hosting this class</p>
                    <p className="mt-1 max-w-xs text-center text-sm text-white/55">
                      Turn on your camera or mic — students in the room receive your stream directly.
                    </p>
                  </>
                ) : (
                  <>
                    {teacher && <Avatar name={teacher.name} gradient={teacher.gradient} className="h-28 w-28 text-4xl ring-4 ring-gold-400/50" />}
                    <p className="mt-4 font-display text-xl font-semibold">{liveHost ? liveHost.name : teacher?.name}</p>
                    <p className="text-sm text-white/55">{teacher?.title}</p>
                    <p className="mt-4 flex items-center gap-2 rounded-full bg-white/10 px-4 py-1.5 text-xs text-white/70">
                      <span className={cn("h-2 w-2 rounded-full", liveHost ? "animate-pulse bg-emerald-400" : "bg-white/30")} aria-hidden />
                      {liveHost?.mic
                        ? `🔊 ${liveHost.name} is speaking — audio live`
                        : liveHost
                          ? `${liveHost.name} is here — waiting for camera`
                          : "Waiting for the teacher…"}
                    </p>
                    {needsTap && liveHost?.mic && (
                      <button
                        onClick={() => {
                          remoteAudio.current?.play().then(() => setNeedsTap(false), () => {});
                        }}
                        className="mt-4 rounded-full bg-gold-400 px-5 py-2.5 text-sm font-bold text-navy-950 shadow-glow"
                      >
                        🔊 Tap for sound
                      </button>
                    )}
                  </>
                )}
              </div>
            )}
            {/* Host audio reaches students through this element */}
            {!isHost && <audio ref={remoteAudio} autoPlay className="hidden" />}

            {/* Self tile (students; hosts get the stage) */}
            {!isHost && (
              <div className="absolute bottom-6 right-6 w-40 overflow-hidden rounded-2xl border border-white/15 bg-navy-900 text-center shadow-lifted sm:w-56">
                {camOn ? (
                  <video ref={selfVideo} autoPlay playsInline muted className="aspect-video w-full -scale-x-100 bg-black object-cover" />
                ) : (
                  <div className="flex aspect-video w-full items-center justify-center bg-navy-900">
                    <Avatar name={myName} src={user?.avatarUrl} className="h-12 w-12 sm:h-14 sm:w-14" />
                  </div>
                )}
                <div className="flex items-center justify-between gap-2 px-2.5 py-1.5">
                  <p className="truncate text-2xs font-semibold">{myName}</p>
                  <MicMeter micOn={micOn} level={micLevel} />
                </div>
              </div>
            )}

            {/* Host: raised hands queue */}
            {isHost && raisedHands.length > 0 && (
              <div className="absolute bottom-6 left-6 w-56 rounded-2xl border border-gold-400/40 bg-navy-900/95 p-3 shadow-lifted backdrop-blur">
                <p className="flex items-center gap-1.5 text-2xs font-bold uppercase tracking-widest text-gold-400">
                  <Hand className="h-3.5 w-3.5" aria-hidden /> Raised hands ({raisedHands.length})
                </p>
                <ul className="mt-2 space-y-1.5">
                  {raisedHands.slice(0, 5).map((m, i) => (
                    <li key={`${m.name}-${i}`} className="flex items-center gap-2 text-sm">
                      <Avatar name={m.name} className="h-6 w-6 text-2xs" />
                      <span className="truncate">{m.name}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {handRaised && !isHost && (
              <p className="absolute left-1/2 top-4 -translate-x-1/2 animate-scale-in whitespace-nowrap rounded-full bg-gold-400 px-4 py-2 text-sm font-bold text-navy-950 shadow-glow">
                ✋ Hand raised — the teacher can see you
              </p>
            )}
          </div>

          {mediaError && (
            <p role="alert" className="mx-4 mb-2 flex items-center gap-2 rounded-2xl bg-rose-500/15 px-4 py-2.5 text-xs font-medium text-rose-300">
              <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden /> {mediaError}
            </p>
          )}

          {/* Host announcement bar */}
          {isHost && (
            <form onSubmit={sendAnnouncement} className="flex gap-2 border-t border-white/10 px-4 pt-3">
              <input
                value={announceDraft}
                onChange={(e) => setAnnounceDraft(e.target.value)}
                placeholder="📣 Send an announcement to the whole class…"
                className="w-full rounded-full border border-gold-400/30 bg-gold-400/5 px-4 py-2 text-sm outline-none placeholder:text-white/35 focus:border-gold-400/70"
                aria-label="Announcement"
              />
              <button type="submit" disabled={!announceDraft.trim()} className="btn-gold btn-sm shrink-0 rounded-full">
                Announce
              </button>
            </form>
          )}

          {/* Controls */}
          <div className="flex items-center justify-center gap-2.5 border-t border-white/10 p-4 sm:gap-3">
            <button
              onClick={toggleMic}
              className={cn(
                "relative flex h-12 w-12 items-center justify-center rounded-full transition-colors",
                micOn ? "bg-white/15 hover:bg-white/25" : "bg-rose-500/90 hover:bg-rose-500"
              )}
              aria-pressed={micOn}
              aria-label={micOn ? "Mute microphone" : "Turn microphone on"}
            >
              {micOn ? <Mic className="h-5 w-5" /> : <MicOff className="h-5 w-5" />}
              {micOn && micLevel > 0.06 && <span className="absolute inset-0 animate-pulse rounded-full ring-2 ring-emerald-400/70" aria-hidden />}
            </button>
            <button
              onClick={toggleCam}
              className={cn(
                "flex h-12 w-12 items-center justify-center rounded-full transition-colors",
                camOn ? "bg-white/15 hover:bg-white/25" : "bg-rose-500/90 hover:bg-rose-500"
              )}
              aria-pressed={camOn}
              aria-label={camOn ? "Turn camera off" : "Turn camera on"}
            >
              {camOn ? <Video className="h-5 w-5" /> : <VideoOff className="h-5 w-5" />}
            </button>
            <button
              onClick={toggleShare}
              className={cn(
                "hidden h-12 w-12 items-center justify-center rounded-full transition-colors sm:flex",
                sharing ? "bg-gold-400 text-navy-950 shadow-glow" : "bg-white/15 hover:bg-white/25"
              )}
              aria-pressed={sharing}
              aria-label={sharing ? "Stop presenting" : "Share your screen"}
            >
              <MonitorUp className="h-5 w-5" />
            </button>
            {!isHost && (
              <button
                onClick={toggleHand}
                className={cn(
                  "btn btn-md rounded-full px-5",
                  handRaised ? "bg-gold-400 text-navy-950 shadow-glow" : "bg-white/15 text-white hover:bg-white/25"
                )}
                aria-pressed={handRaised}
              >
                <Hand className="h-5 w-5" aria-hidden /> {handRaised ? "Lower hand" : "Raise hand"}
              </button>
            )}
            <Link href={isHost ? "/admin/live" : "/live"} className="btn btn-md rounded-full bg-rose-500 px-5 text-white hover:bg-rose-600">
              {isHost ? "End for me" : "Leave"}
            </Link>
          </div>
        </div>

        {/* Chat */}
        <aside className="flex max-h-[50vh] flex-col border-t border-white/10 lg:max-h-none lg:border-l lg:border-t-0" aria-label="Class chat">
          <p className="border-b border-white/10 px-4 py-3 text-2xs font-bold uppercase tracking-widest text-white/50">
            Live chat ·{" "}
            {mode === "supabase" ? "cross-device realtime ✓" : mode === "local" ? "this-device realtime (connect Supabase for cross-device)" : "connecting…"}
          </p>
          <div className="flex-1 space-y-4 overflow-y-auto p-4">
            {messages.map((m) =>
              m.system ? (
                <p key={m.id} className="text-center text-2xs text-white/40">
                  {m.text}
                </p>
              ) : (
                <div key={m.id} className={cn("flex gap-2.5", m.self && "flex-row-reverse")}>
                  <Avatar name={m.name} src={m.avatarUrl} className="h-7 w-7 text-2xs" />
                  <div className={cn("max-w-[80%] rounded-2xl px-3.5 py-2.5", m.self ? "bg-ocean-600" : m.teacher ? "border border-gold-400/40 bg-gold-400/10" : "bg-white/10")}>
                    <p className={cn("text-2xs font-bold", m.teacher ? "text-gold-300" : "text-white/60")}>
                      {m.name} {m.teacher && "· Teacher"}
                    </p>
                    <p className="mt-0.5 text-sm leading-relaxed">{m.text}</p>
                  </div>
                </div>
              )
            )}
            <div ref={chatEnd} />
          </div>
          <form onSubmit={sendChat} className="border-t border-white/10 p-3">
            <div className="flex gap-2">
              <input
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder={isHost ? "Message the class as teacher…" : "Ask a doubt or say hi…"}
                className="w-full rounded-full border border-white/15 bg-white/5 px-4 py-2.5 text-sm outline-none placeholder:text-white/35 focus:border-gold-400/60"
                aria-label="Chat message"
              />
              <button type="submit" disabled={!draft.trim()} className="btn-gold flex h-11 w-11 shrink-0 items-center justify-center rounded-full !p-0" aria-label="Send message">
                <Send className="h-4 w-4" />
              </button>
            </div>
          </form>
        </aside>
      </div>
    </div>
  );
}

function MicMeter({ micOn, level }: { micOn: boolean; level: number }) {
  return (
    <span className="flex h-3 items-end gap-0.5" aria-label={micOn ? "Microphone level" : "Microphone off"}>
      {[0.3, 0.65, 1].map((bar, i) => (
        <span
          key={i}
          className={cn("w-1 rounded-full transition-all duration-75", micOn && level > bar * 0.25 ? "bg-emerald-400" : "bg-white/20")}
          style={{ height: `${4 + bar * 8}px` }}
        />
      ))}
    </span>
  );
}
