import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import {
  BarChart3,
  Users,
  Mail,
  MessageSquare,
  ClipboardList,
  Sparkles,
  ExternalLink,
  Share2,
} from "lucide-react";
import { getFounderLoopSnapshot } from "@/lib/founderLoopMetrics";
import { applyImproveMvpSuite } from "@/lib/improveMvpFlow";
import { saasPrimaryButtonClass, saasSecondaryButtonClass } from "@/lib/saasPreviewVisual";

/**
 * Read-only founder validation strip: real projectData + tracking, same semantics as Dashboard.
 */
export default function FounderLoopPreview({ projectId }: { projectId: string }) {
  const navigate = useNavigate();
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const bump = () => setTick((t) => t + 1);
    window.addEventListener("alize-project-data-updated", bump as EventListener);
    window.addEventListener("alize-tracking-updated", bump as EventListener);
    window.addEventListener("alize-mvp-updated", bump);
    window.addEventListener("storage", bump);
    return () => {
      window.removeEventListener("alize-project-data-updated", bump as EventListener);
      window.removeEventListener("alize-tracking-updated", bump as EventListener);
      window.removeEventListener("alize-mvp-updated", bump);
      window.removeEventListener("storage", bump);
    };
  }, []);

  const s = useMemo(() => getFounderLoopSnapshot(projectId), [projectId, tick]);

  const handleImprove = () => {
    applyImproveMvpSuite(projectId);
    toast.success("Review changes, then publish to make them live.");
    navigate(`/preview/${projectId}`);
  };

  const visitors = s.funnel[0]?.count ?? 1;

  return (
    <div className="mt-10 max-w-3xl mx-auto w-full">
      <p className="text-[10px] uppercase tracking-widest text-slate-400 mb-3 text-center">
        Your founder loop — live data
      </p>
      <div className="rounded-2xl border border-white/10 bg-slate-900/60 backdrop-blur-sm p-5 shadow-xl ring-1 ring-white/5">
        <div className="flex items-center flex-wrap gap-2 mb-4">
          <BarChart3 className="w-4 h-4 text-indigo-400 shrink-0" />
          <h3 className="text-sm font-bold text-white">Validation &amp; signals</h3>
          <span className="ml-auto text-xs font-semibold text-indigo-300 tabular-nums">
            PMF {s.pmfScore}/100
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
          <div className="rounded-xl border border-white/10 bg-slate-950/50 p-3 text-center">
            <Users className="w-3.5 h-3.5 mx-auto text-slate-400 mb-1" />
            <p className="text-lg font-bold text-white tabular-nums">{visitors}</p>
            <p className="text-[9px] text-slate-500">Visitors</p>
          </div>
          <div className="rounded-xl border border-white/10 bg-slate-950/50 p-3 text-center">
            <Mail className="w-3.5 h-3.5 mx-auto text-slate-400 mb-1" />
            <p className="text-lg font-bold text-white tabular-nums">{s.vm.emails}</p>
            <p className="text-[9px] text-slate-500">Emails</p>
          </div>
          <div className="rounded-xl border border-white/10 bg-slate-950/50 p-3 text-center">
            <MessageSquare className="w-3.5 h-3.5 mx-auto text-slate-400 mb-1" />
            <p className="text-lg font-bold text-white tabular-nums">{s.vm.feedback}</p>
            <p className="text-[9px] text-slate-500">Feedback</p>
          </div>
          <div className="rounded-xl border border-white/10 bg-slate-950/50 p-3 text-center">
            <ClipboardList className="w-3.5 h-3.5 mx-auto text-slate-400 mb-1" />
            <p className="text-lg font-bold text-white tabular-nums">{s.vm.surveys}</p>
            <p className="text-[9px] text-slate-500">Surveys</p>
          </div>
        </div>

        <div className="rounded-xl border border-white/10 bg-slate-950/60 p-3 mb-4">
          <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide mb-1">
            Next best action
          </p>
          <p className="text-xs text-slate-100 font-semibold">{s.nba.action}</p>
          <p className="text-[11px] text-slate-400 mt-1 leading-snug">{s.nba.detail}</p>
        </div>

        <div className="flex flex-wrap gap-2 justify-center">
          <button
            type="button"
            onClick={() => navigate(`/founder/${projectId}`)}
            className={`inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-semibold ${saasPrimaryButtonClass}`}
          >
            <ExternalLink className="w-3.5 h-3.5" />
            View Dashboard
          </button>
          {s.needsImprove && (
            <button
              type="button"
              onClick={handleImprove}
              className={`inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-semibold ${saasSecondaryButtonClass}`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              Improve MVP
            </button>
          )}
          {s.needsUsers && (
            <button
              type="button"
              onClick={() => navigate(`/get-users/${projectId}`)}
              className={`inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-semibold ${saasSecondaryButtonClass}`}
            >
              <Share2 className="w-3.5 h-3.5" />
              Get Users
            </button>
          )}
          <button
            type="button"
            onClick={() => {
              navigator.clipboard.writeText(s.shareUrl);
              toast.success("Share link copied");
            }}
            className={`inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-semibold ${saasSecondaryButtonClass}`}
          >
            Copy share link
          </button>
        </div>
      </div>
    </div>
  );
}
