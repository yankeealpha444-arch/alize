export type VideoMetadata = {
  title: string | null;
  authorName: string | null;
  thumbnailUrl: string | null;
  providerName: string | null;
};

function isYouTubeUrl(url: string): boolean {
  return /\b(youtube\.com|youtu\.be)\b/i.test(url);
}

/**
 * Lightweight, no-key metadata for YouTube via oEmbed.
 * This makes hook generation feel grounded without full transcription.
 */
export async function fetchVideoMetadata(url: string): Promise<VideoMetadata> {
  const trimmed = url.trim();
  if (!trimmed) return { title: null, authorName: null, thumbnailUrl: null, providerName: null };
  if (!isYouTubeUrl(trimmed)) return { title: null, authorName: null, thumbnailUrl: null, providerName: null };

  const oembed = `https://www.youtube.com/oembed?format=json&url=${encodeURIComponent(trimmed)}`;
  try {
    const res = await fetch(oembed);
    if (!res.ok) return { title: null, authorName: null, thumbnailUrl: null, providerName: null };
    const data = (await res.json()) as {
      title?: string;
      author_name?: string;
      thumbnail_url?: string;
      provider_name?: string;
    };
    return {
      title: data.title ?? null,
      authorName: data.author_name ?? null,
      thumbnailUrl: data.thumbnail_url ?? null,
      providerName: data.provider_name ?? null,
    };
  } catch {
    return { title: null, authorName: null, thumbnailUrl: null, providerName: null };
  }
}

