import { useState, useEffect } from "react";
import { Save, RotateCcw } from "lucide-react";
import { getMvpCustomizations, updateMvpCustomizations, addVersion } from "@/lib/projectData";
import { generateCopy } from "@/lib/copyGenerator";
import { toast } from "sonner";

interface ManualEditorProps {
  projectId?: string;
}

export default function ManualEditor({ projectId = "default" }: ManualEditorProps) {
  const idea = localStorage.getItem("alize_idea") || "My Product";
  const projectName = idea.split(" ").slice(0, 4).join(" ");
  const copy = generateCopy(idea, projectName);

  const [fields, setFields] = useState({
    headline: "",
    subtitle: "",
    ctaText: "",
    pricingCopy: "",
    showTestimonials: false,
  });

  useEffect(() => {
    const c = getMvpCustomizations(projectId);
    setFields({
      headline: c.headline,
      subtitle: c.subtitle,
      ctaText: c.ctaText,
      pricingCopy: c.pricingCopy,
      showTestimonials: c.showTestimonials,
    });
  }, [projectId]);

  const pushToStorage = (next: typeof fields) => {
    updateMvpCustomizations(
      {
        headline: next.headline,
        subtitle: next.subtitle,
        ctaText: next.ctaText,
        pricingCopy: next.pricingCopy,
        showTestimonials: next.showTestimonials,
      },
      projectId,
    );
    window.dispatchEvent(new Event("alize-mvp-updated"));
  };

  const handleSave = () => {
    addVersion("Manual snapshot from editor", "Manual Editor", projectId);
    toast.success("Version snapshot saved");
  };

  const handleReset = () => {
    const reset = { headline: "", subtitle: "", ctaText: "", pricingCopy: "", showTestimonials: false };
    setFields(reset);
    updateMvpCustomizations(reset, projectId);
    window.dispatchEvent(new Event("alize-mvp-updated"));
    toast.success("Reset to defaults");
  };

  const liveHeadline = fields.headline || copy.headline;
  const liveSubtitle = fields.subtitle || copy.subtitle;
  const liveCta = fields.ctaText || copy.cta;
  const livePricing = fields.pricingCopy || copy.pricingPlans.map(p => `${p.name}: ${p.price}`).join(" · ");

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-foreground">Edit MVP</h3>
        <div className="flex gap-2">
          <button type="button" onClick={handleReset} className="flex items-center gap-1.5 text-[10px] text-muted-foreground hover:text-foreground px-2 py-1 rounded border border-border hover:bg-secondary transition-colors">
            <RotateCcw className="w-3 h-3" /> Reset
          </button>
          <button type="button" onClick={handleSave} className="flex items-center gap-1.5 text-[10px] font-semibold text-background bg-foreground hover:bg-foreground/90 px-3 py-1 rounded transition-colors">
            <Save className="w-3 h-3" /> Snapshot
          </button>
        </div>
      </div>

      <p className="text-[10px] text-muted-foreground">
        Edits save to the preview as you type. Use Snapshot to record a named version in history.
      </p>

      <div className="space-y-3">
        <Field
          label="Headline"
          value={fields.headline}
          onChange={(v) => {
            const next = { ...fields, headline: v };
            setFields(next);
            pushToStorage(next);
          }}
          liveValue={liveHeadline}
          isOverridden={!!fields.headline}
        />
        <Field
          label="Subtitle"
          value={fields.subtitle}
          onChange={(v) => {
            const next = { ...fields, subtitle: v };
            setFields(next);
            pushToStorage(next);
          }}
          liveValue={liveSubtitle}
          isOverridden={!!fields.subtitle}
        />
        <Field
          label="CTA Button"
          value={fields.ctaText}
          onChange={(v) => {
            const next = { ...fields, ctaText: v };
            setFields(next);
            pushToStorage(next);
          }}
          liveValue={liveCta}
          isOverridden={!!fields.ctaText}
        />
        <Field
          label="Pricing Copy"
          value={fields.pricingCopy}
          onChange={(v) => {
            const next = { ...fields, pricingCopy: v };
            setFields(next);
            pushToStorage(next);
          }}
          liveValue={livePricing}
          isOverridden={!!fields.pricingCopy}
        />

        <div className="flex items-center justify-between py-2">
          <label className="text-xs font-medium text-foreground">Show Testimonials</label>
          <button
            type="button"
            onClick={() => {
              const next = { ...fields, showTestimonials: !fields.showTestimonials };
              setFields(next);
              pushToStorage(next);
            }}
            className={`w-9 h-5 rounded-full transition-colors ${fields.showTestimonials ? "bg-foreground" : "bg-secondary"}`}
          >
            <div className={`w-4 h-4 rounded-full bg-background shadow transition-transform ${fields.showTestimonials ? "translate-x-4.5" : "translate-x-0.5"}`} />
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, value, onChange, liveValue, isOverridden }: { label: string; value: string; onChange: (v: string) => void; liveValue: string; isOverridden: boolean }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">{label}</label>
        {isOverridden && (
          <span className="text-[9px] px-1.5 py-0.5 rounded bg-primary/10 text-primary font-medium">Custom</span>
        )}
      </div>
      <input
        value={value || liveValue}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-3 py-2 rounded-md border border-border bg-secondary/30 text-xs text-foreground outline-none focus:border-foreground/30 transition-colors"
      />
      {!isOverridden && (
        <p className="text-[9px] text-muted-foreground/50 mt-0.5 italic">Auto-generated · click to edit</p>
      )}
    </div>
  );
}
