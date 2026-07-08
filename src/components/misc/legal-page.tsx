export function LegalPage({
  title,
  updated,
  sections,
}: {
  title: string;
  updated: string;
  sections: { heading: string; body: string[] }[];
}) {
  return (
    <div className="container-lh max-w-3xl py-10 sm:py-14">
      <p className="eyebrow">Legal</p>
      <h1 className="section-title mt-4">{title}</h1>
      <p className="mt-2 text-sm muted">Last updated: {updated}</p>
      <div className="mt-10 space-y-10">
        {sections.map((s, i) => (
          <section key={s.heading}>
            <h2 className="font-display text-xl font-semibold">
              {i + 1}. {s.heading}
            </h2>
            {s.body.map((p, j) => (
              <p key={j} className="mt-3 text-sm leading-relaxed muted sm:text-base">
                {p}
              </p>
            ))}
          </section>
        ))}
      </div>
      <p className="card mt-12 p-5 text-sm muted">
        Questions about this policy? Write to{" "}
        <a href="mailto:legal@lighthouseclasses.com" className="font-semibold text-ocean-600 hover:underline dark:text-gold-400">
          legal@lighthouseclasses.com
        </a>
        . Lighthouse Classes Pvt. Ltd., WeWork BKC, Mumbai 400051, India.
      </p>
    </div>
  );
}
