import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

function parseYoutubeVideoId(url: string): string | null {
  try {
    const u = new URL(url);
    const host = u.hostname.toLowerCase();
    if (host.includes("youtu.be")) {
      return u.pathname.split("/").filter(Boolean)[0] ?? null;
    }
    if (host.includes("youtube.com")) {
      const v = u.searchParams.get("v");
      if (v) return v;
      const parts = u.pathname.split("/").filter(Boolean);
      const shortsIdx = parts.indexOf("shorts");
      if (shortsIdx >= 0 && parts[shortsIdx + 1]) return parts[shortsIdx + 1];
      const embedIdx = parts.indexOf("embed");
      if (embedIdx >= 0 && parts[embedIdx + 1]) return parts[embedIdx + 1];
    }
  } catch {
    // ignore malformed URLs
  }
  return null;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { status: 200 });
  }

  const { videoUrl } = await req.json();

  if (!videoUrl) {
    return new Response(JSON.stringify({ error: "videoUrl required" }), { status: 400 });
  }

  const cloudinaryUrl = Deno.env.get("CLOUDINARY_URL");

  if (!cloudinaryUrl) {
    return new Response(JSON.stringify({ error: "Missing CLOUDINARY_URL" }), { status: 500 });
  }

  const cloudName = cloudinaryUrl.split("@")[1];

  const transforms = {
    shock: "c_fill,g_face,w_720,h_405,zoom:1.6,e_contrast:100,e_saturation:100,e_sharpen:200",
    warning: "c_fill,g_face,w_720,h_405,zoom:1.4,e_brightness:-50,e_contrast:80,e_vignette:90",
    results: "c_fill,g_auto:faces,w_720,h_405,zoom:1.2,e_brightness:80,e_contrast:40,e_saturation:40",
  } as const;

  const isMp4 = /\.mp4(\?|$)/i.test(videoUrl);

  function imageFetch(transform: string, sourceImageUrl: string) {
    return `https://res.cloudinary.com/${cloudName}/image/fetch/${transform}/${encodeURIComponent(sourceImageUrl)}`;
  }

  let output: Array<{ id: "shock" | "warning" | "results"; imageUrl: string }>;

  if (isMp4) {
    // 1) Extract frame from uploaded mp4 via video/upload
    const extractedFrameUrl =
      `https://res.cloudinary.com/${cloudName}/video/upload/so_1/${encodeURIComponent(videoUrl)}.jpg`;

    // 2) Apply existing variant transforms on the extracted frame
    output = [
      { id: "shock", imageUrl: imageFetch(transforms.shock, extractedFrameUrl) },
      { id: "warning", imageUrl: imageFetch(transforms.warning, extractedFrameUrl) },
      { id: "results", imageUrl: imageFetch(transforms.results, extractedFrameUrl) },
    ];
  } else {
    // Keep existing image/fetch logic for YouTube source
    const ytId = parseYoutubeVideoId(videoUrl);
    const sourceImageUrl = ytId
      ? `https://i.ytimg.com/vi/${ytId}/hqdefault.jpg`
      : videoUrl;

    output = [
      { id: "shock", imageUrl: imageFetch(transforms.shock, sourceImageUrl) },
      { id: "warning", imageUrl: imageFetch(transforms.warning, sourceImageUrl) },
      { id: "results", imageUrl: imageFetch(transforms.results, sourceImageUrl) },
    ];
  }

  console.log("THUMB OUTPUT", output);

  return new Response(JSON.stringify(output), {
    headers: { "Content-Type": "application/json" },
  });
});
