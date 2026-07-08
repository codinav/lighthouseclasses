/**
 * Runtime configuration.
 *
 * GOOGLE_CLIENT_ID — paste your OAuth "Web application" Client ID from
 * https://console.cloud.google.com/apis/credentials to enable real
 * Sign-in with Google. Until it's set, the Google button falls back to
 * the demo sign-in so the site keeps working.
 *
 * You can also set it via env instead of editing this file:
 *   NEXT_PUBLIC_GOOGLE_CLIENT_ID=xxxxx.apps.googleusercontent.com
 */
/** Shown in the footer — bump on each deploy to verify what's live. */
export const APP_VERSION = "v12 · dashboard + uploads";

/**
 * MASTER ADMINS — full rights, including granting/revoking limited admin
 * access from Admin → Team. Matched against the signed-in email (works for
 * both Google and email accounts). Edit this list to add/remove masters.
 */
export const MASTER_ADMIN_EMAILS = ["abhinavsaxena927@gmail.com"];

export const isMasterEmail = (email: string) =>
  MASTER_ADMIN_EMAILS.some((m) => m.toLowerCase() === email.toLowerCase());

/**
 * Admin panel sections — the units of access the master admin can grant.
 * An admin with an empty section list has FULL access (legacy blanket grant);
 * a specific list limits them to exactly those sections. Team is master-only.
 */
export const ADMIN_SECTIONS = [
  { key: "analytics", label: "Analytics" },
  { key: "live", label: "Live Classes" },
  { key: "students", label: "Students" },
  { key: "courses", label: "Courses" },
  { key: "teachers", label: "Teachers" },
  { key: "payments", label: "Payments" },
  { key: "coupons", label: "Coupons" },
  { key: "community", label: "Community" },
] as const;

export type AdminSectionKey = (typeof ADMIN_SECTIONS)[number]["key"];

/**
 * TURN relay for live-class streaming. Direct peer-to-peer media fails on
 * networks that isolate clients (office Wi-Fi, many cellular carriers); the
 * TURN server relays the stream in those cases. Using the ExpressTURN
 * account (free tier) — https://www.expressturn.com dashboard has these
 * credentials if they ever need rotating.
 */
export const TURN_SERVERS: RTCIceServer[] = [
  {
    urls: [
      "turn:free.expressturn.com:3478",
      "turn:free.expressturn.com:3478?transport=tcp",
    ],
    username: "000000002098527342",
    credential: "B/6AJdWkrtkosaXcgaAVGBEM92o=",
  },
];

export const GOOGLE_CLIENT_ID =
  process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ??
  "285342934567-h3jk23asrhqgfotd2r4jb5ubg0hirppb.apps.googleusercontent.com";

export const googleConfigured = () => GOOGLE_CLIENT_ID.length > 0;

/**
 * HOSTINGER VIDEO UPLOADS — lesson videos uploaded from a device are stored
 * on your own Hostinger hosting (in public_html/videos) by a small PHP script
 * (public_html/api/upload.php), which returns a URL on your own domain.
 *
 * HOSTINGER_UPLOAD_URL points at that script. The default assumes the site is
 * live at lighthouseclasses.com; change it if your domain differs. The token
 * is a shared gate that must match the one baked into upload.php (the build
 * script copies this value in automatically). Because the site is static, the
 * token is visible in the site's JS — it stops casual abuse, not a determined
 * attacker; rotate it here (and rebuild) if you ever need to.
 */
export const HOSTINGER_UPLOAD_URL =
  process.env.NEXT_PUBLIC_HOSTINGER_UPLOAD_URL ?? "https://lighthouseclasses.com/api/upload.php";

export const HOSTINGER_UPLOAD_TOKEN =
  process.env.NEXT_PUBLIC_HOSTINGER_UPLOAD_TOKEN ?? "lh_up_7f3a9c2e8b514d60a";

export const hostingerUploadConfigured = () => HOSTINGER_UPLOAD_URL.length > 0;

/**
 * SUPABASE — powers the realtime backend for live classes (cross-device
 * chat, presence, raised hands, announcements).
 *
 * Setup (free): https://supabase.com → New project → Settings → API →
 * paste "Project URL" and "anon public" key below. Until then, live rooms
 * fall back to same-device realtime (BroadcastChannel).
 *
 * Optional message history table (SQL editor):
 *   create table live_messages (
 *     id uuid primary key,
 *     room text not null,
 *     name text not null,
 *     text text not null,
 *     avatar_url text,
 *     teacher boolean default false,
 *     ts bigint not null
 *   );
 *   alter table live_messages enable row level security;
 *   create policy "read"  on live_messages for select using (true);
 *   create policy "write" on live_messages for insert with check (true);
 */
export const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? "https://djrzuvrpjvwutmcgkjoq.supabase.co";
export const SUPABASE_ANON_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRqcnp1dnJwanZ3dXRtY2dram9xIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODMxNTc0NjQsImV4cCI6MjA5ODczMzQ2NH0.lhF3QY49xdQZKBNOvK9OH8BPYSdgmAHSElGBVyr7En0";

export const supabaseConfigured = () =>
  SUPABASE_URL.startsWith("https://") && SUPABASE_ANON_KEY.length > 20;
