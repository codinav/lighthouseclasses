import type { Metadata } from "next";
import { TeachersDirectory } from "@/components/teachers/teachers-directory";

export const metadata: Metadata = {
  title: "Our Teachers",
  description: "Published poets, Tehran-trained Persian scholars, Cambridge-certified English trainers — meet the ustads of Lighthouse Classes.",
};

export default function TeachersPage() {
  return (
    <div className="container-lh py-10 sm:py-14">
      <div className="max-w-2xl">
        <p className="eyebrow">The faculty</p>
        <h1 className="section-title mt-4">Teachers worth crossing oceans for</h1>
        <p className="mt-3 text-base muted sm:text-lg">
          We hire slowly and obsessively. Fewer than 2% of applicants make it through our teaching
          auditions — because your time deserves nothing less.
        </p>
      </div>

      <TeachersDirectory />
    </div>
  );
}
