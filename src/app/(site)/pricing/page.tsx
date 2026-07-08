import type { Metadata } from "next";
import { PricingTable } from "@/components/pricing/pricing-table";
import { Accordion } from "@/components/ui/accordion";
import { Reveal } from "@/components/ui/reveal";
import { FAQS } from "@/lib/data";

export const metadata: Metadata = {
  title: "Pricing",
  description: "Simple, honest pricing. Start free, upgrade when you're ready. Beacon and Lighthouse plans with live classes and mentorship.",
};

export default function PricingPage() {
  return (
    <div className="container-lh py-10 sm:py-14">
      <div className="mx-auto max-w-2xl text-center">
        <p className="eyebrow">Pricing</p>
        <h1 className="section-title mt-4">Honest pricing, brilliant teaching</h1>
        <p className="mt-3 text-base muted sm:text-lg">
          Start free forever. Upgrade when you want the full beam — cancel anytime, keep your
          certificates and streaks.
        </p>
      </div>

      <PricingTable />

      <Reveal className="mx-auto mt-20 max-w-3xl">
        <h2 className="text-center font-display text-2xl font-semibold">Pricing questions</h2>
        <div className="mt-6">
          <Accordion
            defaultOpen={null}
            items={FAQS.filter((f) => /plan|refund|scholarship/i.test(f.q + f.a)).map((f) => ({ title: f.q, content: f.a }))}
          />
        </div>
      </Reveal>
    </div>
  );
}
