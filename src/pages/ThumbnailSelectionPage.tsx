import { useNavigate } from "react-router-dom";
import { MVP_CLIP_CARDS, buildThumbnailDataUrl } from "@/lib/mvpClipThumbnail";
import { getVideoMvpProject, patchVideoMvpProject, ensureVideoMvpProjectId } from "@/lib/videoMvpProject";

export default function ThumbnailSelectionPage() {
  const navigate = useNavigate();

  const selectThumb = (card: (typeof MVP_CLIP_CARDS)[number]) => {
    const pid = ensureVideoMvpProjectId();
    if (!getVideoMvpProject(pid)?.selected_clip) {
      navigate("/clips");
      return;
    }
    patchVideoMvpProject(pid, {
      selected_thumbnail: {
        name: `${card.label} — ${card.thumbPhrase}`,
        preview_url: buildThumbnailDataUrl(card),
      },
    });
    navigate("/preview");
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="max-w-6xl mx-auto px-4 py-10">
        <h2>Alizé</h2>
        <p className="text-sm text-muted-foreground">Step 3 of 5</p>
        <h3 className="text-lg font-semibold mt-2">Pick a thumbnail</h3>
        <p className="text-sm text-muted-foreground mt-1">Choose the preview image for your post.</p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
          {MVP_CLIP_CARDS.map((card) => (
            <div key={card.label} className="border border-border rounded-xl p-4">
              <div className="rounded-lg border border-border overflow-hidden aspect-video mb-3 bg-muted">
                <img src={buildThumbnailDataUrl(card)} alt="" className="w-full h-full object-cover" />
              </div>
              <p className="font-medium text-sm">{card.thumbPhrase}</p>
              <p className="text-xs text-muted-foreground mt-1">{card.label}</p>
              <button
                type="button"
                onClick={() => selectThumb(card)}
                className="mt-3 rounded-full border border-border px-4 py-2 text-sm font-semibold"
              >
                Use this thumbnail
              </button>
            </div>
          ))}
        </div>

        <button type="button" className="mt-8 text-sm text-muted-foreground underline" onClick={() => navigate("/clips")}>
          Back to clips
        </button>
      </div>
    </div>
  );
}
