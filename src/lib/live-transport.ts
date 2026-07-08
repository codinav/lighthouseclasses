/**
 * Realtime transport for live classrooms.
 *
 * Two interchangeable implementations behind one interface:
 *  - "supabase": Supabase Realtime (broadcast + presence) — real cross-device
 *    chat/presence/hands, plus optional message history in a `live_messages`
 *    table. Activated by pasting keys in src/lib/config.ts.
 *  - "local": BroadcastChannel — realtime across windows/tabs on one device.
 *    Zero-setup fallback so the room always works.
 *
 * The room UI only talks to this interface, so upgrading transports never
 * touches components.
 */
import { supabaseConfigured } from "./config";
import { sb } from "./sb";

export interface LiveChatRecord {
  id: string;
  name: string;
  text: string;
  ts: number;
  avatarUrl?: string;
  teacher?: boolean;
}

/** WebRTC signaling payloads (host ⇄ viewer) carried over the same channel */
export type RtcSignal =
  | { type: "request" }
  | { type: "offer"; sdp: RTCSessionDescriptionInit }
  | { type: "answer"; sdp: RTCSessionDescriptionInit }
  | { type: "ice"; candidate: RTCIceCandidateInit };

export type LiveEvent =
  | { kind: "chat"; msg: LiveChatRecord }
  | { kind: "hand"; name: string; raised: boolean }
  | { kind: "announce"; name: string; text: string }
  | { kind: "rtc"; from: string; to?: string; data: RtcSignal };

export interface PresenceMember {
  name: string;
  hand?: boolean;
  host?: boolean;
  cam?: boolean;
  mic?: boolean;
}

export interface LiveTransport {
  mode: "supabase" | "local";
  send: (event: LiveEvent) => void;
  setPresence: (state: PresenceMember) => void;
  history: () => Promise<LiveChatRecord[]>;
  persist: (msg: LiveChatRecord) => void;
  close: () => void;
}

interface TransportHandlers {
  onEvent: (event: LiveEvent) => void;
  onPresence: (members: PresenceMember[]) => void;
}

/* ------------------------------------------------------------------ */
/* Supabase implementation                                             */
/* ------------------------------------------------------------------ */

async function createSupabaseTransport(
  roomId: string,
  tabId: string,
  handlers: TransportHandlers
): Promise<LiveTransport> {
  const client = sb();
  if (!client) throw new Error("Supabase not available");

  let presenceState: PresenceMember | null = null;
  let subscribed = false;

  const channel = client.channel(`live-${roomId}`, {
    config: { broadcast: { self: false }, presence: { key: tabId } },
  });

  channel
    .on("broadcast", { event: "live" }, (payload) => {
      handlers.onEvent(payload.payload as LiveEvent);
    })
    .on("presence", { event: "sync" }, () => {
      const state = channel.presenceState<PresenceMember>();
      handlers.onPresence(Object.values(state).map((entries) => entries[0]));
    })
    .subscribe((status) => {
      if (status === "SUBSCRIBED") {
        subscribed = true;
        if (presenceState) void channel.track(presenceState);
      }
    });

  return {
    mode: "supabase",
    send: (event) => {
      void channel.send({ type: "broadcast", event: "live", payload: event });
    },
    setPresence: (state) => {
      presenceState = state;
      if (subscribed) void channel.track(state);
    },
    history: async () => {
      try {
        const { data, error } = await client
          .from("live_messages")
          .select("id, name, text, avatar_url, teacher, ts")
          .eq("room", roomId)
          .order("ts", { ascending: true })
          .limit(100);
        if (error || !data) return [];
        return data.map((r) => ({
          id: r.id as string,
          name: r.name as string,
          text: r.text as string,
          ts: Number(r.ts),
          avatarUrl: (r.avatar_url as string) ?? undefined,
          teacher: Boolean(r.teacher),
        }));
      } catch {
        return []; // table not created yet — history is optional
      }
    },
    persist: (msg) => {
      void client
        .from("live_messages")
        .insert({
          id: msg.id,
          room: roomId,
          name: msg.name,
          text: msg.text,
          avatar_url: msg.avatarUrl ?? null,
          teacher: msg.teacher ?? false,
          ts: msg.ts,
        })
        .then(() => {}, () => {}); // ignore if table is missing
    },
    close: () => {
      void client.removeChannel(channel);
    },
  };
}

/* ------------------------------------------------------------------ */
/* BroadcastChannel fallback (same-device realtime)                    */
/* ------------------------------------------------------------------ */

type LocalWire =
  | { type: "event"; event: LiveEvent }
  | { type: "presence"; tabId: string; state: PresenceMember | null }
  | { type: "presence-req" };

function createLocalTransport(
  roomId: string,
  tabId: string,
  handlers: TransportHandlers
): LiveTransport {
  const members = new Map<string, PresenceMember>();
  let myState: PresenceMember | null = null;
  const ch = "BroadcastChannel" in window ? new BroadcastChannel(`lh-live-${roomId}`) : null;

  const emitPresence = () => {
    const all = Array.from(members.values());
    if (myState) all.unshift(myState);
    handlers.onPresence(all);
  };

  if (ch) {
    ch.onmessage = (e: MessageEvent<LocalWire>) => {
      const w = e.data;
      if (w.type === "event") handlers.onEvent(w.event);
      if (w.type === "presence") {
        if (w.state) members.set(w.tabId, w.state);
        else members.delete(w.tabId);
        emitPresence();
      }
      if (w.type === "presence-req" && myState) {
        ch.postMessage({ type: "presence", tabId, state: myState } satisfies LocalWire);
      }
    };
    ch.postMessage({ type: "presence-req" } satisfies LocalWire);
  }

  return {
    mode: "local",
    send: (event) => ch?.postMessage({ type: "event", event } satisfies LocalWire),
    setPresence: (state) => {
      myState = state;
      ch?.postMessage({ type: "presence", tabId, state } satisfies LocalWire);
      emitPresence();
    },
    history: async () => {
      try {
        return JSON.parse(localStorage.getItem(`lh_live_chat_${roomId}`) ?? "[]") as LiveChatRecord[];
      } catch {
        return [];
      }
    },
    persist: (msg) => {
      try {
        const key = `lh_live_chat_${roomId}`;
        const cur = JSON.parse(localStorage.getItem(key) ?? "[]") as LiveChatRecord[];
        localStorage.setItem(key, JSON.stringify([...cur, msg].slice(-200)));
      } catch {}
    },
    close: () => {
      ch?.postMessage({ type: "presence", tabId, state: null } satisfies LocalWire);
      ch?.close();
    },
  };
}

/* ------------------------------------------------------------------ */

export async function createLiveTransport(
  roomId: string,
  tabId: string,
  handlers: TransportHandlers
): Promise<LiveTransport> {
  if (supabaseConfigured()) {
    try {
      return await createSupabaseTransport(roomId, tabId, handlers);
    } catch {
      // fall through to local mode on SDK/network failure
    }
  }
  return createLocalTransport(roomId, tabId, handlers);
}
