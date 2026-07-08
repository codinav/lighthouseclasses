import type { Metadata } from "next";
import { Suspense } from "react";
import { Noto_Nastaliq_Urdu, Noto_Serif_Devanagari } from "next/font/google";
import { PlattsClient } from "@/components/platts/platts-client";

const urdu = Noto_Nastaliq_Urdu({
  subsets: ["arabic"],
  weight: ["400", "700"],
  variable: "--font-urdu",
  display: "swap",
});

const devanagari = Noto_Serif_Devanagari({
  subsets: ["devanagari"],
  weight: ["400", "600"],
  variable: "--font-deva",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Platts Dictionary — Urdu, Classical Hindi & English (1884)",
  description:
    "A modern, searchable edition of John T. Platts' 1884 Dictionary of Urdu, Classical Hindi and English — 60,000 entries with etymology and meaning across Urdu, Devanagari and Roman scripts.",
  keywords: [
    "Platts dictionary", "Urdu dictionary", "Classical Hindi", "Urdu to English",
    "Hindi to English", "Urdu etymology", "Devanagari", "Roman Urdu", "Platts 1884",
  ],
};

export default function PlattsPage() {
  return (
    <div className={`${urdu.variable} ${devanagari.variable}`}>
      <Suspense fallback={<div className="container-lh py-24" />}>
        <PlattsClient />
      </Suspense>
    </div>
  );
}
