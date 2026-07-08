import type { Metadata } from "next";
import { CommunityBoard } from "@/components/community/board";

export const metadata: Metadata = {
  title: "Community",
  description: "Discussion forums, course Q&A, study groups, and announcements — learn together at Lighthouse Classes.",
};

export default function CommunityPage() {
  return (
    <div className="container-lh py-10 sm:py-14">
      <div className="max-w-2xl">
        <p className="eyebrow">Community</p>
        <h1 className="section-title mt-4">Nobody learns alone here</h1>
        <p className="mt-3 text-base muted sm:text-lg">
          Learners of Urdu, English, and Persian asking, answering, and cheering each other on.
          Sign in to post — reading is open to everyone.
        </p>
      </div>
      <CommunityBoard />
    </div>
  );
}
