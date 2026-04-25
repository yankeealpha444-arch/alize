import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";

type ClipRow = {
  id: string;
  video_url: string | null;
  created_at: string | null;
};

function isPlayableUrl(url: string): boolean {
  const trimmed = url.trim();
  if (!trimmed) return false;
  if (!/^https?:\/\//i.test(trimmed)) return false;
  if (trimmed.includes("interactive-examples.mdn.mozilla.net")) return false;
  return true;
}

export default function ClipperCleanV2() {
  const [sourceUrl, setSourceUrl] = useState("");
  const [clips, setClips] = useState<ClipRow[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState("");

  const handleGenerate = async () => {
    const trimmed = sourceUrl.trim();
    if (!trimmed) {
      setMessage("No clips yet.");
      setClips([]);
      return;
    }

    setIsLoading(true);
    setMessage("");
    try {
      const { data, error } = await supabase
        .from("video_clips")
        .select("id, video_url, created_at")
        .not("video_url", "is", null)
        .order("created_at", { ascending: false })
        .limit(30);

      if (error) {
        setMessage("No clips yet.");
        setClips([]);
        return;
      }

      const playable = ((data ?? []) as ClipRow[]).filter((clip) => isPlayableUrl(String(clip.video_url ?? "")));
      const selected = playable.slice(0, 3);
      setClips(selected);
      if (selected.length === 0) {
        setMessage("No clips yet.");
      }
    } catch {
      setMessage("No clips yet.");
      setClips([]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="fixed right-3 top-3 z-50 rounded-md border border-foreground/30 bg-background px-2 py-1 text-xs font-semibold">
        CLIPPER CLEAN V2
      </div>

      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-bold tracking-tight">Alizé Clips</h1>

        <section className="mt-6 max-w-2xl rounded-xl border border-border/60 bg-card p-4">
          <label className="block text-sm font-medium">Video URL</label>
          <input
            type="url"
            value={sourceUrl}
            onChange={(e) => setSourceUrl(e.target.value)}
            placeholder="Paste video URL"
            className="mt-2 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
          />
          <button
            type="button"
            onClick={() => void handleGenerate()}
            disabled={isLoading}
            className="mt-3 inline-flex items-center rounded-md bg-foreground px-4 py-2 text-sm font-semibold text-background disabled:opacity-60"
          >
            {isLoading ? "Loading..." : "Generate Clips"}
          </button>
          {message ? <p className="mt-2 text-sm text-muted-foreground">{message}</p> : null}
        </section>

        <section className="mt-8">
          {clips.length === 0 ? (
            <p className="text-sm text-muted-foreground">No clips yet.</p>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {clips.map((clip, index) => {
                const url = String(clip.video_url ?? "").trim();
                return (
                  <article key={clip.id} className="rounded-xl border border-border/60 bg-card p-3">
                    <p className="text-sm font-semibold">{`Clip ${index + 1}`}</p>
                    <div className="mt-2 aspect-video overflow-hidden rounded-lg border border-border/60 bg-black">
                      <video controls src={url} className="h-full w-full object-cover" />
                    </div>
                    <div className="mt-3">
                      <a
                        href={clip.video_url ?? ""}
                        download={`alize-clip-${index + 1}.mp4`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center rounded-md border border-border px-3 py-1.5 text-xs font-medium hover:bg-secondary"
                      >
                        Download MP4 for YouTube
                      </a>
                      <p className="mt-1 text-xs text-muted-foreground">
                        MP4 format, ready to upload to YouTube Shorts, Reels or TikTok.
                      </p>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
