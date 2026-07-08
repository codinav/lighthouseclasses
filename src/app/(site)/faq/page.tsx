import type { Metadata } from "next";
import Link from "next/link";
import { FAQS } from "@/lib/data";
import { Accordion } from "@/components/ui/accordion";
import { Reveal } from "@/components/ui/reveal";

export const metadata: Metadata = {
  title: "FAQ",
  description: "Answers to everything about courses, certificates, payments, live classes, and plans at Lighthouse Classes.",
};

export default function FAQPage() {
  return (
    <div className="container-lh py-10 sm:py-14">
      <div className="mx-auto max-w-2xl text-center">
        <p className="eyebrow">Help</p>
        <h1 className="section-title mt-4">Frequently asked questions</h1>
        <p className="mt-3 text-base muted sm:text-lg">
          Everything students and parents usually ask. Still stuck? Our{" "}
          <Link href="/support" className="font-semibold text-ocean-600 hover:underline dark:text-gold-400">support crew</Link>{" "}
          replies within hours.
        </p>
      </div>
      <Reveal className="mx-auto mt-10 max-w-3xl">
        <Accordion items={FAQS.map((f) => ({ title: f.q, content: f.a }))} />
      </Reveal>
    </div>
  );
}
