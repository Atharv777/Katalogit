/** A deterministic, clearly labelled finish for demos without image API credit.
 * It keeps every pixel of the source photo instead of inventing product details.
 */
export async function createStudioFallback(source: string, aspect: string): Promise<string> {
  const sizes: Record<string, [number, number]> = {
    "1:1": [1024, 1024],
    "2:3": [1024, 1536],
    "3:2": [1536, 1024],
    "4:5": [1024, 1280],
  };
  const [width, height] = sizes[aspect] ?? sizes["1:1"];
  const bitmap = await createImageBitmap(await (await fetch(source)).blob());
  try {
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("This browser cannot finish the product photo.");

    const gradient = ctx.createLinearGradient(0, 0, width, height);
    gradient.addColorStop(0, "#f7f4ee");
    gradient.addColorStop(1, "#e9e2d8");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    const margin = Math.round(Math.min(width, height) * 0.055);
    const maxWidth = width - margin * 2;
    const maxHeight = height - margin * 2;
    const scale = Math.min(maxWidth / bitmap.width, maxHeight / bitmap.height);
    const drawWidth = Math.round(bitmap.width * scale);
    const drawHeight = Math.round(bitmap.height * scale);
    const x = Math.round((width - drawWidth) / 2);
    const y = Math.round((height - drawHeight) / 2);

    ctx.shadowColor = "rgba(39, 29, 20, 0.18)";
    ctx.shadowBlur = Math.round(width * 0.035);
    ctx.shadowOffsetY = Math.round(height * 0.018);
    ctx.fillStyle = "#fff";
    ctx.fillRect(x, y, drawWidth, drawHeight);
    ctx.shadowColor = "transparent";
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;
    ctx.filter = "brightness(1.025) contrast(1.025)";
    ctx.drawImage(bitmap, x, y, drawWidth, drawHeight);
    ctx.filter = "none";
    return canvas.toDataURL("image/jpeg", 0.9);
  } finally {
    bitmap.close();
  }
}
