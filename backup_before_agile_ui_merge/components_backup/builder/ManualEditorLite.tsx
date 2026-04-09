import { useEffect, useMemo, useState } from "react";
import { RotateCcw, Save } from "lucide-react";
import { toast } from "sonner";
import { generateCopy } from "@/lib/copyGenerator";
import { addVersion, getMvpCustomizations, updateMvpCustomizations } from "@/lib/projectData";

export default function ManualEditorLite({ projectId }: { projectId: string }) {
  const idea = localStorage.getItem("alize_idea") || "My Product";
  const projectName = idea.split(" ").slice(0, 4).join(" ");
  const copy = useMemo(() => generateCopy(idea, projectName), [idea, projectName]);

  const [fields, setFields] = useState(() => getMvpCustomizations(projectId));

  useEffect(() => {
    setFields(getMvpCustomizations(projectId));
  }, [projectId]);

  const handleSave = () => {
    updateMvpCustomizations(fields, projectId);
    window.dispatchEvent(new Event("alize-mvp-updated"));
    addVersion("Manual edit: updated MVP fields", "Manual Editor", projectId);
    toast.success("MVP updated!");
  };

  const handleReset = () => {
    const reset = {
      headline: "",
      subtitle: "",
      ctaText: "",
      pricingCopy: "",
      showTestimonials: false,
    };
    setFields(reset);
    updateMvpCustomizations(reset, projectId);
    window.dispatchEvent(new Event("alize-mvp-updated"));
    toast.success("Reset to defaults");
  };

  const liveHeadline = fields.headline || copy.headline;
  const liveSubtitle = fields.subtitle || copy.subtitle;
  const liveCta = fields.ctaText || copy.cta;
  const livePricing = fields.pricingCopy || copy.pricingPlans.map((p) => `${p.name}: ${p.price}`).join(" · ");

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-foreground">Edit MVP</h3>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={handleReset}
            className="flex items-center gap-1.5 text-[10px] text-muted-foreground hover:text-foreground px-2 py-1 rounded border border-border hover:bg-secondary transition-colors"
          >
            <RotateCcw className="w-3 h-3" /> Reset
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="flex items-center gap-1.5 text-[10px] font-semibold text-background bg-foreground hover:bg-foreground/90 px-3 py-1 rounded transition-colors"
          >
            <Save className="w-3 h-3" /> Save
          </button>
        </div>
      </div>

      <p className="text-[10px] text-muted-foreground">
        Edit the real text shown on your MVP. Changes update the live preview on save.
      </p>

      <div className="space-y-3">
        <Field
          label="Headline"
          value={fields.headline}
          onChange={(v) => setFields({ ...fields, headline: v })}
          liveValue={liveHeadline}
          isOverridden={!!fields.headline}
        />
        <Field
          label="Subtitle"
          value={fields.subtitle}
          onChange={(v) => setFields({ ...fields, subtitle: v })}
          liveValue={liveSubtitle}
          isOverridden={!!fields.subtitle}
        />
        <Field
          label="CTA Button"
          value={fields.ctaText}
          onChange={(v) => setFields({ ...fields, ctaText: v })}
          liveValue={liveCta}
          isOverridden={!!fields.ctaText}
        />
        <Field
          label="Pricing Copy"
          value={fields.pricingCopy}
          onChange={(v) => setFields({ ...fields, pricingCopy: v })}
          liveValue={livePricing}
          isOverridden={!!fields.pricingCopy}
        />
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  liveValue,
  isOverridden,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  liveValue: string;
  isOverridden: boolean;
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
          {label}
        </label>
        {isOverridden && (
          <span className="text-[9px] px-1.5 py-0.5 rounded bg-primary/10 text-primary font-medium">
            Custom
          </span>
        )}
      </div>
      <input
        value={value || liveValue}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-3 py-2 rounded-md border border-border bg-secondary/30 text-xs text-foreground outline-none focus:border-foreground/30 transition-colors"
      />
      {!isOverridden && (
        <p className="text-[9px] text-muted-foreground/50 mt-0.5 italic">
          Auto-generated · click to edit
        </p>
      )}
    </div>
  );
}

