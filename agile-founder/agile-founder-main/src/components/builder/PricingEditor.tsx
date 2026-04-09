interface PricingEditorProps {
  projectName: string;
}

export default function PricingEditor({ projectName }: PricingEditorProps) {
  return (
    <div className="text-foreground space-y-6 p-6">
      <div>
        <h2 className="text-lg font-semibold">Pricing for {projectName}</h2>
        <p className="text-xs text-muted-foreground mt-1">Test if users will pay · Pre-order or subscription</p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {[
          { name: "Free", price: "$0/mo", features: ["5 projects", "Basic analytics", "Community support"], cta: "Start Free" },
          { name: "Pro", price: "$29/mo", features: ["Unlimited projects", "Advanced analytics", "Priority support", "API access"], cta: "Pre-order Pro" },
        ].map((plan) => (
          <div key={plan.name} className="p-5 rounded-lg border border-border bg-card text-center">
            <p className="text-sm font-bold mb-1">{plan.name}</p>
            <p className="text-2xl font-bold mb-4">{plan.price}</p>
            <div className="space-y-1.5 mb-4">
              {plan.features.map((f) => (
                <p key={f} className="text-[11px] text-muted-foreground">✓ {f}</p>
              ))}
            </div>
            <button className="w-full py-2 text-xs rounded-md border border-border bg-secondary hover:bg-secondary/80 font-medium">{plan.cta}</button>
          </div>
        ))}
      </div>

      <div className="p-4 rounded-lg border border-border bg-card">
        <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-2">What We Track</p>
        <div className="grid grid-cols-2 gap-2">
          {["Pricing page views", "Plan selected", "Pre-order clicks", "Payment completed", "Plan comparison time", "Pricing abandonment"].map((m) => (
            <div key={m} className="flex items-center gap-2 text-xs">
              <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground/50" />
              <span className="text-muted-foreground">{m}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
