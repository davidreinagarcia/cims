/** @file Shrinks a picked photo to a small JPEG data URL, shared by the maintenance and police report forms. */

const PHOTO_MAX_PX = 800;

/** Shrinks a photo (longest side `maxPx`, default 800) to a small JPEG data URL so it is cheap to store and send; rejects when the file is not an image. */
export async function photoToDataUrl(file: File, maxPx = PHOTO_MAX_PX): Promise<string> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxPx / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  const context = canvas.getContext("2d");
  if (!context) throw new Error("no canvas");
  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL("image/jpeg", 0.7);
}
