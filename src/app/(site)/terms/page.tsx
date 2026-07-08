import type { Metadata } from "next";
import { LegalPage } from "@/components/misc/legal-page";

export const metadata: Metadata = { title: "Terms of Service" };

export default function TermsPage() {
  return (
    <LegalPage
      title="Terms of Service"
      updated="1 June 2026"
      sections={[
        {
          heading: "The agreement",
          body: [
            "By creating an account on Lighthouse Classes you agree to these terms. You must be 13 or older; users under 18 need a parent or guardian's consent. One account per person — sharing credentials or reselling access is not permitted and may lead to suspension.",
          ],
        },
        {
          heading: "Your license to learn",
          body: [
            "Course purchases grant you a personal, non-transferable, lifetime license to stream (and where offered, download) the content for your own learning. Subscription plans grant the same for the duration of the subscription. Content remains the intellectual property of Lighthouse Classes and its teachers — recording, redistributing, or uploading it elsewhere is prohibited.",
          ],
        },
        {
          heading: "Payments & renewals",
          body: [
            "Prices are in INR and include GST. Subscriptions renew automatically; we email you 7 days before every renewal and you can cancel anytime with effect from the next cycle. EMI plans are provided by your bank; missed EMI payments are governed by your bank's terms.",
            "Refunds follow our Refund Policy: 7 days, no questions asked, for purchases with less than 20% content consumed.",
          ],
        },
        {
          heading: "Community conduct",
          body: [
            "Be respectful. Harassment, hate speech, plagiarism, exam malpractice solicitation, or spam lead to content removal and possible account termination. We moderate with humans, and you can appeal any decision at conduct@lighthouseclasses.com.",
          ],
        },
        {
          heading: "Certificates",
          body: [
            "Certificates attest completion of coursework, verified by lesson and assessment activity. Fraudulent completion (e.g., automated playback) voids certificates. Each carries a public verification ID; misrepresenting a revoked certificate is your liability.",
          ],
        },
        {
          heading: "Liability & changes",
          body: [
            "We provide the platform 'as is' with a 99.5% uptime goal but no absolute guarantee. Our total liability is limited to the amount you paid in the preceding 12 months. We may update these terms; material changes are notified 15 days in advance, and continued use constitutes acceptance. These terms are governed by the laws of India, with courts in Mumbai having jurisdiction.",
          ],
        },
      ]}
    />
  );
}
