"use client";

/**
 * Live signups for the admin dashboard — an initial snapshot plus a Supabase
 * Realtime subscription so brand-new accounts (and their enrollments) appear
 * the instant they happen, without a refresh.
 *
 * Requires the tables to be in the realtime publication (one-time SQL):
 *   alter publication supabase_realtime add table profiles;
 *   alter publication supabase_realtime add table enrollments;
 */

import { useEffect, useMemo, useRef, useState } from "react";
import { sb } from "./sb";
import { SIGNUPS_CHANNEL, fetchAllEnrollments, fetchProfiles, type EnrollmentLite, type ProfileRow } from "./db";
import { fetchMergedCourses } from "./courses";

export interface SignupRecord {
  email: string;
  name: string;
  phone: string | null;
  provider: string;
  plan: string;
  role: string;
  marketingOptIn: boolean;
  createdAt: string;
  courses: string[]; // resolved course titles
  isNew: boolean; // arrived via realtime during this session
}

export interface LiveSignups {
  records: SignupRecord[];
  live: boolean; // any real accounts present
  connected: boolean; // realtime channel subscribed
  loading: boolean;
  newCount: number; // how many arrived live this session
}

export function useLiveSignups(): LiveSignups {
  const [profiles, setProfiles] = useState<ProfileRow[]>([]);
  const [enroll, setEnroll] = useState<EnrollmentLite[]>([]);
  const [titles, setTitles] = useState<Map<string, string>>(new Map());
  const [loading, setLoading] = useState(true);
  const [connected, setConnected] = useState(false);
  const newEmails = useRef<Set<string>>(new Set());
  const [newTick, setNewTick] = useState(0); // force re-render when the "new" set changes

  // Initial snapshot
  useEffect(() => {
    let cancelled = false;
    void Promise.all([fetchProfiles(), fetchAllEnrollments(), fetchMergedCourses()]).then(([p, e, courses]) => {
      if (cancelled) return;
      setProfiles(p);
      setEnroll(e);
      setTitles(new Map(courses.map((c) => [c.slug, c.title])));
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // Realtime: new/updated accounts and new enrollments
  useEffect(() => {
    const client = sb();
    if (!client) return;
    const channel = client
      .channel(SIGNUPS_CHANNEL)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "profiles" }, (payload) => {
        const row = payload.new as ProfileRow;
        newEmails.current.add(row.email);
        setNewTick((t) => t + 1);
        setProfiles((prev) => (prev.some((p) => p.email === row.email) ? prev.map((p) => (p.email === row.email ? row : p)) : [row, ...prev]));
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "profiles" }, (payload) => {
        const row = payload.new as ProfileRow;
        setProfiles((prev) => prev.map((p) => (p.email === row.email ? row : p)));
      })
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "enrollments" }, (payload) => {
        const row = payload.new as EnrollmentLite;
        setEnroll((prev) => (prev.some((e) => e.email === row.email && e.course_slug === row.course_slug) ? prev : [...prev, row]));
      })
      .subscribe((status) => setConnected(status === "SUBSCRIBED"));
    return () => {
      void client.removeChannel(channel);
    };
  }, []);

  const records = useMemo(() => {
    const byEmail = new Map<string, string[]>();
    for (const e of enroll) {
      const arr = byEmail.get(e.email) ?? [];
      const title = titles.get(e.course_slug) ?? e.course_slug;
      if (!arr.includes(title)) arr.push(title);
      byEmail.set(e.email, arr);
    }
    return profiles
      .map<SignupRecord>((p) => ({
        email: p.email,
        name: p.name,
        phone: p.phone ?? null,
        provider: p.provider,
        plan: p.plan,
        role: p.role,
        marketingOptIn: p.marketing_opt_in ?? true,
        createdAt: p.created_at,
        courses: byEmail.get(p.email) ?? [],
        isNew: newEmails.current.has(p.email),
      }))
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    // newTick is included so the memo recomputes when the "new" set mutates
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profiles, enroll, titles, newTick]);

  return {
    records,
    live: profiles.length > 0,
    connected,
    loading,
    newCount: newEmails.current.size,
  };
}
