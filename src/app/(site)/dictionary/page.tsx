import type { Metadata } from "next";
import { Suspense } from "react";
import { Noto_Nastaliq_Urdu } from "next/font/google";
import { DictionaryClient } from "@/components/dictionary/dictionary-client";

/* Nastaliq for Urdu text — self-hosted by next/font; unicode-range keeps it
   from downloading on pages that never render Urdu glyphs. */
const urdu = Noto_Nastaliq_Urdu({
  subsets: ["arabic"],
  weight: ["400", "700"],
  variable: "--font-urdu",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Urdu Dictionary — meanings in Urdu, Hindi, Roman & English",
  description:
    "Free online Urdu lughat: search thousands of Urdu words in Urdu, Hindi, Roman, or English. Meanings, pronunciation, etymology, and example sentences.",
  keywords: [
    "Urdu dictionary", "Urdu lughat", "Urdu meanings", "Urdu to English",
    "English to Urdu", "Roman Urdu", "Rekhta dictionary", "Nastaliq",
  ],
};

export default function DictionaryPage() {
  return (
    <div className={urdu.variable}>
      {/* useSearchParams (deep links ?w= / ?l=) requires a Suspense boundary */}
      <Suspense fallback={<div className="container-lh py-24" />}>
        <DictionaryClient />
      </Suspense>
    </div>
  );
}
