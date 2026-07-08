import type { Metadata } from "next";
import { CertificateVerifier } from "@/components/misc/certificate-verifier";

export const metadata: Metadata = {
  title: "Verify a Certificate",
  description: "Validate any Lighthouse Classes certificate using its unique verification ID.",
};

export default function VerifyCertificatePage() {
  return (
    <div className="container-lh max-w-2xl py-10 sm:py-16">
      <div className="text-center">
        <p className="eyebrow">Certificate verification</p>
        <h1 className="section-title mt-4">Check a certificate</h1>
        <p className="mt-3 text-base muted">
          Employers and institutions: enter the verification ID printed on any Lighthouse
          certificate (format: LH-YYYY-XXXXXX).
        </p>
      </div>
      <CertificateVerifier />
    </div>
  );
}
