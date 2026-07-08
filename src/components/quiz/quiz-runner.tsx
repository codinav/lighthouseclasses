"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowRight, Check, ChevronLeft, Clock, History, Lightbulb, X, Zap } from "lucide-react";
import type { Quiz } from "@/lib/types";
import { getCourse } from "@/lib/data";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/providers";
import { readActivity, recordQuizAttempt, type QuizAttempt } from "@/lib/activity";
import { ProgressRing } from "@/components/ui/progress";

type Phase = "intro" | "running" | "done";

export function QuizRunner({ quiz }: { quiz: Quiz }) {
  const course = getCourse(quiz.courseSlug);
  const { user } = useAuth();
  const [attempts, setAttempts] = useState<QuizAttempt[]>([]);
  const recorded = useRef(false);
  const [phase, setPhase] = useState<Phase>("intro");
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [answers, setAnswers] = useState<(number | null)[]>([]);
  const [secondsLeft, setSecondsLeft] = useState(quiz.durationMin * 60);

  const q = quiz.questions[index];
  const total = quiz.questions.length;

  /* Timer */
  useEffect(() => {
    if (phase !== "running") return;
    if (secondsLeft <= 0) {
      setPhase("done");
      return;
    }
    const t = setTimeout(() => setSecondsLeft((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [phase, secondsLeft]);

  const score = useMemo(
    () => answers.filter((a, i) => a === quiz.questions[i]?.answerIndex).length,
    [answers, quiz.questions]
  );

  const pick = (i: number) => {
    if (revealed) return;
    setSelected(i);
    setRevealed(true);
    setAnswers((prev) => {
      const next = [...prev];
      next[index] = i;
      return next;
    });
  };

  const nextQuestion = () => {
    if (index + 1 >= total) {
      setPhase("done");
    } else {
      setIndex((i) => i + 1);
      setSelected(null);
      setRevealed(false);
    }
  };

  const mm = Math.floor(secondsLeft / 60);
  const ss = secondsLeft % 60;
  const pct = Math.round((score / total) * 100);
  const xpEarned = Math.round(quiz.xp * (score / total));

  /* Load past attempts; save each finished run exactly once */
  useEffect(() => {
    if (!user?.email) return;
    setAttempts(readActivity(user.email).quizzes.filter((a) => a.quizId === quiz.id));
  }, [user?.email, quiz.id, phase]);

  useEffect(() => {
    if (phase !== "done" || recorded.current || !user?.email) return;
    recorded.current = true;
    recordQuizAttempt(user.email, {
      quizId: quiz.id,
      title: quiz.title,
      courseSlug: quiz.courseSlug,
      pct,
      xp: xpEarned,
      at: new Date().toISOString(),
    });
  }, [phase, user?.email, quiz.id, quiz.title, quiz.courseSlug, pct, xpEarned]);

  /* ---------------- Intro ---------------- */
  if (phase === "intro") {
    return (
      <Shell courseSlug={quiz.courseSlug}>
        <div className="card mx-auto max-w-xl animate-scale-in p-8 text-center sm:p-12">
          <span className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-gold-400/15">
            <Lightbulb className="h-10 w-10 text-gold-500" aria-hidden />
          </span>
          <p className="eyebrow mt-6">{course?.title}</p>
          <h1 className="mt-4 font-display text-3xl font-semibold">{quiz.title}</h1>
          <div className="mt-6 grid grid-cols-3 gap-3">
            {[
              [String(total), "Questions"],
              [`${quiz.durationMin} min`, "Time limit"],
              [`+${quiz.xp}`, "Max XP"],
            ].map(([v, l]) => (
              <div key={l} className="rounded-2xl border p-4">
                <p className="font-display text-xl font-bold">{v}</p>
                <p className="text-2xs uppercase tracking-widest muted">{l}</p>
              </div>
            ))}
          </div>
          <p className="mt-6 text-sm leading-relaxed muted">
            Each question shows an instant explanation after you answer. Every attempt earns
            real XP — score 100% to unlock the Harf Shanaas badge.
          </p>
          <button onClick={() => setPhase("running")} className="btn-gold btn-lg mt-8 w-full">
            Start quiz <ArrowRight className="h-4 w-4" aria-hidden />
          </button>
        </div>
      </Shell>
    );
  }

  /* ---------------- Results ---------------- */
  if (phase === "done") {
    return (
      <Shell courseSlug={quiz.courseSlug}>
        <div className="mx-auto max-w-2xl space-y-6">
          <div className="card animate-scale-in p-8 text-center sm:p-10">
            <ProgressRing value={pct} size={130} stroke={10} className="mx-auto">
              <span className="text-center">
                <span className="block font-display text-3xl font-bold">{pct}%</span>
                <span className="text-2xs uppercase tracking-widest muted">Score</span>
              </span>
            </ProgressRing>
            <h1 className="mt-6 font-display text-3xl font-semibold">
              {pct === 100 ? "Perfect! 🏆" : pct >= 70 ? "Well done! ✨" : "Keep practising 💪"}
            </h1>
            <p className="mt-2 text-sm muted">
              You answered {score} of {total} correctly.
            </p>
            <p className="mt-4 inline-flex items-center gap-2 rounded-full bg-gold-400/15 px-4 py-2 text-sm font-bold text-gold-600 dark:text-gold-300">
              <Zap className="h-4 w-4" aria-hidden /> +{xpEarned} XP earned
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <button
                onClick={() => {
                  recorded.current = false;
                  setPhase("intro");
                  setIndex(0);
                  setSelected(null);
                  setRevealed(false);
                  setAnswers([]);
                  setSecondsLeft(quiz.durationMin * 60);
                }}
                className="btn-ghost btn-md"
              >
                Retake quiz
              </button>
              <Link href={`/learn/view?slug=${quiz.courseSlug}`} className="btn-primary btn-md">
                Continue course
              </Link>
            </div>
          </div>

          {/* Attempt history — the user's real runs of this quiz */}
          {attempts.length > 0 && (
            <div className="card p-6">
              <h2 className="flex items-center gap-2 font-display text-lg font-semibold">
                <History className="h-5 w-5 text-gold-500" aria-hidden /> Your attempts
              </h2>
              <ol className="mt-4 space-y-2">
                {attempts
                  .slice()
                  .reverse()
                  .slice(0, 5)
                  .map((a, i) => (
                    <li key={a.at} className={cn("flex items-center gap-3 rounded-2xl border p-3", i === 0 && "border-2 border-gold-400 bg-gold-400/5")}>
                      <span className="w-14 text-xs font-semibold muted">{i === 0 ? "Latest" : `#${attempts.length - i}`}</span>
                      <span className="flex-1 text-xs muted">
                        {new Date(a.at).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit", hour12: true })}
                      </span>
                      <span className="text-xs font-bold text-gold-600 dark:text-gold-300">+{a.xp} XP</span>
                      <span className="font-display text-sm font-bold">{a.pct}%</span>
                    </li>
                  ))}
              </ol>
              {attempts.length > 1 && (
                <p className="mt-3 border-t pt-3 text-xs muted">
                  Best score: {Math.max(...attempts.map((a) => a.pct))}% across {attempts.length} attempts.
                </p>
              )}
            </div>
          )}
        </div>
      </Shell>
    );
  }

  /* ---------------- Running ---------------- */
  return (
    <Shell courseSlug={quiz.courseSlug}>
      <div className="mx-auto max-w-2xl">
        {/* Progress + timer */}
        <div className="flex items-center justify-between gap-4">
          <div className="flex flex-1 gap-1.5" aria-label={`Question ${index + 1} of ${total}`}>
            {quiz.questions.map((_, i) => (
              <span
                key={i}
                className={cn(
                  "h-1.5 flex-1 rounded-full transition-colors",
                  i < index ? "bg-emerald-500" : i === index ? "bg-gold-400" : "bg-navy-900/10 dark:bg-white/10"
                )}
              />
            ))}
          </div>
          <span
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 font-mono text-sm font-bold tabular-nums",
              secondsLeft < 60 ? "border-rose-400 text-rose-500" : ""
            )}
            aria-label={`${mm} minutes ${ss} seconds remaining`}
          >
            <Clock className="h-4 w-4" aria-hidden /> {mm}:{String(ss).padStart(2, "0")}
          </span>
        </div>

        <div key={q.id} className="card mt-6 animate-fade-up p-6 sm:p-8">
          <p className="text-2xs font-bold uppercase tracking-widest muted">
            Question {index + 1} of {total}
          </p>
          <h1 className="mt-3 font-display text-xl font-semibold leading-relaxed sm:text-2xl">{q.question}</h1>

          <div className="mt-6 space-y-3" role="listbox" aria-label="Answer options">
            {q.options.map((opt, i) => {
              const isCorrect = i === q.answerIndex;
              const isPicked = i === selected;
              return (
                <button
                  key={i}
                  onClick={() => pick(i)}
                  disabled={revealed}
                  role="option"
                  aria-selected={isPicked}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-2xl border-2 p-4 text-left text-sm font-medium transition-all",
                    !revealed && "hover:border-ocean-500 hover:bg-ocean-600/5 active:scale-[0.99]",
                    revealed && isCorrect && "border-emerald-500 bg-emerald-500/10",
                    revealed && isPicked && !isCorrect && "border-rose-500 bg-rose-500/10",
                    !revealed && "border-[var(--lh-line)]",
                    revealed && !isPicked && !isCorrect && "opacity-50"
                  )}
                >
                  <span
                    className={cn(
                      "flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 font-display text-sm font-bold",
                      revealed && isCorrect && "border-emerald-500 bg-emerald-500 text-white",
                      revealed && isPicked && !isCorrect && "border-rose-500 bg-rose-500 text-white"
                    )}
                  >
                    {revealed && isCorrect ? <Check className="h-4 w-4" /> : revealed && isPicked ? <X className="h-4 w-4" /> : String.fromCharCode(65 + i)}
                  </span>
                  {opt}
                </button>
              );
            })}
          </div>

          {revealed && (
            <div className="mt-6 animate-fade-up rounded-2xl bg-ocean-600/5 p-5 dark:bg-white/5">
              <p className="flex items-center gap-2 text-sm font-bold text-ocean-600 dark:text-gold-400">
                <Lightbulb className="h-4 w-4" aria-hidden /> Explanation
              </p>
              <p className="mt-2 text-sm leading-relaxed muted">{q.explanation}</p>
              <button onClick={nextQuestion} className="btn-primary btn-md mt-5 w-full sm:w-auto">
                {index + 1 >= total ? "See results" : "Next question"} <ArrowRight className="h-4 w-4" aria-hidden />
              </button>
            </div>
          )}
        </div>
      </div>
    </Shell>
  );
}

function Shell({ children, courseSlug }: { children: React.ReactNode; courseSlug: string }) {
  return (
    <div className="min-h-screen bg-[var(--lh-bg)] pb-16">
      <header className="border-b bg-[var(--lh-card)]">
        <div className="container-lh flex h-14 items-center">
          <Link
            href={`/learn/view?slug=${courseSlug}`}
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-ocean-600 hover:underline dark:text-gold-400"
          >
            <ChevronLeft className="h-4 w-4" aria-hidden /> Back to course
          </Link>
        </div>
      </header>
      <main className="container-lh pt-10">{children}</main>
    </div>
  );
}
