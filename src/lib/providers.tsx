"use client";

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { User as SupabaseUser } from "@supabase/supabase-js";
import { googleConfigured, isMasterEmail } from "./config";
import { signInWithGoogle } from "./google-auth";
import { fetchProfileAccess, touchProfile, upsertProfile } from "./db";
import { sb } from "./sb";

/* ------------------------------------------------------------------ */
/* Theme                                                               */
/* ------------------------------------------------------------------ */

type Theme = "light" | "dark";

const ThemeContext = createContext<{ theme: Theme; toggle: () => void }>({
  theme: "light",
  toggle: () => {},
});

export function useTheme() {
  return useContext(ThemeContext);
}

/* ------------------------------------------------------------------ */
/* Auth                                                                 */
/*                                                                      */
/* Email/password accounts: REAL — Supabase Auth (hashed passwords,      */
/* email confirmation, password reset, duplicate prevention). Login      */
/* succeeds only for confirmed, existing accounts.                       */
/* Google: real OAuth via Google Identity Services (separate session).   */
/* If Supabase isn't configured, email auth falls back to demo mode.     */
/* ------------------------------------------------------------------ */

export interface SessionUser {
  name: string;
  email: string;
  avatarUrl?: string;
  provider: "email" | "google" | "apple";
  plan: "Spark" | "Beacon" | "Lighthouse";
  role: "student" | "admin" | "master";
  /** Admin section keys this user may access; empty = all (or master) */
  sections: string[];
  xp: number;
  level: number;
  streak: number;
  joinedAt: string;
}

export interface AuthResult {
  ok: boolean;
  error?: string;
  /** "confirm" → verification email sent; "unconfirmed" → must confirm first */
  code?: "confirm" | "unconfirmed";
}

interface AuthContextValue {
  user: SessionUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<AuthResult>;
  register: (name: string, email: string, password: string, classUpdates?: boolean, phone?: string) => Promise<AuthResult>;
  loginWithGoogle: () => Promise<AuthResult>;
  updateName: (name: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  loading: true,
  login: async () => ({ ok: false }),
  register: async () => ({ ok: false }),
  loginWithGoogle: async () => ({ ok: false }),
  updateName: async () => {},
  logout: () => {},
});

export function useAuth() {
  return useContext(AuthContext);
}

const STORAGE_KEY = "lh_user"; // google/apple/demo sessions only
const COOKIE_KEY = "lh_session";

function setSessionCookie(on: boolean) {
  if (on) {
    document.cookie = `${COOKIE_KEY}=1; path=/; max-age=${60 * 60 * 24 * 30}; samesite=lax`;
  } else {
    document.cookie = `${COOKIE_KEY}=; path=/; max-age=0`;
  }
}

/**
 * Role resolution: master admins come from config (MASTER_ADMIN_EMAILS);
 * limited admins are granted in the database by a master (Admin → Team).
 * The old "email starts with admin" shortcut is gone.
 */
async function resolveAccess(email: string): Promise<{ role: SessionUser["role"]; sections: string[] }> {
  if (isMasterEmail(email)) return { role: "master", sections: [] };
  const access = await fetchProfileAccess(email);
  if (access?.role === "admin") return { role: "admin", sections: access.sections };
  return { role: "student", sections: [] };
}

/** Can this user open the given admin section? */
export function canAccessSection(user: SessionUser | null, key: string): boolean {
  if (!user) return false;
  if (user.role === "master") return true;
  if (user.role !== "admin") return false;
  const sections = user.sections ?? []; // legacy stored sessions may lack it
  return sections.length === 0 || sections.includes(key);
}

function makeUser(
  name: string,
  email: string,
  provider: SessionUser["provider"],
  avatarUrl?: string,
  joinedAt?: string
): SessionUser {
  return {
    name,
    email,
    avatarUrl,
    provider,
    plan: "Beacon",
    role: isMasterEmail(email) ? "master" : "student", // db grants applied async
    sections: [],
    xp: 2840,
    level: 7,
    streak: 12,
    joinedAt: joinedAt ?? "2026-05-01",
  };
}

function fromSupabaseUser(u: SupabaseUser): SessionUser {
  const meta = (u.user_metadata ?? {}) as { name?: string; avatar_url?: string };
  const email = u.email ?? "";
  return makeUser(
    meta.name || email.split("@")[0].replace(/[._]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
    email,
    "email",
    meta.avatar_url,
    u.created_at
  );
}

/* ------------------------------------------------------------------ */
/* Combined provider                                                   */
/* ------------------------------------------------------------------ */

export function Providers({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>("light");
  const [user, setUser] = useState<SessionUser | null>(null);
  const [loading, setLoading] = useState(true);

  /** Fetch the granted role + sections from the DB and merge into the session. */
  const hydrateRole = useCallback((email: string) => {
    void resolveAccess(email).then(({ role, sections }) => {
      setUser((cur) =>
        cur && cur.email === email && (cur.role !== role || cur.sections.join() !== sections.join())
          ? { ...cur, role, sections }
          : cur
      );
    });
  }, []);

  const applySession = useCallback(
    (u: SessionUser) => {
      setSessionCookie(true);
      setUser(u);
      void upsertProfile(u);
      hydrateRole(u.email);
    },
    [hydrateRole]
  );

  /** For google/apple/demo sessions we manage persistence ourselves. */
  const persistLocal = useCallback(
    (u: SessionUser) => {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(u));
      applySession(u);
    },
    [applySession]
  );

  useEffect(() => {
    // Theme: stored preference > light (light is the default everywhere)
    const stored = localStorage.getItem("lh_theme") as Theme | null;
    const initial: Theme = stored ?? "light";
    setTheme(initial);
    document.documentElement.classList.toggle("dark", initial === "dark");

    // 1) Restore social session (managed by us). Email sessions live in
    //    Supabase Auth only; legacy demo email AND fake Apple sessions are purged.
    let localUser: SessionUser | null = null;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        localUser = JSON.parse(raw) as SessionUser;
        if (localUser.provider === "apple" || (localUser.provider === "email" && sb())) {
          localStorage.removeItem(STORAGE_KEY);
          localUser = null;
        } else {
          setUser(localUser);
          setSessionCookie(true);
          void touchProfile(localUser.email);
          hydrateRole(localUser.email);
        }
      }
    } catch {
      localStorage.removeItem(STORAGE_KEY);
    }

    // 2) Supabase Auth session (real email accounts) — wins if present
    const client = sb();
    if (!client) {
      setLoading(false);
      return;
    }

    void client.auth.getSession().then(({ data }) => {
      if (data.session?.user) {
        const u = fromSupabaseUser(data.session.user);
        setUser(u);
        setSessionCookie(true);
        void touchProfile(u.email);
        hydrateRole(u.email);
      }
      setLoading(false);
    });

    const { data: sub } = client.auth.onAuthStateChange((event, session) => {
      if (session?.user) {
        const u = fromSupabaseUser(session.user);
        setUser(u);
        setSessionCookie(true);
        void upsertProfile(u);
        hydrateRole(u.email);
      } else if (event === "SIGNED_OUT") {
        setUser((cur) => {
          if (cur && cur.provider !== "email") return cur; // social session unaffected
          setSessionCookie(false);
          return null;
        });
      }
    });

    return () => sub.subscription.unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggle = useCallback(() => {
    setTheme((t) => {
      const next = t === "light" ? "dark" : "light";
      localStorage.setItem("lh_theme", next);
      document.documentElement.classList.toggle("dark", next === "dark");
      return next;
    });
  }, []);

  /* ----------------------------- Email ----------------------------- */

  const login = useCallback(
    async (email: string, password: string): Promise<AuthResult> => {
      if (!/^\S+@\S+\.\S+$/.test(email)) return { ok: false, error: "Please enter a valid email address." };
      const client = sb();

      if (!client) {
        // Demo fallback (Supabase not configured)
        await new Promise((r) => setTimeout(r, 600));
        if (password.length < 6) return { ok: false, error: "Password must be at least 6 characters." };
        persistLocal(makeUser(email.split("@")[0], email, "email"));
        return { ok: true };
      }

      const { data, error } = await client.auth.signInWithPassword({ email, password });
      if (error) {
        if (/not confirmed/i.test(error.message)) {
          return {
            ok: false,
            code: "unconfirmed",
            error: "Your email isn't confirmed yet — check your inbox for the confirmation link.",
          };
        }
        if (/invalid login credentials/i.test(error.message)) {
          return {
            ok: false,
            error: "Incorrect email or password. New to Lighthouse? Create an account first.",
          };
        }
        return { ok: false, error: error.message };
      }
      if (data.session?.user) applySession(fromSupabaseUser(data.session.user));
      return { ok: true };
    },
    [applySession, persistLocal]
  );

  const register = useCallback(
    async (name: string, email: string, password: string, classUpdates: boolean = true, phone: string = ""): Promise<AuthResult> => {
      if (name.trim().length < 2) return { ok: false, error: "Please enter your full name." };
      if (!/^\S+@\S+\.\S+$/.test(email)) return { ok: false, error: "Please enter a valid email address." };
      if (password.length < 8) return { ok: false, error: "Password must be at least 8 characters." };
      const client = sb();

      if (!client) {
        await new Promise((r) => setTimeout(r, 700));
        persistLocal(makeUser(name.trim(), email, "email"));
        return { ok: true };
      }

      const { data, error } = await client.auth.signUp({
        email,
        password,
        options: {
          data: { name: name.trim(), phone: phone.trim() },
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (error) {
        if (/already registered/i.test(error.message)) {
          return { ok: false, error: "An account with this email already exists — log in instead." };
        }
        return { ok: false, error: error.message };
      }
      // Supabase obfuscates existing accounts: user returned with no identities
      if (data.user && (data.user.identities?.length ?? 0) === 0) {
        return { ok: false, error: "An account with this email already exists — log in instead." };
      }
      // Record name + email + phone (with their class-updates choice) immediately —
      // even before the confirmation link is clicked, so admins see them at once.
      void upsertProfile(makeUser(name.trim(), email, "email"), classUpdates, phone);
      if (data.session?.user) {
        applySession(fromSupabaseUser(data.session.user));
        return { ok: true };
      }
      return { ok: true, code: "confirm" }; // confirmation email sent
    },
    [applySession, persistLocal]
  );

  /* ----------------------------- Social ----------------------------- */

  const loginWithGoogle = useCallback(async (): Promise<AuthResult> => {
    if (!googleConfigured()) {
      await new Promise((r) => setTimeout(r, 800));
      persistLocal(makeUser("Aarav Sharma", "aarav.google@example.com", "google"));
      return { ok: true };
    }
    try {
      const profile = await signInWithGoogle();
      persistLocal(makeUser(profile.name || profile.email.split("@")[0], profile.email, "google", profile.picture));
      return { ok: true };
    } catch (e) {
      return { ok: false, error: e instanceof Error ? e.message : "Google sign-in failed." };
    }
  }, [persistLocal]);

  const updateName = useCallback(async (name: string) => {
    const trimmed = name.trim();
    if (trimmed.length < 2) return;
    setUser((cur) => {
      if (!cur) return cur;
      const next = { ...cur, name: trimmed };
      // Social/demo sessions persist locally; email sessions live in Supabase Auth.
      if (cur.provider !== "email") {
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
        } catch {}
      }
      void upsertProfile(next);
      return next;
    });
    // Email accounts: keep Supabase Auth metadata in sync too.
    await sb()?.auth.updateUser({ data: { name: trimmed } });
  }, []);

  const logout = useCallback(() => {
    void sb()?.auth.signOut();
    localStorage.removeItem(STORAGE_KEY);
    setSessionCookie(false);
    setUser(null);
  }, []);

  const authValue = useMemo(
    () => ({ user, loading, login, register, loginWithGoogle, updateName, logout }),
    [user, loading, login, register, loginWithGoogle, updateName, logout]
  );

  return (
    <ThemeContext.Provider value={{ theme, toggle }}>
      <AuthContext.Provider value={authValue}>{children}</AuthContext.Provider>
    </ThemeContext.Provider>
  );
}
