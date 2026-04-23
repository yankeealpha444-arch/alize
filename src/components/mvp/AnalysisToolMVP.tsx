import { useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import {
  DEDICATED_CALC_ROOT,
  DedicatedCalculatorActions,
  DedicatedCalculatorHeader,
  DedicatedInputsHeading,
} from "@/components/pipeline/dedicatedCalculatorChrome";

type Props = {
  projectId: string;
  /** Full prompt / idea used for title derivation and mock output seed. */
  promptText: string;
};

function deriveTitle(prompt: string): string {
  const h = prompt.toLowerCase();
  if (/\bstartup\s+strategy\b|\bstrategist\b|\bstrategy\b.*\b(evaluate|review|respond)/i.test(prompt)) {
    return "Startup Strategy Review";
  }
  if (/\bgrowth\s+(plan|engineer)/i.test(h) || /\bgrowth plan\b/i.test(h)) return "Growth Plan Feedback";
  if (/\bpositioning\b/i.test(h)) return "Product Positioning";
  if (/\bgo\s*to\s*market\b|\bgtm\b/i.test(h)) return "Go-To-Market Review";
  return "Strategy Analysis";
}

function mockResponse(seed: string): string {
  const t = seed.trim();
  const excerpt = t.length > 320 ? `${t.slice(0, 320)}…` : t;
  return [
    "Here is a concise response aligned with your brief:",
    "",
    excerpt,
    "",
    "—",
    "",
    "This preview shows how a focused written answer would appear. Connect your model to replace this placeholder.",
  ].join("\n");
}

/**
 * Text analysis / generation preview — not a calculator. Shown when the prompt classifies as `text_response`.
 */
export default function AnalysisToolMVP({ projectId, promptText }: Props) {
  const [topic, setTopic] = useState(() => promptText.trim());
  const [generated, setGenerated] = useState(false);

  const title = useMemo(() => deriveTitle(promptText || topic), [promptText, topic]);

  const reset = () => {
    setTopic(promptText.trim());
    setGenerated(false);
  };

  const onGenerate = () => {
    setGenerated(true);
  };

  const output = generated ? mockResponse(topic || promptText) : null;

  return (
    <div className={DEDICATED_CALC_ROOT} data-analysis-tool-mvp>
      <DedicatedCalculatorHeader
        kicker="Written response"
        title={title}
        description="Paste your topic or prompt and generate a focused written response."
      />

      <div className="space-y-4">
        <DedicatedInputsHeading />
        <div className="space-y-2 max-w-3xl">
          <label className="text-sm font-medium text-foreground" htmlFor={`analysis-in-${projectId}`}>
            What do you want a response about?
          </label>
          <textarea
            id={`analysis-in-${projectId}`}
            value={topic}
            onChange={(e) => {
              setTopic(e.target.value);
              setGenerated(false);
            }}
            rows={10}
            placeholder="Paste the context, question, or strategy you want answered…"
            className="w-full min-h-[200px] rounded-xl border border-border bg-background px-4 py-3 text-base text-foreground placeholder:text-muted-foreground/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </div>
      </div>

      <DedicatedCalculatorActions
        calculateLabel="Generate response"
        onCalculate={onGenerate}
        onReset={reset}
        disabled={!topic.trim()}
      />

      {output ? (
        <section className="space-y-3" aria-live="polite">
          <h2 className="text-sm font-semibold text-foreground border-b border-border pb-2">Response</h2>
          <Card className="rounded-2xl border-border shadow-sm">
            <CardContent className="pt-6 pb-6">
              <p className="text-base text-foreground leading-relaxed whitespace-pre-wrap">{output}</p>
            </CardContent>
          </Card>
        </section>
      ) : null}
    </div>
  );
}
