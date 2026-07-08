import { notFound } from "next/navigation";
import { QUIZZES, getQuiz } from "@/lib/data";
import { QuizRunner } from "@/components/quiz/quiz-runner";
import { AuthGate } from "@/components/auth/auth-gate";

export function generateStaticParams() {
  return QUIZZES.map((q) => ({ id: q.id }));
}

export function generateMetadata({ params }: { params: { id: string } }) {
  const quiz = getQuiz(params.id);
  return { title: quiz ? quiz.title : "Quiz" };
}

export default function QuizPage({ params }: { params: { id: string } }) {
  const quiz = getQuiz(params.id);
  if (!quiz) notFound();
  return (
    <AuthGate>
      <QuizRunner quiz={quiz} />
    </AuthGate>
  );
}
