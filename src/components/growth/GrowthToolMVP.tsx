import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import {
  addEmailCapture,
  getGrowthState,
  saveGrowthState,
  type GrowthProductState,
} from "@/lib/projectData";
import { trackEvent } from "@/lib/trackingEvents";
import { downloadTextFile, generateHookOptions, type HookOption } from "@/lib/hookExtractor";

type GrowthToolMVPProps = {
  projectId: string;
  idea: string;
  headline: string;
  subtitle: string;
  embedded?: boolean;
};

export default function GrowthToolMVP({ projectId, idea, headline, subtitle, embedded }: GrowthToolMVPProps) {
  const [state, setState] = useState<GrowthProductState>(() => getGrowthState(projectId));
  const [saveOpen, setSaveOpen] = useState(false);
  const [emailInput, setEmailInput] = useState("");
  const [metaLoading, setMetaLoading] = useState(false);
  const lastTrackedLinkRef = useRef<string>("");

  void embedded;
  void headline;
  void subtitle;

  useEffect(() => {
    setState(getGrowthState(projectId));
  }, [projectId]);

  const platformLabel = useMemo(() => {
    if (state.platform === "youtube") return "YouTube";
    if (state.platform === "instagram") return "Instagram";
    if (state.platform === "tiktok") return "TikTok";
    return "Your platform";
  }, [state.platform]);

  const persist = (next: GrowthProductState) => {
    setState(next);
    saveGrowthState(next, projectId);
  };

  const updateField = <K extends keyof GrowthProductState>(key: K, value: GrowthProductState[K]) => {
    persist({ ...state, [key]: value });
  };
  const hooks = state.hookOptions ?? [];
  const selectedHook = hooks.find((h) => h.id === state.selectedHookId) ?? null;

  const handleFileUpload = (file: File | null) => {
    if (!file) return;
    persist({
      ...state,
      uploadType: "file",
      uploadedFileName: file.name,
      videoLink: "",
    });
    trackEvent("video_uploaded", projectId, file.name);
    toast.success(`Video selected: ${file.name}`);
  };
  void handleFileUpload;

  const handleGenerate = () => {
    if (state.uploadType === "link" && !state.videoLink?.trim()) {
      toast.error("Paste a video link or switch to file upload.");
      return;
    }
    if (state.uploadType === "file" && !state.uploadedFileName?.trim()) {
      toast.error("Upload a video first.");
      return;
    }

    const source = state.uploadType === "file" ? state.uploadedFileName || "uploaded video" : state.videoLink || "video link";
    const out = generateHookOptions(source, state.videoTitle || idea);
    const next: GrowthProductState = {
      ...state,
      hookOptions: out,
      selectedHookId: out[0]?.id ?? null,
      lastGeneratedAt: new Date().toISOString(),
    };
    persist(next);
    trackEvent("hooks_generated", projectId, source);
    toast.success("Best hook options generated.");
  };

  const handleHookSelect = (hook: HookOption) => {
    persist({ ...state, selectedHookId: hook.id });
    trackEvent("hook_selected", projectId, hook.id);
  };
  void handleHookSelect;

  const handleCopySelected = async () => {
    if (!selectedHook) return;
    await navigator.clipboard.writeText(selectedHook.hookLine);
    trackEvent("hook_copied", projectId, selectedHook.id);
    toast.success("Hook line copied.");
  };
  void handleCopySelected;

  const handleDownloadSelected = () => {
    if (!selectedHook) return;
    const project = idea.split(" ").slice(0, 5).join(" ");
    const src =
      state.uploadType === "file"
        ? `Uploaded file: ${state.uploadedFileName || "(unknown)"}`
        : `Video link: ${state.videoLink || "(none)"}`;
    const goal =
      state.goal === "views"
        ? "More views"
        : state.goal === "subscribers"
          ? "More followers/subscribers"
          : state.goal === "engagement"
            ? "Better engagement"
            : "Monetization";
    const metaLine = state.videoTitle ? `Video title: ${state.videoTitle}${state.videoAuthor ? ` (by ${state.videoAuthor})` : ""}` : "";
    const text = [
      `Project: ${project || projectId}`,
      `Platform: ${platformLabel}`,
      `Goal: ${goal}`,
      `Video source: ${src}`,
      metaLine,
      `Selected timestamp: ${selectedHook.startSec}s-${selectedHook.endSec}s`,
      ``,
      `Hook style: ${selectedHook.style}`,
      `Hook line: ${selectedHook.hookLine}`,
      `Why it works: ${selectedHook.whyItWorks}`,
    ]
      .filter(Boolean)
      .join("\n");
    downloadTextFile(`hook-summary-${projectId}.txt`, text);
    trackEvent("hook_summary_downloaded", projectId, selectedHook.id);
    toast.success("Hook summary downloaded.");
  };
  void handleDownloadSelected;

  const openSave = () => {
    trackEvent("save_clicked", projectId, selectedHook?.id || "no_selection");
    setSaveOpen(true);
  };
  void openSave;

  const submitSave = () => {
    if (!emailInput.trim() || !emailInput.includes("@")) {
      toast.error("Enter a valid email to save.");
      return;
    }
    addEmailCapture(emailInput.trim(), projectId);
    trackEvent("email_entered", projectId, emailInput.trim());
    toast.success("Saved. You can come back to this plan anytime.");
    setSaveOpen(false);
    setEmailInput("");
  };
  void submitSave;

  void saveOpen;
  void setSaveOpen;
  void emailInput;
  void setEmailInput;
  void metaLoading;
  void setMetaLoading;
  void lastTrackedLinkRef;

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Tool MVP Temporary</h1>
        <p className="text-sm text-muted-foreground">
          This is a temporary replacement for the incorrect hook generator UI.
        </p>
      </div>

      <div className="rounded-2xl border p-4 space-y-4">
        <div className="space-y-2">
          <label className="text-sm font-medium" htmlFor={`growth-in-${projectId}`}>
            Video title or idea
          </label>
          <input
            id={`growth-in-${projectId}`}
            className="w-full rounded-lg border px-3 py-2"
            value={state.videoTitle ?? ""}
            onChange={(e) => updateField("videoTitle", e.target.value)}
            placeholder="Short title for hook extraction"
          />
        </div>

        <button type="button" className="rounded-lg bg-black text-white px-4 py-2" onClick={() => handleGenerate()}>
          Calculate hook options
        </button>

        <div className="rounded-xl border p-4 space-y-2">
          <p className="text-sm font-medium">Results</p>
          {hooks.length > 0 ? (
            <ul className="text-sm space-y-2 list-disc pl-5">
              {hooks.map((h) => (
                <li key={h.id}>{h.hookLine}</li>
              ))}
            </ul>
          ) : null}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-xl border p-3">
          <p className="text-xs text-muted-foreground">Uses</p>
          <p className="text-lg font-semibold">0</p>
        </div>
        <div className="rounded-xl border p-3">
          <p className="text-xs text-muted-foreground">Actions</p>
          <p className="text-lg font-semibold">0</p>
        </div>
        <div className="rounded-xl border p-3">
          <p className="text-xs text-muted-foreground">Saves</p>
          <p className="text-lg font-semibold">0</p>
        </div>
      </div>
    </div>
  );
}
