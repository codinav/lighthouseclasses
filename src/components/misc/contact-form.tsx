"use client";

import { useState } from "react";
import { CheckCircle2, Loader2, Send } from "lucide-react";

export function ContactForm() {
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    await new Promise((r) => setTimeout(r, 1000));
    setBusy(false);
    setSent(true);
  };

  if (sent) {
    return (
      <div className="card flex h-full flex-col items-center justify-center p-10 text-center animate-scale-in">
        <CheckCircle2 className="h-12 w-12 text-emerald-500" aria-hidden />
        <h2 className="mt-4 font-display text-2xl font-semibold">Message received!</h2>
        <p className="mt-2 max-w-sm text-sm muted">
          Thanks for writing in. Someone from the crew will reply to your email within a few hours.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="card space-y-4 p-6 sm:p-8">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="c-name" className="label-lh">Your name</label>
          <input id="c-name" required className="input-lh" placeholder="Aarav Sharma" />
        </div>
        <div>
          <label htmlFor="c-email" className="label-lh">Email</label>
          <input id="c-email" type="email" required className="input-lh" placeholder="you@example.com" />
        </div>
      </div>
      <div>
        <label htmlFor="c-topic" className="label-lh">Topic</label>
        <select id="c-topic" className="input-lh">
          <option>Course question</option>
          <option>Payments & refunds</option>
          <option>Technical issue</option>
          <option>Teach with us</option>
          <option>Partnership</option>
          <option>Something else</option>
        </select>
      </div>
      <div>
        <label htmlFor="c-msg" className="label-lh">Message</label>
        <textarea id="c-msg" required rows={5} className="input-lh resize-none" placeholder="Tell us everything…" />
      </div>
      <button type="submit" disabled={busy} className="btn-gold btn-lg w-full sm:w-auto">
        {busy ? <Loader2 className="h-5 w-5 animate-spin" aria-hidden /> : <Send className="h-4 w-4" aria-hidden />}
        {busy ? "Sending…" : "Send message"}
      </button>
    </form>
  );
}
