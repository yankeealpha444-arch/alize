const fields = [
  { key: "target", label: "Who is this for?", placeholder: "e.g. First time founders, busy parents, freelancers" },
  { key: "problem", label: "What problem are you solving?", placeholder: "e.g. They cannot find affordable, fast, simple help with…" },
  { key: "result", label: "What result do they want?", placeholder: "e.g. Save 3 hours per week, get customers faster, reduce stress" },
  { key: "current", label: "How do they solve this today?", placeholder: "e.g. Spreadsheets, manual work, competitors, agencies" },
  { key: "better", label: "Why is your solution better?", placeholder: "e.g. AI powered, 10x faster, simpler, cheaper, better UX" },
];

interface Props {
  validation: Record<string, string | undefined>;
  onUpdate: (key: string, value: string) => void;
}

export function ValidationQuestions({ validation, onUpdate }: Props) {
  return (
    <section className="mb-12">
      <h2 className="text-lg font-semibold text-foreground mb-1">1. Shape Your MVP</h2>
      <p className="text-sm text-muted-foreground mb-5">Answer a few questions so Alizé can build the right thing.</p>
      <div className="rounded-xl border border-border bg-card p-6 space-y-5">
        {fields.map((f) => (
          <div key={f.key}>
            <label htmlFor={`val-${f.key}`} className="text-sm font-medium text-foreground mb-1.5 block">
              {f.label}
            </label>
            <input
              id={`val-${f.key}`}
              value={validation[f.key] || ""}
              onChange={(e) => onUpdate(f.key, e.target.value)}
              placeholder={f.placeholder}
              className="w-full bg-secondary border border-border rounded-lg px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
            />
          </div>
        ))}
      </div>
    </section>
  );
}
