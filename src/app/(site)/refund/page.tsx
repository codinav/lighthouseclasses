import type { Metadata } from "next";
import { LegalPage } from "@/components/misc/legal-page";

export const metadata: Metadata = { title: "Refund Policy" };

export default function RefundPage() {
  return (
    <LegalPage
      title="Refund Policy"
      updated="1 June 2026"
      sections={[
        {
          heading: "The 7-day guarantee",
          body: [
            "Every individual course purchase comes with a 7-day, no-questions-asked refund window, provided you've consumed less than 20% of the course content. Request a refund from Settings → Payment History, or by emailing refunds@lighthouseclasses.com from your registered email.",
          ],
        },
        {
          heading: "Subscriptions",
          body: [
            "Monthly plans can be cancelled anytime and remain active until the end of the paid month; they are not refunded pro-rata. Yearly plans are refundable within 7 days of first purchase (not renewal) if less than 20% of any course has been consumed in that period. Renewal charges are refundable if requested within 48 hours and the account shows no usage after renewal.",
          ],
        },
        {
          heading: "Live programs & mentorship",
          body: [
            "Flagship programs (e.g., Urdu Complete: One-Year Immersion) are refundable up to 7 days after the first live session, minus the value of mentorship sessions already delivered. After that, remaining amounts can be transferred to another Lighthouse program once, within the same academic year.",
          ],
        },
        {
          heading: "How refunds are paid",
          body: [
            "Refunds go back to the original payment method within 5–7 business days of approval (UPI is usually same-day). EMI purchases are refunded to the card, and your bank reverses remaining installments per their timeline. GST is refunded along with the base amount. Coupons and gift-card value are restored to your account instead of cash.",
          ],
        },
        {
          heading: "Exceptions",
          body: [
            "Certificates already issued for a course void its refund eligibility. Accounts terminated for conduct violations are not eligible for refunds. Scholarship-discounted purchases are refundable only for the amount actually paid.",
          ],
        },
      ]}
    />
  );
}
