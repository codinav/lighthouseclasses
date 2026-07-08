"use client";

import { useState } from "react";
import { BadgeCheck, Loader2, SearchCheck, XCircle } from "lucide-react";
import { certificatesFor, type EarnedCertificate } from "@/lib/certificates";
import { useAuth } from "@/lib/providers";
import { useEnrollments } from "@/lib/use-enrollments";

type Result = { status: "valid"; cert: EarnedCertificate } | { status: "invalid" } | null;

export function CertificateVerifier() {
  const { user } = useAuth();
  const { enrollments, courseFor } = useEnrollments();
  const [id, setId] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<Result>(null);

  const myCerts = certificatesFor(user?.email ?? "", enrollments, courseFor);

  const verify = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setResult(null);
    await new Promise((r) => setTimeout(r, 700));
    const found = myCerts.find((c) => c.id.toLowerCase() === id.trim().toLowerCase());
    setResult(found ? { status: "valid", cert: found } : { status: "invalid" });
    setBusy(false);
  };

  return (
    <div className="mt-8">
      <form onSubmit={verify} className="flex gap-2">
        <input
          value={id}
          onChange={(e) => setId(e.target.value)}
          placeholder="LH-2026-XXXXXX"
          className="input-lh font-mono uppercase"
          aria-label="Certificate verification ID"
        />
        <button type="submit" disabled={busy || !id.trim()} className="btn-primary btn-md shrink-0">
          {busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <SearchCheck className="h-4 w-4" aria-hidden />}
          Verify
        </button>
      </form>
      {myCerts.length > 0 ? (
        <p className="mt-2 text-2xs muted">
          Your certificate {myCerts.length === 1 ? "ID" : "IDs"}: {myCerts.map((c) => c.id).join(" · ")}
        </p>
      ) : (
        <p className="mt-2 text-2xs muted">
          Sign in and complete a course to generate a verifiable certificate ID.
        </p>
      )}

      {result?.status === "valid" && (
        <div className="card mt-6 animate-scale-in border-emerald-500/40 p-6 text-center" role="status">
          <BadgeCheck className="mx-auto h-12 w-12 text-emerald-500" aria-hidden />
          <h2 className="mt-3 font-display text-xl font-semibold text-emerald-600 dark:text-emerald-400">Valid certificate</h2>
          <dl className="mx-auto mt-4 max-w-sm space-y-2 text-left text-sm">
            <div className="flex justify-between"><dt className="muted">Holder</dt><dd className="font-semibold">{user?.name}</dd></div>
            <div className="flex justify-between"><dt className="muted">Course</dt><dd className="font-semibold">{result.cert.course}</dd></div>
            <div className="flex justify-between"><dt className="muted">Issued</dt><dd>{new Date(result.cert.issued).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}</dd></div>
            <div className="flex justify-between"><dt className="muted">Learning hours</dt><dd>{result.cert.hours}h</dd></div>
            <div className="flex justify-between"><dt className="muted">Issuer</dt><dd>Lighthouse Classes</dd></div>
          </dl>
        </div>
      )}
      {result?.status === "invalid" && (
        <div className="card mt-6 animate-scale-in border-rose-500/40 p-6 text-center" role="status">
          <XCircle className="mx-auto h-12 w-12 text-rose-500" aria-hidden />
          <h2 className="mt-3 font-display text-xl font-semibold text-rose-500">No match found</h2>
          <p className="mx-auto mt-2 max-w-sm text-sm muted">
            This ID doesn't match a certificate on this device. Employers verifying someone else's
            certificate can email verify@lighthouseclasses.com with the ID for confirmation.
          </p>
        </div>
      )}
    </div>
  );
}
