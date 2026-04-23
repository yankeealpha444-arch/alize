/**
 * Cheap luma histogram difference between two image data URLs (0 = identical, 1 = very different).
 * Used to reject near-duplicate thumbnail frames.
 */
export async function lumaDifference01(a: string, b: string): Promise<number> {
  const w = 36;
  const h = 20;
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) return 1;

  const IMAGE_LOAD_MS = 8_000;

  const load = (url: string) =>
    new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      const t = window.setTimeout(() => reject(new Error("img-load-timeout")), IMAGE_LOAD_MS);
      img.onload = () => {
        window.clearTimeout(t);
        resolve(img);
      };
      img.onerror = () => {
        window.clearTimeout(t);
        reject(new Error("img"));
      };
      img.src = url;
    });

  let imgA: HTMLImageElement;
  let imgB: HTMLImageElement;
  try {
    [imgA, imgB] = await Promise.all([load(a), load(b)]);
  } catch {
    return 1;
  }

  ctx.drawImage(imgA, 0, 0, w, h);
  const d1 = ctx.getImageData(0, 0, w, h).data;
  ctx.drawImage(imgB, 0, 0, w, h);
  const d2 = ctx.getImageData(0, 0, w, h).data;

  let sum = 0;
  const n = w * h;
  for (let i = 0; i < d1.length; i += 4) {
    const l1 = 0.299 * d1[i] + 0.587 * d1[i + 1] + 0.114 * d1[i + 2];
    const l2 = 0.299 * d2[i] + 0.587 * d2[i + 1] + 0.114 * d2[i + 2];
    sum += Math.abs(l1 - l2);
  }
  return sum / (n * 255);
}

/** If true, two frames are too similar to show as separate options. */
export async function framesTooSimilar(a: string, b: string): Promise<boolean> {
  const d = await lumaDifference01(a, b);
  return d < 0.045;
}
