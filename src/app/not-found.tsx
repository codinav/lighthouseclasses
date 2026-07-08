import Link from "next/link";
import { LighthouseMark } from "@/components/ui/logo";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-navy-950 px-6 text-center text-white">
      <div className="relative">
        <LighthouseMark className="h-28 w-28 animate-float text-white" />
        <span className="absolute -right-3 top-2 h-6 w-6 animate-pulse-ring rounded-full border-2 border-gold-400" aria-hidden />
      </div>
      <p className="mt-8 font-display text-7xl font-bold text-gradient-gold sm:text-8xl">404</p>
      <h1 className="mt-4 font-display text-2xl font-semibold sm:text-3xl">Lost in the fog</h1>
      <p className="mt-3 max-w-md text-white/60">
        The page you're looking for drifted off the map. Follow the light back to familiar waters.
      </p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Link href="/" className="btn-gold btn-lg">Back to home</Link>
        <Link href="/courses" className="btn-ghost btn-lg border-white/25 text-white hover:bg-white/10">
          Browse courses
        </Link>
      </div>
    </div>
  );
}
