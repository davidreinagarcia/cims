/** @file QR codes for door stickers: link in, navy SVG or PNG out (no network, works offline). */
import qrcode from "qrcode-generator";

/** Navy from the site tokens, so stickers match the brand. */
const INK = "#003057";

/** The QR of `text` as a standalone SVG string (quiet zone included, error correction Q so scuffed stickers still scan). */
export function qrSvg(text: string, size = 320): string {
  const qr = qrcode(0, "Q");
  qr.addData(text);
  qr.make();
  const n = qr.getModuleCount();
  const quiet = 4;
  let path = "";
  for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (qr.isDark(r, c)) path += `M${c + quiet} ${r + quiet}h1v1h-1z`;
  const box = n + quiet * 2;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${box} ${box}" shape-rendering="crispEdges"><rect width="${box}" height="${box}" fill="#fff"/><path d="${path}" fill="${INK}"/></svg>`;
}

/** The same QR rendered as a PNG blob (for printers and chat apps that dislike SVG). */
export async function qrPng(text: string, size = 1024): Promise<Blob> {
  const url = URL.createObjectURL(new Blob([qrSvg(text, size)], { type: "image/svg+xml" }));
  try {
    const img = new Image();
    await new Promise<void>((ok, fail) => { img.onload = () => ok(); img.onerror = () => fail(new Error("QR render failed")); img.src = url; });
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = size;
    canvas.getContext("2d")!.drawImage(img, 0, 0, size, size);
    return await new Promise<Blob>((ok, fail) => canvas.toBlob((b) => (b ? ok(b) : fail(new Error("QR render failed"))), "image/png"));
  } finally { URL.revokeObjectURL(url); }
}
