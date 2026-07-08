"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Bookmark,
  Check,
  ChevronLeft,
  ClipboardList,
  FileQuestion,
  ListVideo,
  Maximize,
  Minimize,
  NotebookPen,
  Pause,
  PictureInPicture2,
  Play,
  PlayCircle,
  RotateCcw,
  RotateCw,
  Settings,
  SkipForward,
  Trash2,
  Volume2,
  VolumeX,
} from "lucide-react";
import type { Course, Lesson } from "@/lib/types";
import { courseHref } from "@/lib/courses";
import { cn, formatDuration } from "@/lib/utils";
import { useAuth } from "@/lib/providers";
import { fetchCourseProgress, saveLessonProgress } from "@/lib/db";
import { enroll, updateProgress } from "@/lib/enrollments";
import { recordCompletion, recordWatchMinutes } from "@/lib/activity";
import { Logo } from "@/components/ui/logo";
import { ProgressBar } from "@/components/ui/progress";

const SPEEDS = [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2];
const QUALITIES = ["Auto", "1080p", "720p", "480p", "360p"];

interface Note {
  id: string;
  time: number;
  text: string;
  lessonId: string;
}

export function LearnRoom({ course }: { course: Course }) {
  // Read ?lesson= client-side so the page stays statically exportable.
  const initialLessonId = useSearchParams().get("lesson") ?? undefined;
  const { user } = useAuth();
  const email = user?.email;
  const allLessons = useMemo(() => course.modules.flatMap((m) => m.lessons), [course]);
  const firstVideo = allLessons.find((l) => l.type === "video") ?? allLessons[0];
  const [lesson, setLesson] = useState<Lesson>(
    allLessons.find((l) => l.id === initialLessonId) ?? firstVideo
  );
  const [completed, setCompleted] = useState<string[]>([]);
  const [tab, setTab] = useState<"lessons" | "notes">("lessons");

  // Player state
  const videoRef = useRef<HTMLVideoElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const [playing, setPlaying] = useState(false);
  const [time, setTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [muted, setMuted] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [quality, setQuality] = useState("Auto");
  const [fullscreen, setFullscreen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [controlsVisible, setControlsVisible] = useState(true);
  const [buffering, setBuffering] = useState(false);
  const [autoNext, setAutoNext] = useState<number | null>(null);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Notes
  const [notes, setNotes] = useState<Note[]>([]);
  const [noteDraft, setNoteDraft] = useState("");

  const storageKey = `lh_progress_${course.slug}`;
  const notesKey = `lh_notes_${course.slug}`;

  const videoSrc = lesson.videoUrl ?? "";
  const lessonIndex = allLessons.indexOf(lesson);
  const nextLesson = allLessons[lessonIndex + 1];

  /* Restore saved state */
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(storageKey) ?? "{}");
      if (saved.completed) setCompleted(saved.completed);
      const savedNotes = JSON.parse(localStorage.getItem(notesKey) ?? "[]");
      setNotes(savedNotes);
    } catch {}
  }, [storageKey, notesKey]);

  /* Auto-enroll on first watch (local + cloud) + merge remote progress */
  useEffect(() => {
    if (!email) return;
    enroll(email, course.slug, "watch");
    void fetchCourseProgress(email, course.slug).then((rows) => {
      if (rows.length === 0) return;
      // Merge remote completions
      setCompleted((prev) => {
        const merged = new Set(prev);
        rows.filter((r) => r.completed).forEach((r) => merged.add(r.lesson_id));
        const arr = Array.from(merged);
        try {
          const saved = JSON.parse(localStorage.getItem(storageKey) ?? "{}");
          localStorage.setItem(storageKey, JSON.stringify({ ...saved, completed: arr }));
        } catch {}
        return arr;
      });
      // Merge remote resume positions (keep whichever is further)
      try {
        const saved = JSON.parse(localStorage.getItem(storageKey) ?? "{}");
        const positions: Record<string, number> = { ...(saved.positions ?? {}) };
        for (const r of rows) {
          if (r.position_sec > (positions[r.lesson_id] ?? 0)) positions[r.lesson_id] = r.position_sec;
        }
        localStorage.setItem(storageKey, JSON.stringify({ ...saved, positions }));
      } catch {}
    });
  }, [email, course.slug, storageKey]);

  /* Resume watching position */
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    try {
      const saved = JSON.parse(localStorage.getItem(storageKey) ?? "{}");
      const pos = saved.positions?.[lesson.id];
      if (pos && pos > 5) v.currentTime = pos;
    } catch {}
  }, [lesson.id, storageKey]);

  const persist = useCallback(
    (patch: Record<string, unknown>) => {
      try {
        const saved = JSON.parse(localStorage.getItem(storageKey) ?? "{}");
        localStorage.setItem(storageKey, JSON.stringify({ ...saved, ...patch }));
      } catch {}
    },
    [storageKey]
  );

  /* Save position + live course progress every 5s while playing */
  useEffect(() => {
    if (!playing) return;
    const id = setInterval(() => {
      const v = videoRef.current;
      if (!v) return;
      try {
        const saved = JSON.parse(localStorage.getItem(storageKey) ?? "{}");
        persist({ positions: { ...(saved.positions ?? {}), [lesson.id]: v.currentTime } });
      } catch {}
      if (email) {
        recordWatchMinutes(email, 5 / 60); // real study-time for streak/XP
        const done = completed.includes(lesson.id);
        void saveLessonProgress(email, course.slug, lesson.id, v.currentTime, done);
        // Course progress moves WHILE watching: completed lessons + the
        // watched fraction of the current one (capped until it completes).
        const frac = done || !v.duration ? 0 : Math.min(v.currentTime / v.duration, 0.9);
        const pct = ((completed.length + frac) / allLessons.length) * 100;
        updateProgress(email, course.slug, pct, lesson.id, lesson.title);
      }
    }, 5000);
    return () => clearInterval(id);
  }, [playing, lesson.id, persist, storageKey, email, course.slug, completed, allLessons.length, lesson.title]);

  const markComplete = useCallback(
    (id: string) => {
      setCompleted((prev) => {
        if (prev.includes(id)) return prev;
        const next = [...prev, id];
        persist({ completed: next });
        if (email) {
          recordCompletion(email, course.slug, id);
          void saveLessonProgress(email, course.slug, id, videoRef.current?.currentTime ?? 0, true);
          updateProgress(
            email,
            course.slug,
            (next.length / allLessons.length) * 100,
            id,
            allLessons.find((l) => l.id === id)?.title ?? ""
          );
        }
        return next;
      });
    },
    [persist, email, course.slug, allLessons]
  );

  /* Controls auto-hide — generous 6s so nobody is left hunting for buttons */
  const poke = useCallback(() => {
    setControlsVisible(true);
    if (hideTimer.current) clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => setControlsVisible(false), 6000);
  }, []);

  const togglePlay = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) void v.play();
    else v.pause();
  }, []);

  const seekBy = useCallback((s: number) => {
    const v = videoRef.current;
    if (v) v.currentTime = Math.max(0, Math.min(v.duration || 0, v.currentTime + s));
  }, []);

  const toggleFullscreen = useCallback(async () => {
    if (!document.fullscreenElement) {
      await wrapRef.current?.requestFullscreen();
    } else {
      await document.exitFullscreen();
    }
  }, []);

  useEffect(() => {
    const onFs = () => setFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", onFs);
    return () => document.removeEventListener("fullscreenchange", onFs);
  }, []);

  /* Keyboard shortcuts */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).tagName === "INPUT" || (e.target as HTMLElement).tagName === "TEXTAREA") return;
      switch (e.key) {
        case " ":
        case "k":
          e.preventDefault();
          togglePlay();
          break;
        case "ArrowRight":
          seekBy(10);
          break;
        case "ArrowLeft":
          seekBy(-10);
          break;
        case "f":
          void toggleFullscreen();
          break;
        case "m":
          setMuted((m) => !m);
          break;
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [togglePlay, seekBy, toggleFullscreen]);

  /* Auto-next countdown */
  useEffect(() => {
    if (autoNext === null) return;
    if (autoNext <= 0) {
      if (nextLesson) selectLesson(nextLesson);
      setAutoNext(null);
      return;
    }
    const t = setTimeout(() => setAutoNext((n) => (n === null ? null : n - 1)), 1000);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoNext]);

  const selectLesson = (l: Lesson) => {
    setLesson(l);
    setPlaying(false);
    setTime(0);
    setAutoNext(null);
    if (email) {
      updateProgress(email, course.slug, (completed.length / allLessons.length) * 100, l.id, l.title);
    }
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const addNote = () => {
    if (!noteDraft.trim()) return;
    const note: Note = { id: crypto.randomUUID(), time, text: noteDraft.trim(), lessonId: lesson.id };
    const next = [note, ...notes];
    setNotes(next);
    setNoteDraft("");
    try {
      localStorage.setItem(notesKey, JSON.stringify(next));
    } catch {}
  };

  const deleteNote = (id: string) => {
    const next = notes.filter((n) => n.id !== id);
    setNotes(next);
    try {
      localStorage.setItem(notesKey, JSON.stringify(next));
    } catch {}
  };

  const addBookmark = () => {
    const note: Note = { id: crypto.randomUUID(), time, text: "🔖 Bookmarked moment", lessonId: lesson.id };
    const next = [note, ...notes];
    setNotes(next);
    try {
      localStorage.setItem(notesKey, JSON.stringify(next));
    } catch {}
    setTab("notes");
  };

  const enterPiP = async () => {
    const v = videoRef.current;
    if (!v) return;
    try {
      if (document.pictureInPictureElement) await document.exitPictureInPicture();
      else await v.requestPictureInPicture();
    } catch {}
  };

  const pct = duration ? (time / duration) * 100 : 0;
  const courseProgress = Math.round((completed.length / allLessons.length) * 100);

  return (
    <div className="min-h-screen bg-navy-950 text-white">
      {/* Top bar */}
      <header className="sticky top-0 z-40 border-b border-white/10 bg-navy-950/90 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-[1600px] items-center gap-4 px-4">
          <Link
            href={courseHref(course)}
            className="flex items-center gap-1.5 rounded-full px-2 py-1.5 text-sm text-white/70 transition-colors hover:bg-white/10 hover:text-white"
          >
            <ChevronLeft className="h-4 w-4" aria-hidden /> <span className="hidden sm:inline">Back to course</span>
          </Link>
          <div className="hidden sm:block">
            <Logo textClassName="text-white" className="[&_svg]:h-7 [&_svg]:w-7" />
          </div>
          <div className="min-w-0 flex-1 text-center">
            <p className="truncate text-sm font-semibold">{course.title}</p>
            <p className="truncate text-2xs text-white/50">
              Lesson {lessonIndex + 1} of {allLessons.length} · {lesson.title}
            </p>
          </div>
          <div className="hidden w-40 items-center gap-2 sm:flex">
            <ProgressBar value={courseProgress} className="flex-1 !bg-white/10" barClassName="!from-gold-400 !to-gold-300" label="Course progress" />
            <span className="text-xs font-bold text-gold-400">{courseProgress}%</span>
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-[1600px] gap-0 lg:grid-cols-[1fr_400px]">
        {/* Player column */}
        <div>
          <div
            ref={wrapRef}
            className="group relative bg-black"
            onMouseMove={poke}
            onTouchStart={poke}
          >
            {!videoSrc && (
              <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-navy-950 p-6 text-center">
                <PlayCircle className="h-10 w-10 text-white/30" aria-hidden />
                <p className="font-semibold">This lesson's video hasn't been uploaded yet.</p>
                <p className="text-sm text-white/55">Check back soon — or continue with the other lessons.</p>
              </div>
            )}
            <video
              ref={videoRef}
              key={lesson.id}
              src={videoSrc}
              className="aspect-video w-full"
              playsInline
              preload="auto"
              onClick={togglePlay}
              onWaiting={() => setBuffering(true)}
              onPlaying={() => setBuffering(false)}
              onCanPlay={() => setBuffering(false)}
              onPlay={() => {
                setPlaying(true);
                poke();
              }}
              onPause={() => setPlaying(false)}
              onTimeUpdate={(e) => {
                const v = e.currentTarget;
                setTime(v.currentTime);
                if (v.duration && v.currentTime / v.duration > 0.9) markComplete(lesson.id);
              }}
              onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)}
              onEnded={() => {
                markComplete(lesson.id);
                if (nextLesson) setAutoNext(5);
              }}
              onRateChange={(e) => setSpeed(e.currentTarget.playbackRate)}
              onVolumeChange={(e) => {
                setVolume(e.currentTarget.volume);
                setMuted(e.currentTarget.muted);
              }}
            />

            {/* Big play button */}
            {!playing && autoNext === null && (
              <button
                onClick={togglePlay}
                aria-label="Play"
                className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-navy-950/30"
              >
                <span className="flex h-24 w-24 items-center justify-center rounded-full bg-gold-400 text-navy-950 shadow-glow transition-transform hover:scale-110">
                  <Play className="ml-1.5 h-11 w-11 fill-current" aria-hidden />
                </span>
                <span className="rounded-full bg-navy-950/70 px-4 py-1.5 text-sm font-semibold backdrop-blur">
                  {time > 3 ? "Tap to continue" : "Tap to play"}
                </span>
              </button>
            )}

            {/* Buffering — never let the screen look frozen */}
            {buffering && playing && (
              <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-3 bg-navy-950/40">
                <span className="h-12 w-12 animate-spin rounded-full border-4 border-gold-400 border-t-transparent" aria-hidden />
                <span className="rounded-full bg-navy-950/70 px-4 py-1.5 text-sm font-semibold">Loading video…</span>
              </div>
            )}

            {/* Auto-next overlay */}
            {autoNext !== null && nextLesson && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-navy-950/90 p-6 text-center">
                <p className="text-sm uppercase tracking-widest text-white/50">Up next in {autoNext}s</p>
                <p className="max-w-md font-display text-2xl font-semibold">{nextLesson.title}</p>
                <div className="flex gap-3">
                  <button onClick={() => selectLesson(nextLesson)} className="btn-gold btn-md">
                    <SkipForward className="h-4 w-4" aria-hidden /> Play now
                  </button>
                  <button onClick={() => setAutoNext(null)} className="btn-ghost btn-md border-white/25 text-white hover:bg-white/10">
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {/* Controls */}
            <div
              className={cn(
                "absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent px-4 pb-3 pt-10 transition-opacity duration-300",
                controlsVisible || !playing ? "opacity-100" : "opacity-0"
              )}
            >
              {/* Seek bar */}
              <input
                type="range"
                min={0}
                max={duration || 100}
                step={0.1}
                value={time}
                onChange={(e) => {
                  const v = videoRef.current;
                  if (v) v.currentTime = Number(e.target.value);
                }}
                className="player-range w-full"
                style={{ "--fill": `${pct}%` } as React.CSSProperties}
                aria-label="Seek"
              />
              <div className="mt-2.5 flex items-center gap-1.5 sm:gap-2">
                <button
                  onClick={togglePlay}
                  className="flex h-12 w-12 items-center justify-center rounded-full bg-white/15 hover:bg-white/25"
                  aria-label={playing ? "Pause" : "Play"}
                >
                  {playing ? <Pause className="h-6 w-6" /> : <Play className="ml-0.5 h-6 w-6" />}
                </button>
                <button
                  onClick={() => seekBy(-10)}
                  className="flex h-12 items-center gap-1 rounded-full px-3 hover:bg-white/15"
                  aria-label="Go back 10 seconds"
                  title="Go back 10 seconds"
                >
                  <RotateCcw className="h-5 w-5" aria-hidden />
                  <span className="text-sm font-bold">10</span>
                </button>
                <button
                  onClick={() => seekBy(10)}
                  className="flex h-12 items-center gap-1 rounded-full px-3 hover:bg-white/15"
                  aria-label="Go forward 10 seconds"
                  title="Go forward 10 seconds"
                >
                  <span className="text-sm font-bold">10</span>
                  <RotateCw className="h-5 w-5" aria-hidden />
                </button>
                <button
                  onClick={() => {
                    const v = videoRef.current;
                    if (v) v.muted = !v.muted;
                  }}
                  className="flex h-12 w-12 items-center justify-center rounded-full hover:bg-white/15"
                  aria-label={muted ? "Unmute" : "Mute"}
                >
                  {muted || volume === 0 ? <VolumeX className="h-6 w-6" /> : <Volume2 className="h-6 w-6" />}
                </button>
                {/* Volume slider — easier than hunting for the mute toggle */}
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.05}
                  value={muted ? 0 : volume}
                  onChange={(e) => {
                    const v = videoRef.current;
                    if (!v) return;
                    v.volume = Number(e.target.value);
                    v.muted = Number(e.target.value) === 0;
                  }}
                  className="volume-range hidden sm:block"
                  style={{ "--fill": `${(muted ? 0 : volume) * 100}%` } as React.CSSProperties}
                  aria-label="Volume"
                />
                <span className="ml-1 text-sm font-semibold tabular-nums text-white/90">
                  {formatDuration(time)} <span className="text-white/50">/ {formatDuration(duration)}</span>
                </span>

                <span className="flex-1" />

                <button onClick={addBookmark} className="flex h-12 w-12 items-center justify-center rounded-full hover:bg-white/15" aria-label="Bookmark this moment" title="Bookmark this moment">
                  <Bookmark className="h-6 w-6" />
                </button>
                {/* Settings: speed + quality */}
                <div className="relative">
                  <button
                    onClick={() => setSettingsOpen((v) => !v)}
                    className={cn("flex h-12 items-center gap-1.5 rounded-full px-3 hover:bg-white/15", settingsOpen && "bg-gold-400/20 text-gold-400")}
                    aria-expanded={settingsOpen}
                    aria-label="Playback speed and quality"
                    title="Speed & quality"
                  >
                    <Settings className="h-6 w-6" aria-hidden />
                    {speed !== 1 && <span className="text-sm font-bold">{speed}×</span>}
                  </button>
                  {settingsOpen && (
                    <div className="absolute bottom-14 right-0 z-40 w-64 animate-scale-in rounded-2xl border border-white/15 bg-navy-900/95 p-4 shadow-lifted backdrop-blur">
                      <p className="px-1 text-xs font-bold uppercase tracking-widest text-white/50">Playback speed</p>
                      <div className="mt-2 flex flex-wrap gap-2 px-0.5">
                        {SPEEDS.map((s) => (
                          <button
                            key={s}
                            onClick={() => {
                              const v = videoRef.current;
                              if (v) v.playbackRate = s;
                              setSettingsOpen(false);
                            }}
                            className={cn(
                              "rounded-xl px-3 py-2 text-sm font-bold",
                              speed === s ? "bg-gold-400 text-navy-950" : "bg-white/10 hover:bg-white/20"
                            )}
                          >
                            {s === 1 ? "Normal" : `${s}×`}
                          </button>
                        ))}
                      </div>
                      <p className="mt-4 px-1 text-xs font-bold uppercase tracking-widest text-white/50">Quality</p>
                      <div className="mt-2 space-y-1">
                        {QUALITIES.map((q) => (
                          <button
                            key={q}
                            onClick={() => {
                              setQuality(q);
                              setSettingsOpen(false);
                            }}
                            className={cn(
                              "flex w-full items-center justify-between rounded-xl px-3 py-2 text-sm font-medium hover:bg-white/10",
                              quality === q && "text-gold-400"
                            )}
                          >
                            {q} {quality === q && <Check className="h-4 w-4" aria-hidden />}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <button onClick={enterPiP} className="hidden h-12 w-12 items-center justify-center rounded-full hover:bg-white/15 sm:flex" aria-label="Picture in picture" title="Picture in picture">
                  <PictureInPicture2 className="h-6 w-6" />
                </button>
                <button onClick={toggleFullscreen} className="flex h-12 w-12 items-center justify-center rounded-full hover:bg-white/15" aria-label={fullscreen ? "Exit fullscreen" : "Fullscreen"} title="Fullscreen">
                  {fullscreen ? <Minimize className="h-6 w-6" /> : <Maximize className="h-6 w-6" />}
                </button>
              </div>
            </div>
          </div>

          {/* Lesson info bar */}
          <div className="flex flex-wrap items-center gap-3 border-b border-white/10 p-4 sm:px-6">
            <div className="min-w-0 flex-1">
              <h1 className="truncate font-display text-lg font-semibold sm:text-xl">{lesson.title}</h1>
              <p className="text-xs text-white/50">
                {formatDuration(lesson.durationSec)} · {speed}× · {quality}
                {completed.includes(lesson.id) && (
                  <span className="ml-2 inline-flex items-center gap-1 text-emerald-400">
                    <Check className="h-3 w-3" aria-hidden /> Completed
                  </span>
                )}
              </p>
            </div>
            {nextLesson && (
              <button onClick={() => selectLesson(nextLesson)} className="btn-gold btn-sm">
                Next lesson <SkipForward className="h-4 w-4" aria-hidden />
              </button>
            )}
          </div>

          {/* Keyboard hint */}
          <p className="hidden px-6 py-3 text-2xs text-white/35 lg:block">
            Shortcuts: Space play/pause · ← → seek 10s · F fullscreen · M mute
          </p>
        </div>

        {/* Sidebar */}
        <aside className="border-l border-white/10 bg-navy-900/40" aria-label="Course companion">
          {/* Tabs */}
          <div className="flex border-b border-white/10" role="tablist" aria-label="Companion panels">
            {(
              [
                ["lessons", "Lessons", ListVideo],
                ["notes", "Notes", NotebookPen],
              ] as const
            ).map(([key, label, Icon]) => (
              <button
                key={key}
                role="tab"
                aria-selected={tab === key}
                onClick={() => setTab(key)}
                className={cn(
                  "flex flex-1 items-center justify-center gap-2 border-b-2 px-3 py-4 text-base font-semibold transition-colors",
                  tab === key ? "border-gold-400 text-gold-400" : "border-transparent text-white/55 hover:text-white"
                )}
              >
                <Icon className="h-5 w-5" aria-hidden /> {label}
              </button>
            ))}
          </div>

          <div className="max-h-[70vh] overflow-y-auto lg:max-h-[calc(100vh-8rem)]">
            {/* Lessons */}
            {tab === "lessons" &&
              course.modules.map((module, mi) => (
                <div key={module.id}>
                  <p className="sticky top-0 bg-navy-900/95 px-4 py-2.5 text-2xs font-bold uppercase tracking-widest text-white/45 backdrop-blur">
                    Module {mi + 1} · {module.title}
                  </p>
                  {module.lessons.map((l) => {
                    const isActive = l.id === lesson.id;
                    const isDone = completed.includes(l.id);
                    const TypeIcon = l.type === "quiz" ? FileQuestion : l.type === "assignment" ? ClipboardList : PlayCircle;
                    return (
                      <button
                        key={l.id}
                        onClick={() => selectLesson(l)}
                        aria-current={isActive}
                        className={cn(
                          "flex w-full items-center gap-3 px-4 py-3 text-left transition-colors",
                          isActive ? "bg-gold-400/10" : "hover:bg-white/5"
                        )}
                      >
                        <span
                          className={cn(
                            "flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
                            isDone ? "bg-emerald-500 text-white" : isActive ? "bg-gold-400 text-navy-950" : "bg-white/10 text-white/60"
                          )}
                        >
                          {isDone ? <Check className="h-4 w-4" aria-label="Completed" /> : <TypeIcon className="h-4 w-4" aria-hidden />}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className={cn("block truncate text-sm", isActive ? "font-bold text-gold-300" : "font-medium")}>
                            {l.title}
                          </span>
                          <span className="text-2xs text-white/45">{formatDuration(l.durationSec)}</span>
                        </span>
                        {isActive && playing && (
                          <span className="flex gap-0.5" aria-label="Now playing">
                            {[0, 1, 2].map((i) => (
                              <span key={i} className="h-3 w-0.5 animate-pulse rounded bg-gold-400" style={{ animationDelay: `${i * 150}ms` }} />
                            ))}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              ))}

            {/* Notes */}
            {tab === "notes" && (
              <div className="p-4">
                <div className="rounded-2xl border border-white/15 bg-white/5 p-3">
                  <textarea
                    value={noteDraft}
                    onChange={(e) => setNoteDraft(e.target.value)}
                    placeholder={`Note at ${formatDuration(time)}…`}
                    rows={3}
                    className="w-full resize-none bg-transparent text-sm outline-none placeholder:text-white/35"
                    aria-label="New note"
                  />
                  <div className="flex items-center justify-between">
                    <span className="text-2xs text-white/45">Timestamped at {formatDuration(time)}</span>
                    <button onClick={addNote} disabled={!noteDraft.trim()} className="btn-gold btn-sm">
                      Save note
                    </button>
                  </div>
                </div>

                <div className="mt-4 space-y-3">
                  {notes.length === 0 && (
                    <p className="py-8 text-center text-sm text-white/40">
                      No notes yet. Your timestamped notes and bookmarks appear here — synced across devices.
                    </p>
                  )}
                  {notes.map((n) => (
                    <div key={n.id} className="group rounded-2xl border border-white/10 bg-white/5 p-3">
                      <div className="flex items-center justify-between">
                        <button
                          onClick={() => {
                            const target = allLessons.find((l) => l.id === n.lessonId);
                            if (target && target.id !== lesson.id) selectLesson(target);
                            setTimeout(() => {
                              const v = videoRef.current;
                              if (v) v.currentTime = n.time;
                            }, 100);
                          }}
                          className="rounded-lg bg-gold-400/15 px-2 py-0.5 font-mono text-2xs font-bold text-gold-400 hover:bg-gold-400/25"
                        >
                          ▶ {formatDuration(n.time)}
                        </button>
                        <button
                          onClick={() => deleteNote(n.id)}
                          className="text-white/30 opacity-0 transition-opacity hover:text-rose-400 group-hover:opacity-100"
                          aria-label="Delete note"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                      <p className="mt-2 text-sm leading-relaxed text-white/85">{n.text}</p>
                      <p className="mt-1 text-2xs text-white/40">
                        {allLessons.find((l) => l.id === n.lessonId)?.title}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

          </div>
        </aside>
      </div>

      {/* Click-away for settings */}
      {settingsOpen && <button className="fixed inset-0 z-30" aria-hidden onClick={() => setSettingsOpen(false)} tabIndex={-1} />}
    </div>
  );
}
