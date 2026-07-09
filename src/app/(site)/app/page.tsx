import type { Metadata } from "next";
import { AppDownloadClient } from "@/components/app/download-page";

export const metadata: Metadata = {
  title: "Get the App — Lighthouse Classes",
  description:
    "Download the Lighthouse Classes Android app directly, or install the web app on iPhone. Courses, live classes and offline dictionaries in your pocket.",
};

export default function AppPage() {
  return <AppDownloadClient />;
}
