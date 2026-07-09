import type { Metadata } from "next";
import { DictionaryRedirect } from "@/components/platts/dictionary-redirect";

export const metadata: Metadata = {
  title: "Dictionary — Lighthouse Classes",
  robots: { index: false },
};

/** The Urdu dictionary was retired in favour of the Platts dictionary. */
export default function DictionaryPage() {
  return <DictionaryRedirect />;
}
