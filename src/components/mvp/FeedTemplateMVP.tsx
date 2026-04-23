import { useEffect, useState } from "react";
import type { MvpBuilderConfig } from "@/lib/mvp/types";
import { trackMvpEvent, countMvpEventsByType } from "@/lib/mvp/mvpEventTracking";

type Props = { projectId: string; config: MvpBuilderConfig };

const MOCK = [
  { id: "1", title: "Item A", body: "Tap to inspect — mock feed tile." },
  { id: "2", title: "Item B", body: "Another discoverable entry." },
  { id: "3", title: "Item C", body: "Compare behaviour in-app." },
  { id: "4", title: "Item D", body: "Scroll and click cards." },
];

/** FEED_TEMPLATE — fixed layout: header, grid, cards, optional detail. */
export default function FeedTemplateMVP({ projectId, config }: Props) {
  const [selected, setSelected] = useState<string | null>(null);
  const [, setBump] = useState(0);

  useEffect(() => {
    trackMvpEvent("page_view", projectId, { template: "FEED_TEMPLATE" });
  }, [projectId]);

  useEffect(() => {
    const fn = () => setBump((n) => n + 1);
    window.addEventListener("alize-mvp-tracking-updated", fn);
    return () => window.removeEventListener("alize-mvp-tracking-updated", fn);
  }, []);

  const counts = countMvpEventsByType(projectId);

  const pick = (id: string) => {
    setSelected(id);
    trackMvpEvent("card_clicked", projectId, { cardId: id });
    setBump((n) => n + 1);
  };

  const item = MOCK.find((m) => m.id === selected);

  return (
    <div className="flex flex-col gap-6 max-w-3xl mx-auto w-full">
      <header className="border-b border-border pb-3">
        <h1 className="text-lg font-bold text-foreground">{config.productName}</h1>
        <p className="text-xs text-muted-foreground">Feed · browse and open items</p>
      </header>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {MOCK.map((m) => (
          <button
            key={m.id}
            type="button"
            onClick={() => pick(m.id)}
            className={`text-left rounded-xl border-2 p-4 transition-colors ${
              selected === m.id ? "border-foreground bg-secondary" : "border-border bg-card hover:bg-secondary/50"
            }`}
          >
            <p className="text-sm font-semibold text-foreground">{m.title}</p>
            <p className="text-xs text-muted-foreground mt-1">{m.body}</p>
          </button>
        ))}
      </div>

      <section className="rounded-xl border border-border bg-card p-4 min-h-[100px]">
        <p className="text-xs font-medium text-muted-foreground mb-2">Detail</p>
        {item ? (
          <p className="text-sm text-foreground">
            <span className="font-medium">{item.title}</span> — opened in-app. (Mock detail panel.)
          </p>
        ) : (
          <p className="text-xs text-muted-foreground">Select a card.</p>
        )}
      </section>

      <footer className="flex flex-wrap gap-4 text-[10px] text-muted-foreground border-t border-border pt-3">
        <span>Views: {counts.page_view}</span>
        <span>Clicks: {counts.card_clicked}</span>
        <span>Actions: {counts.button_clicked}</span>
      </footer>
    </div>
  );
}
