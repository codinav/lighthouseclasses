import type { Metadata } from "next";
import { LiveSchedule } from "@/components/live/live-schedule";
import { Reveal } from "@/components/ui/reveal";
import { CalendarDays, MessageSquare, Radio, Video } from "lucide-react";

export const metadata: Metadata = {
  title: "Live Classes",
  description: "Interactive live classes with India's finest teachers — chat, polls, raise-hand, and recordings included.",
};

const FEATURES = [
  { icon: Video, title: "HD interactive rooms", text: "Crystal-clear video with polls and quizzes woven into the class." },
  { icon: MessageSquare, title: "Live chat & raise hand", text: "Ask your doubt the moment it appears — teachers answer live." },
  { icon: CalendarDays, title: "Smart reminders", text: "Calendar sync plus reminders 30 minutes before every session." },
  { icon: Radio, title: "Recordings included", text: "Missed it? Every class is recorded and in your dashboard within an hour." },
];

export default function LivePage() {
  return (
    <div className="container-lh py-10 sm:py-14">
      <div className="max-w-2xl">
        <p className="eyebrow">
          <Radio className="h-3 w-3" aria-hidden /> Live schedule
        </p>
        <h1 className="section-title mt-4">This week, live</h1>
        <p className="mt-3 text-base muted sm:text-lg">
          Real classes with real interaction. All times in IST — reminders handle the rest.
        </p>
      </div>

      <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {FEATURES.map((f, i) => (
          <Reveal key={f.title} delay={i * 60}>
            <div className="card h-full p-5">
              <f.icon className="h-6 w-6 text-ocean-600 dark:text-gold-400" aria-hidden />
              <h2 className="mt-3 text-sm font-bold">{f.title}</h2>
              <p className="mt-1 text-xs leading-relaxed muted">{f.text}</p>
            </div>
          </Reveal>
        ))}
      </div>

      <LiveSchedule />
    </div>
  );
}
