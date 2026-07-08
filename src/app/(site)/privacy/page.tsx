import type { Metadata } from "next";
import { LegalPage } from "@/components/misc/legal-page";

export const metadata: Metadata = { title: "Privacy Policy" };

export default function PrivacyPage() {
  return (
    <LegalPage
      title="Privacy Policy"
      updated="1 June 2026"
      sections={[
        {
          heading: "What we collect",
          body: [
            "We collect the information you give us directly: your name, email, phone number (optional), and payment details processed securely by Razorpay — we never store card numbers. We also collect learning activity (lessons watched, quiz scores, streaks) to power your dashboard, recommendations, and certificates.",
            "Device and usage data (browser type, pages visited, crash logs) is collected to keep the platform fast and reliable. We use privacy-respecting analytics and never sell your data to anyone, ever.",
          ],
        },
        {
          heading: "How we use it",
          body: [
            "Your data powers the product: resuming videos where you left off, recalibrating study plans, issuing verifiable certificates, and sending the reminders you've opted into. We use aggregated, anonymised data to improve courses — for example, spotting lessons where many students rewind.",
            "We send transactional emails (receipts, verification codes) always, and marketing emails only with your consent. Every marketing email has a one-click unsubscribe.",
          ],
        },
        {
          heading: "Who can see it",
          body: [
            "Teachers see the learning progress of students enrolled in their courses — never your payment details. Community posts are visible to other members under the name you choose. We share data with processors (payments, email, video delivery) bound by strict data-protection agreements, and with authorities only when legally required.",
          ],
        },
        {
          heading: "Your rights",
          body: [
            "You can export or delete your account data anytime from Settings, or by emailing privacy@lighthouseclasses.com. Deletion is permanent and completes within 30 days, with backups purged within 90. Certificates already issued remain verifiable unless you ask us to revoke them.",
            "We comply with India's Digital Personal Data Protection Act, 2023. Minors' accounts (under 18) require parental consent and receive no marketing communication.",
          ],
        },
        {
          heading: "Security",
          body: [
            "All traffic is encrypted with TLS 1.3. Passwords are hashed with argon2id. Access to production data is limited, logged, and audited. If a breach affecting you ever occurs, we will notify you within 72 hours with clear, honest details.",
          ],
        },
      ]}
    />
  );
}
