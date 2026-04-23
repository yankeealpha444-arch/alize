type GoogleTokenResponse = {
  access_token: string;
  error?: string;
  error_description?: string;
};

type GoogleTokenClient = {
  requestAccessToken: (opts?: { prompt?: string }) => void;
};

declare global {
  interface Window {
    google?: {
      accounts?: {
        oauth2?: {
          initTokenClient: (opts: {
            client_id: string;
            scope: string;
            callback: (response: GoogleTokenResponse) => void;
            error_callback?: (err: unknown) => void;
          }) => GoogleTokenClient;
        };
      };
    };
  }
}

export type YoutubeConnection = {
  accessToken: string;
  channelId: string;
};

export type YoutubeGrowthImpact = {
  channel: {
    viewCount: number;
    subscriberCount: number;
    videoCount: number;
  };
  baseline: {
    avgViews: number;
    avgEngagement: number;
  };
  current: {
    avgViews: number;
    avgEngagement: number;
  };
  growth: {
    viewsGrowthPct: number;
    engagementGrowthPct: number;
  };
  latestVideos: Array<{
    id: string;
    title: string;
    description: string;
    views: number;
    likes: number;
    comments: number;
  }>;
};

const GOOGLE_SCOPE = "https://www.googleapis.com/auth/youtube.readonly";

async function ensureGoogleScriptLoaded(): Promise<void> {
  if (typeof window === "undefined") return;
  if (window.google?.accounts?.oauth2) return;
  await new Promise<void>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>('script[data-google-gsi="1"]');
    if (existing) {
      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener("error", () => reject(new Error("Failed to load Google Identity script")), { once: true });
      return;
    }
    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    script.dataset.googleGsi = "1";
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Failed to load Google Identity script"));
    document.head.appendChild(script);
  });
}

async function ytGet<T>(accessToken: string, endpoint: string, params: Record<string, string>): Promise<T> {
  const url = new URL(`https://www.googleapis.com/youtube/v3/${endpoint}`);
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  const res = await fetch(url.toString(), {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`YouTube API failed (${res.status}): ${text}`);
  }
  return (await res.json()) as T;
}

export async function connectYoutubeReadonly(clientId: string): Promise<YoutubeConnection> {
  if (!clientId) throw new Error("Missing Google OAuth client id (VITE_GOOGLE_CLIENT_ID)");
  await ensureGoogleScriptLoaded();
  const oauth = window.google?.accounts?.oauth2;
  if (!oauth) throw new Error("Google OAuth client is unavailable");

  const token = await new Promise<string>((resolve, reject) => {
    const client = oauth.initTokenClient({
      client_id: clientId,
      scope: GOOGLE_SCOPE,
      callback: (response) => {
        if (!response.access_token) {
          reject(new Error(response.error_description || response.error || "Google login failed"));
          return;
        }
        resolve(response.access_token);
      },
      error_callback: () => reject(new Error("Google login cancelled or failed")),
    });
    client.requestAccessToken({ prompt: "consent" });
  });

  const channelRes = await ytGet<{
    items?: Array<{
      id?: string;
    }>;
  }>(token, "channels", {
    part: "id",
    mine: "true",
  });
  const channelId = channelRes.items?.[0]?.id;
  if (!channelId) throw new Error("Could not resolve YouTube channel");
  return { accessToken: token, channelId };
}

export async function fetchYoutubeGrowthImpact(accessToken: string): Promise<YoutubeGrowthImpact> {
  const channelRes = await ytGet<{
    items?: Array<{
      statistics?: {
        viewCount?: string;
        subscriberCount?: string;
        videoCount?: string;
      };
    }>;
  }>(accessToken, "channels", {
    part: "statistics",
    mine: "true",
  });
  const stats = channelRes.items?.[0]?.statistics ?? {};
  const channel = {
    viewCount: Number(stats.viewCount ?? 0),
    subscriberCount: Number(stats.subscriberCount ?? 0),
    videoCount: Number(stats.videoCount ?? 0),
  };

  const searchRes = await ytGet<{
    items?: Array<{
      id?: { videoId?: string };
      snippet?: {
        title?: string;
        description?: string;
      };
    }>;
  }>(accessToken, "search", {
    part: "snippet",
    order: "date",
    maxResults: "6",
    type: "video",
    mine: "true",
  });
  const newestVideoIds = (searchRes.items ?? [])
    .map((i) => i.id?.videoId)
    .filter((v): v is string => typeof v === "string" && v.length > 0);
  if (newestVideoIds.length < 2) {
    return {
      channel,
      baseline: { avgViews: 0, avgEngagement: 0 },
      current: { avgViews: 0, avgEngagement: 0 },
      growth: { viewsGrowthPct: 0, engagementGrowthPct: 0 },
      latestVideos: [],
    };
  }

  const snippetsById = new Map(
    (searchRes.items ?? [])
      .map((i) => ({
        id: i.id?.videoId ?? "",
        title: i.snippet?.title ?? "",
        description: i.snippet?.description ?? "",
      }))
      .filter((x) => x.id),
  );

  const videosRes = await ytGet<{
    items?: Array<{
      id?: string;
      snippet?: {
        title?: string;
        description?: string;
      };
      statistics?: {
        viewCount?: string;
        likeCount?: string;
        commentCount?: string;
      };
    }>;
  }>(accessToken, "videos", {
    part: "statistics",
    id: newestVideoIds.join(","),
  });
  const byId = new Map(
    (videosRes.items ?? []).map((v) => [
      String(v.id ?? ""),
      {
        title: String(v.snippet?.title ?? snippetsById.get(String(v.id ?? ""))?.title ?? ""),
        description: String(v.snippet?.description ?? snippetsById.get(String(v.id ?? ""))?.description ?? ""),
        views: Number(v.statistics?.viewCount ?? 0),
        likes: Number(v.statistics?.likeCount ?? 0),
        comments: Number(v.statistics?.commentCount ?? 0),
      },
    ]),
  );

  // Order old -> new so baseline=first half (older), current=second half (latest).
  const oldToNew = [...newestVideoIds].reverse();
  const rows = oldToNew
    .map((id) => byId.get(id))
    .filter((v): v is { title: string; description: string; views: number; likes: number; comments: number } => !!v);
  const split = Math.floor(rows.length / 2);
  const baselineRows = rows.slice(0, split);
  const currentRows = rows.slice(split);

  const avg = (vals: number[]) => (vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 0);
  const baseline = {
    avgViews: avg(baselineRows.map((r) => r.views)),
    avgEngagement: avg(baselineRows.map((r) => r.likes + r.comments)),
  };
  const current = {
    avgViews: avg(currentRows.map((r) => r.views)),
    avgEngagement: avg(currentRows.map((r) => r.likes + r.comments)),
  };

  const growth = {
    viewsGrowthPct: baseline.avgViews > 0 ? ((current.avgViews - baseline.avgViews) / baseline.avgViews) * 100 : 0,
    engagementGrowthPct:
      baseline.avgEngagement > 0
        ? ((current.avgEngagement - baseline.avgEngagement) / baseline.avgEngagement) * 100
        : 0,
  };

  const latestVideos = newestVideoIds
    .map((id) => {
      const v = byId.get(id);
      if (!v) return null;
      return {
        id,
        title: v.title,
        description: v.description,
        views: v.views,
        likes: v.likes,
        comments: v.comments,
      };
    })
    .filter((v): v is { id: string; title: string; description: string; views: number; likes: number; comments: number } => !!v);

  return { channel, baseline, current, growth, latestVideos };
}
