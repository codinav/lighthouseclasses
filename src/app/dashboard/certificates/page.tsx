"use client";

import Link from "next/link";
import { Award, BadgeCheck, Printer, Share2 } from "lucide-react";
import { certificatesFor, type EarnedCertificate } from "@/lib/certificates";
import { getCourse } from "@/lib/data";
import { learnHref } from "@/lib/courses";
import { useAuth } from "@/lib/providers";
import { useEnrollments } from "@/lib/use-enrollments";
import { LighthouseMark } from "@/components/ui/logo";

/** Print-ready certificate in a new window — "Save as PDF" from the dialog. */
function printCertificate(cert: EarnedCertificate, learner: string) {
  const w = window.open("", "_blank", "width=900,height=650");
  if (!w) return;
  w.document.write(`<!doctype html><html><head><title>${cert.id} — Lighthouse Classes</title>
<style>
  body{margin:0;font-family:Georgia,serif;background:#f5f2ea;display:flex;align-items:center;justify-content:center;min-height:100vh}
  .cert{background:#0b1526;color:#fff;max-width:760px;width:92%;padding:64px 72px;border-bottom:10px solid #F4B400;position:relative}
  .eyebrow{letter-spacing:.35em;text-transform:uppercase;font-size:11px;color:#F4B400;margin:0 0 28px}
  .small{font-size:12px;color:rgba(255,255,255,.55);margin:18px 0 4px}
  h1{font-size:30px;margin:0}
  h2{font-size:20px;margin:0;color:#f7cf6b}
  .foot{display:flex;justify-content:space-between;margin-top:40px;font-size:11px;color:rgba(255,255,255,.5)}
  .id{font-family:monospace}
  @media print{body{background:#fff}.cert{width:100%;max-width:none}}
</style></head><body>
<div class="cert">
  <p class="eyebrow">Certificate of Completion</p>
  <p class="small">This certifies that</p>
  <h1>${learner}</h1>
  <p class="small">has successfully completed</p>
  <h2>${cert.course}</h2>
  <div class="foot">
    <span>${new Date(cert.issued).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })} · ${cert.hours} learning hours · lighthouseclasses.com</span>
    <span class="id">${cert.id}</span>
  </div>
</div>
<script>window.onload=()=>setTimeout(()=>window.print(),300)</script>
</body></html>`);
  w.document.close();
}

function linkedInUrl(cert: EarnedCertificate) {
  const d = new Date(cert.issued);
  const params = new URLSearchParams({
    startTask: "CERTIFICATION_NAME",
    name: `${cert.course} — Lighthouse Classes`,
    organizationName: "Lighthouse Classes",
    issueYear: String(d.getFullYear()),
    issueMonth: String(d.getMonth() + 1),
    certId: cert.id,
    certUrl: "https://lighthouseclasses.com/certificates/verify",
  });
  return `https://www.linkedin.com/profile/add?${params.toString()}`;
}

export default function CertificatesPage() {
  const { user } = useAuth();
  const { enrollments, loading, courseFor } = useEnrollments();
  const certificates = certificatesFor(user?.email ?? "", enrollments, courseFor);
  const nearest = enrollments
    .filter((e) => e.progress > 0 && e.progress < 100)
    .sort((a, b) => b.progress - a.progress)[0];
  const nearestCourse = nearest ? getCourse(nearest.courseSlug) ?? courseFor(nearest.courseSlug) : undefined;

  return (
    <div>
      <h1 className="font-display text-2xl font-semibold sm:text-3xl">Certificates</h1>
      <p className="mt-1 text-sm muted">
        Finish a course to earn its certificate. Every certificate is verifiable at{" "}
        <Link href="/certificates/verify" className="font-semibold text-ocean-600 hover:underline dark:text-gold-400">
          lighthouseclasses.com/certificates/verify
        </Link>
      </p>

      {!loading && certificates.length === 0 && (
        <div className="card mt-6 flex flex-col items-center gap-3 border-dashed p-12 text-center">
          <Award className="h-9 w-9 muted" aria-hidden />
          <h2 className="font-display text-xl font-semibold">No certificates yet</h2>
          <p className="max-w-sm text-sm muted">
            Complete 100% of any course and your certificate appears here instantly — with a
            verification ID you can share with employers.
          </p>
        </div>
      )}

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        {certificates.map((cert) => (
          <div key={cert.id} className="card overflow-hidden">
            {/* Certificate preview */}
            <div className="relative border-b-4 border-gold-400 bg-navy-950 p-6 text-white sm:p-8">
              <div className="absolute right-4 top-4 opacity-10" aria-hidden>
                <LighthouseMark className="h-24 w-24" />
              </div>
              <LighthouseMark className="h-8 w-8 text-white" />
              <p className="mt-4 text-2xs uppercase tracking-[0.3em] text-gold-400">Certificate of Completion</p>
              <p className="mt-3 text-xs text-white/60">This certifies that</p>
              <p className="font-display text-xl font-semibold">{user?.name}</p>
              <p className="mt-2 text-xs text-white/60">has successfully completed</p>
              <p className="font-display text-base font-semibold text-gold-300">{cert.course}</p>
              <div className="mt-4 flex items-end justify-between text-2xs text-white/50">
                <span>
                  {new Date(cert.issued).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })} · {cert.hours} learning hours
                </span>
                <span className="inline-flex items-center gap-1 font-mono">
                  <BadgeCheck className="h-3.5 w-3.5 text-gold-400" aria-hidden /> {cert.id}
                </span>
              </div>
            </div>
            <div className="flex gap-2 p-4">
              <button onClick={() => printCertificate(cert, user?.name ?? "Learner")} className="btn-primary btn-sm flex-1">
                <Printer className="h-4 w-4" aria-hidden /> Print / Save PDF
              </button>
              <a href={linkedInUrl(cert)} target="_blank" rel="noreferrer" className="btn-ghost btn-sm flex-1">
                <Share2 className="h-4 w-4" aria-hidden /> Add to LinkedIn
              </a>
            </div>
          </div>
        ))}
      </div>

      {nearest && nearestCourse && (
        <div className="card mt-8 border-dashed p-8 text-center">
          <p className="font-display text-lg font-semibold">Your next certificate is within reach</p>
          <p className="mx-auto mt-1 max-w-md text-sm muted">
            Finish {nearestCourse.title} ({nearest.progress}% done) to earn your next verified certificate.
          </p>
          <Link href={learnHref(nearestCourse, nearest.lastLessonId || undefined)} className="btn-gold btn-md mt-4">
            Continue learning
          </Link>
        </div>
      )}
    </div>
  );
}
