/**
 * WebRTC broadcasting for live classes — the host's camera/mic/screen
 * stream to every viewer, peer-to-peer, using the live transport
 * (Supabase Realtime or BroadcastChannel) purely for signaling.
 *
 * Design: one RTCPeerConnection per viewer with two pre-negotiated
 * sendonly transceivers (video + audio). Media toggles use
 * `sender.replaceTrack()`, so there is exactly one negotiation per viewer
 * and zero renegotiation churn. Suits classroom-scale rooms (host uplink
 * carries one stream per viewer); a strict corporate/cellular NAT without
 * TURN may occasionally fail to connect — an SFU (LiveKit) is the
 * heavy-duty upgrade path.
 */
import { TURN_SERVERS } from "./config";
import type { RtcSignal } from "./live-transport";

const RTC_CONFIG: RTCConfiguration = {
  iceServers: [
    { urls: ["stun:stun.l.google.com:19302", "stun:stun1.l.google.com:19302"] },
    ...TURN_SERVERS,
  ],
};

type SignalTo = (to: string, data: RtcSignal) => void;

/**
 * Non-trickle ICE: wait for candidate gathering so the entire connection
 * setup fits in ONE offer + ONE answer message. Supabase Realtime rate-limits
 * messages per second, and trickled ICE candidates arrive as a burst that
 * can get dropped — embedding candidates in the SDP avoids that completely.
 */
function iceComplete(pc: RTCPeerConnection): Promise<void> {
  if (pc.iceGatheringState === "complete") return Promise.resolve();
  return new Promise((resolve) => {
    const done = () => {
      pc.removeEventListener("icegatheringstatechange", check);
      clearTimeout(cap);
      resolve();
    };
    const check = () => {
      if (pc.iceGatheringState === "complete") done();
    };
    const cap = setTimeout(done, 4000); // relay candidates can take a moment
    pc.addEventListener("icegatheringstatechange", check);
  });
}

/* ------------------------------------------------------------------ */
/* Host side: fan out current tracks to every viewer                   */
/* ------------------------------------------------------------------ */

export class HostBroadcaster {
  private peers = new Map<string, RTCPeerConnection>();
  private videoTrack: MediaStreamTrack | null = null;
  private audioTrack: MediaStreamTrack | null = null;

  constructor(private signalTo: SignalTo) {}

  /** Update what's being broadcast (screen > camera for video). */
  setTracks(video: MediaStreamTrack | null, audio: MediaStreamTrack | null) {
    this.videoTrack = video;
    this.audioTrack = audio;
    this.peers.forEach((pc) => {
      const [v, a] = pc.getTransceivers();
      void v?.sender.replaceTrack(video).catch(() => {});
      void a?.sender.replaceTrack(audio).catch(() => {});
    });
  }

  async handleSignal(from: string, data: RtcSignal) {
    try {
      if (data.type === "request") {
        await this.addViewer(from);
      } else if (data.type === "answer") {
        await this.peers.get(from)?.setRemoteDescription(data.sdp);
      } else if (data.type === "ice") {
        await this.peers.get(from)?.addIceCandidate(data.candidate);
      }
    } catch {
      /* per-peer failures shouldn't take down the class */
    }
  }

  private async addViewer(viewerId: string) {
    this.peers.get(viewerId)?.close();
    const pc = new RTCPeerConnection(RTC_CONFIG);
    this.peers.set(viewerId, pc);

    const stream = new MediaStream();
    if (this.videoTrack) pc.addTransceiver(this.videoTrack, { direction: "sendonly", streams: [stream] });
    else pc.addTransceiver("video", { direction: "sendonly", streams: [stream] });
    if (this.audioTrack) pc.addTransceiver(this.audioTrack, { direction: "sendonly", streams: [stream] });
    else pc.addTransceiver("audio", { direction: "sendonly", streams: [stream] });

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === "failed" || pc.connectionState === "closed") {
        this.peers.delete(viewerId);
      }
    };

    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    await iceComplete(pc); // embed all candidates → single signaling message
    this.signalTo(viewerId, { type: "offer", sdp: pc.localDescription ?? offer });
  }

  get viewerCount() {
    return this.peers.size;
  }

  close() {
    this.peers.forEach((pc) => pc.close());
    this.peers.clear();
  }
}

/* ------------------------------------------------------------------ */
/* Viewer side: receive the host's stream                              */
/* ------------------------------------------------------------------ */

export class ViewerReceiver {
  private pc: RTCPeerConnection | null = null;

  constructor(
    private signalHost: (data: RtcSignal) => void,
    private onStream: (stream: MediaStream | null) => void,
    private onState?: (state: RTCPeerConnectionState) => void
  ) {}

  /** Ask the host to start sending (safe to call repeatedly). */
  request() {
    this.signalHost({ type: "request" });
  }

  async handleSignal(data: RtcSignal) {
    try {
      if (data.type === "offer") {
        this.pc?.close();
        const pc = new RTCPeerConnection(RTC_CONFIG);
        this.pc = pc;
        pc.ontrack = (e) => {
          this.onStream(e.streams[0] ?? new MediaStream([e.track]));
        };
        pc.onconnectionstatechange = () => {
          this.onState?.(pc.connectionState);
          if (pc.connectionState === "failed" || pc.connectionState === "closed") this.onStream(null);
        };
        await pc.setRemoteDescription(data.sdp);
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        await iceComplete(pc); // single answer message with candidates embedded
        this.signalHost({ type: "answer", sdp: pc.localDescription ?? answer });
      } else if (data.type === "ice") {
        await this.pc?.addIceCandidate(data.candidate);
      }
    } catch {
      /* swallowed — a new offer restarts cleanly */
    }
  }

  close() {
    this.pc?.close();
    this.pc = null;
    this.onStream(null);
  }
}
