import React, { useEffect, useState } from "react";
import { Heart, ShoppingBag } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { addEmailCapture } from "@/lib/projectData";
import { trackEvent } from "@/lib/trackingEvents";
import {
  generateMarketplaceItems,
  hydrateMarketplaceImages,
  type MarketplaceItem,
} from "@/lib/generateMarketplaceItems";
import { saasNavClass, saasPrimaryButtonClass, saasSecondaryButtonClass, saasShellClass } from "@/lib/saasPreviewVisual";

type MarketplaceMVPProps = {
  projectId: string;
  idea: string;
  headline: string;
  subtitle: string;
  /** Builder preview: already wrapped in shell */
  embedded?: boolean;
};

export default function MarketplaceMVP({ projectId, idea, headline, subtitle, embedded }: MarketplaceMVPProps) {
  const [items, setItems] = useState<MarketplaceItem[]>(() => generateMarketplaceItems(idea));
  const [detail, setDetail] = useState<MarketplaceItem | null>(null);
  const [saveOpen, setSaveOpen] = useState(false);
  const [emailInput, setEmailInput] = useState("");

  useEffect(() => {
    setItems(generateMarketplaceItems(idea));
  }, [idea]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const base = generateMarketplaceItems(idea);
      const hydrated = await hydrateMarketplaceImages(idea, base);
      if (!cancelled) setItems(hydrated);
    })();
    return () => {
      cancelled = true;
    };
  }, [idea]);

  const openDetail = (item: MarketplaceItem) => {
    trackEvent("item_clicked", projectId, item.id);
    setDetail(item);
    trackEvent("item_viewed", projectId, item.id);
  };

  const handleBuy = (item: MarketplaceItem) => {
    trackEvent("buy_clicked", projectId, item.id);
    toast.success("Thanks — this is a demo checkout. No charge was made.");
  };

  const handleSaveClick = () => {
    trackEvent("save_clicked", projectId, detail?.id ?? "unknown");
    setSaveOpen(true);
  };

  const submitSaveEmail = () => {
    if (!emailInput.trim() || !emailInput.includes("@")) {
      toast.error("Enter a valid email to save.");
      return;
    }
    addEmailCapture(emailInput.trim(), projectId);
    trackEvent("email_entered", projectId, emailInput.trim());
    toast.success("Saved to your list — we’ll email you with updates.");
    setSaveOpen(false);
    setEmailInput("");
    setDetail(null);
  };

  const shell = embedded ? "" : saasShellClass;

  return (
    <div className={`text-foreground min-h-0 ${shell} [&_.text-muted-foreground]:text-slate-400/90`}>
      <div className={`flex items-center justify-between px-6 py-3.5 sticky top-0 z-20 ${saasNavClass}`}>
        <span className="text-sm font-bold tracking-tight text-white truncate max-w-[50%]">
          {idea.split(" ").slice(0, 5).join(" ") || "Shop"}
        </span>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => document.getElementById("mp-grid")?.scrollIntoView({ behavior: "smooth" })}
            className="text-xs text-muted-foreground hover:text-white transition-colors"
          >
            Browse
          </button>
          <button type="button" onClick={handleSaveClick} className={`text-xs px-3 py-1.5 rounded-lg ${saasSecondaryButtonClass}`}>
            Saved
          </button>
        </div>
      </div>

      <div className="px-6 md:px-8 pt-10 pb-6 max-w-5xl mx-auto">
        <p className="text-[10px] uppercase tracking-widest text-indigo-300/90 mb-2">Marketplace</p>
        <h1 className="text-3xl md:text-4xl font-bold text-white mb-3 leading-tight">{headline}</h1>
        <p className="text-sm text-muted-foreground max-w-2xl mb-8">{subtitle}</p>
      </div>

      <div id="mp-grid" className="px-6 md:px-8 pb-16 max-w-6xl mx-auto">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-5">
          {items.map((item) => (
            <article
              key={item.id}
              className="rounded-2xl border border-white/10 bg-slate-900/50 overflow-hidden shadow-xl shadow-black/20 backdrop-blur-sm flex flex-col"
            >
              <button
                type="button"
                onClick={() => openDetail(item)}
                className="text-left block w-full focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
              >
                <div className="aspect-square overflow-hidden bg-slate-800/80">
                  <img src={item.image} alt="" className="w-full h-full object-cover transition-transform hover:scale-[1.03]" />
                </div>
                <div className="p-3 flex flex-col flex-1">
                  <h2 className="text-sm font-semibold text-white line-clamp-2 mb-1">{item.title}</h2>
                  <p className="text-xs text-muted-foreground line-clamp-2 mb-2 flex-1">{item.description}</p>
                  <p className="text-sm font-bold text-indigo-300">{item.price}</p>
                </div>
              </button>
              <div className="px-3 pb-3">
                <button
                  type="button"
                  onClick={() => openDetail(item)}
                  className={`w-full py-2 rounded-xl text-xs font-semibold ${saasPrimaryButtonClass}`}
                >
                  View Item
                </button>
              </div>
            </article>
          ))}
        </div>
      </div>

      <Dialog open={!!detail} onOpenChange={(o) => !o && setDetail(null)}>
        <DialogContent className="max-w-lg bg-slate-950 border-white/10 text-foreground sm:max-w-[480px]">
          {detail && (
            <>
              <DialogHeader>
                <DialogTitle className="text-xl text-white pr-6">{detail.title}</DialogTitle>
                <DialogDescription className="text-muted-foreground">{detail.description}</DialogDescription>
              </DialogHeader>
              <div className="rounded-xl overflow-hidden border border-white/10 aspect-square max-h-[320px] bg-slate-900">
                <img src={detail.image} alt="" className="w-full h-full object-cover" />
              </div>
              <p className="text-2xl font-bold text-white">{detail.price}</p>
              <DialogFooter className="flex-col sm:flex-row gap-2">
                <button
                  type="button"
                  onClick={() => handleBuy(detail)}
                  className={`w-full sm:flex-1 py-3 rounded-xl text-sm font-semibold inline-flex items-center justify-center gap-2 ${saasPrimaryButtonClass}`}
                >
                  <ShoppingBag className="h-4 w-4" />
                  Buy Now
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setDetail(null);
                    handleSaveClick();
                  }}
                  className={`w-full sm:flex-1 py-3 rounded-xl text-sm font-semibold inline-flex items-center justify-center gap-2 ${saasSecondaryButtonClass}`}
                >
                  <Heart className="h-4 w-4" />
                  Save
                </button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={saveOpen} onOpenChange={setSaveOpen}>
        <DialogContent className="bg-slate-950 border-white/10 text-foreground">
          <DialogHeader>
            <DialogTitle className="text-white">Save items</DialogTitle>
            <DialogDescription>
              Create a free account with your email to save favorites and get restock alerts (demo).
            </DialogDescription>
          </DialogHeader>
          <input
            type="email"
            value={emailInput}
            onChange={(e) => setEmailInput(e.target.value)}
            placeholder="you@email.com"
            className="w-full px-4 py-3 rounded-lg border border-white/15 bg-slate-900 text-sm text-white"
          />
          <DialogFooter>
            <button type="button" onClick={submitSaveEmail} className={`w-full py-3 rounded-xl text-sm font-semibold ${saasPrimaryButtonClass}`}>
              Create account &amp; save
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
