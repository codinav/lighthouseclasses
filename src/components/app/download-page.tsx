"use client";

/**
 * /app — the app download page. Android gets the direct APK (sideload, no
 * Play Store); iPhone gets Add-to-Home-Screen instructions; desktop shows a
 * QR code pointing here. The relevant platform's card is highlighted first.
 */
import { useEffect, useState } from "react";
import { Apple, Download, MonitorSmartphone, ShieldCheck, Smartphone, WifiOff } from "lucide-react";
import { cn } from "@/lib/utils";
import { APP_VERSION } from "@/lib/app-version";

const APK_PATH = "/app/lighthouse-classes.apk";

type Platform = "android" | "ios" | "other";

function Step({ n, children }: { n: number; children: React.ReactNode }) {
  return (
    <li className="flex gap-3">
      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gold-400/20 text-xs font-bold text-gold-700 dark:text-gold-300">
        {n}
      </span>
      <span className="text-sm leading-relaxed">{children}</span>
    </li>
  );
}

export function AppDownloadClient() {
  const [platform, setPlatform] = useState<Platform>("other");
  useEffect(() => {
    const ua = navigator.userAgent;
    if (/android/i.test(ua)) setPlatform("android");
    else if (/iphone|ipad|ipod/i.test(ua)) setPlatform("ios");
  }, []);

  const androidCard = (
    <div
      key="android"
      className={cn("card p-6 sm:p-8", platform === "android" && "border-gold-400/60 shadow-lifted")}
    >
      <div className="flex items-center gap-3">
        <Smartphone className="h-6 w-6 text-ocean-600 dark:text-gold-400" aria-hidden />
        <h2 className="font-display text-xl font-semibold">Android</h2>
        {platform === "android" && (
          <span className="chip border-gold-400/40 bg-gold-400/10 text-2xs font-bold uppercase tracking-wider text-gold-700 dark:text-gold-300">
            Your device
          </span>
        )}
      </div>
      <p className="mt-2 text-sm muted">
        Direct download from us — no Play Store needed. Version {APP_VERSION}, ~15 MB.
      </p>
      <a href={APK_PATH} download className="btn-primary mt-5 inline-flex items-center gap-2">
        <Download className="h-4 w-4" aria-hidden /> Download the app (APK)
      </a>
      <ol className="mt-6 space-y-3">
        <Step n={1}>Tap the download button, then open the downloaded file.</Step>
        <Step n={2}>
          If Android warns about unknown apps, tap <strong>Settings → Allow from this source</strong> — a one-time
          step because you&rsquo;re installing from our website instead of the Play Store.
        </Step>
        <Step n={3}>
          Tap <strong>Install</strong>, then open Lighthouse Classes from your home screen.
        </Step>
      </ol>
    </div>
  );

  const iosCard = (
    <div key="ios" className={cn("card p-6 sm:p-8", platform === "ios" && "border-gold-400/60 shadow-lifted")}>
      <div className="flex items-center gap-3">
        <Apple className="h-6 w-6 text-ocean-600 dark:text-gold-400" aria-hidden />
        <h2 className="font-display text-xl font-semibold">iPhone &amp; iPad</h2>
        {platform === "ios" && (
          <span className="chip border-gold-400/40 bg-gold-400/10 text-2xs font-bold uppercase tracking-wider text-gold-700 dark:text-gold-300">
            Your device
          </span>
        )}
      </div>
      <p className="mt-2 text-sm muted">
        Apple doesn&rsquo;t allow app installs from websites — install Lighthouse Classes as a web app instead. Same
        content, right on your home screen.
      </p>
      <ol className="mt-6 space-y-3">
        <Step n={1}>
          Open <strong>lighthouseclasses.com</strong> in <strong>Safari</strong>.
        </Step>
        <Step n={2}>
          Tap the <strong>Share</strong> button (square with an arrow), then <strong>Add to Home Screen</strong>.
        </Step>
        <Step n={3}>
          Tap <strong>Add</strong> — the Lighthouse icon appears on your home screen like any app.
        </Step>
      </ol>
    </div>
  );

  const cards = platform === "ios" ? [iosCard, androidCard] : [androidCard, iosCard];

  return (
    <div className="bg-hero-radial">
      <section className="container-lh pb-24 pt-10 sm:pt-16">
        <div className="mx-auto max-w-3xl text-center">
          <span className="eyebrow animate-fade-up">
            <MonitorSmartphone className="h-3.5 w-3.5" aria-hidden /> Lighthouse Classes app
          </span>
          <h1 className="section-title mt-5 animate-fade-up" style={{ animationDelay: "60ms" }}>
            Learn from your pocket
          </h1>
          <p
            className="mx-auto mt-3 max-w-xl text-sm muted sm:text-base animate-fade-up"
            style={{ animationDelay: "120ms" }}
          >
            Courses, live classes, community and both dictionaries — including full offline access to the Platts and
            Urdu dictionaries.
          </p>
        </div>

        <div className="mx-auto mt-10 grid max-w-4xl gap-5 md:grid-cols-2">{cards}</div>

        {platform === "other" && (
          <div className="card mx-auto mt-5 flex max-w-4xl flex-col items-center gap-4 p-6 sm:flex-row sm:p-8">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/app/qr.svg" alt="QR code linking to this page" className="h-36 w-36 rounded-xl bg-white p-2" />
            <div>
              <h2 className="font-display text-lg font-semibold">On your computer?</h2>
              <p className="mt-1 text-sm muted">
                Scan this QR code with your phone&rsquo;s camera to open this page and install the app directly.
              </p>
            </div>
          </div>
        )}

        <div className="mx-auto mt-10 grid max-w-4xl gap-4 sm:grid-cols-3">
          {[
            { icon: WifiOff, title: "Dictionaries offline", body: "Platts (1884) and the Urdu dictionary work without internet." },
            { icon: ShieldCheck, title: "Safe & signed", body: "Downloaded straight from lighthouseclasses.com and cryptographically signed by us." },
            { icon: Download, title: "Free updates", body: "The app checks for new versions and offers them automatically." },
          ].map((c) => (
            <div key={c.title} className="card p-5">
              <c.icon className="h-5 w-5 text-ocean-600 dark:text-gold-400" aria-hidden />
              <p className="mt-2 font-display text-base font-semibold">{c.title}</p>
              <p className="mt-1 text-sm muted">{c.body}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
