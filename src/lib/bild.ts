/** Browser-only: Bilder verkleinern und als JPEG komprimieren (Canvas). */
import { analysiereFarbe, ANALYSE_KANTE, type FarbAnalyse } from './farbe';

export const FOTO_MAX_KANTE = 800;
export const THUMB_MAX_KANTE = 240;
export const JPEG_QUALITAET = 0.8;

async function ladeBild(datei: Blob): Promise<CanvasImageSource & { width: number; height: number }> {
  if ('createImageBitmap' in window) {
    try {
      // imageOrientation berücksichtigt EXIF-Drehung von Handyfotos
      return await createImageBitmap(datei, { imageOrientation: 'from-image' });
    } catch {
      /* Fallback unten */
    }
  }
  const url = URL.createObjectURL(datei);
  try {
    const img = new Image();
    img.decoding = 'async';
    img.src = url;
    await img.decode();
    return img;
  } finally {
    URL.revokeObjectURL(url);
  }
}

function zuBlob(quelle: CanvasImageSource & { width: number; height: number }, maxKante: number, qualitaet: number) {
  const faktor = Math.min(1, maxKante / Math.max(quelle.width, quelle.height));
  const w = Math.max(1, Math.round(quelle.width * faktor));
  const h = Math.max(1, Math.round(quelle.height * faktor));
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas wird nicht unterstützt');
  ctx.fillStyle = '#fff'; // transparente PNGs bekommen weißen Hintergrund
  ctx.fillRect(0, 0, w, h);
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(quelle, 0, 0, w, h);
  return new Promise<Blob>((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Bild konnte nicht komprimiert werden'))), 'image/jpeg', qualitaet),
  );
}

/** Farbanalyse: Foto auf 64 px verkleinern und die Pixel auswerten (siehe lib/farbe.ts). */
export async function farbeAusBild(datei: Blob): Promise<FarbAnalyse | null> {
  const bild = await ladeBild(datei);
  try {
    const faktor = ANALYSE_KANTE / Math.max(bild.width, bild.height);
    const w = Math.max(1, Math.round(bild.width * faktor));
    const h = Math.max(1, Math.round(bild.height * faktor));
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return null;
    ctx.drawImage(bild, 0, 0, w, h);
    return analysiereFarbe(ctx.getImageData(0, 0, w, h).data, w, h);
  } finally {
    if ('close' in bild && typeof bild.close === 'function') bild.close();
  }
}

/** Verkleinert ein Foto auf max. 800 px und erzeugt zusätzlich ein Vorschaubild. */
export async function fotoVorbereiten(datei: Blob): Promise<{ foto: Blob; thumb: Blob }> {
  const bild = await ladeBild(datei);
  try {
    const [foto, thumb] = await Promise.all([
      zuBlob(bild, FOTO_MAX_KANTE, JPEG_QUALITAET),
      zuBlob(bild, THUMB_MAX_KANTE, 0.75),
    ]);
    return { foto, thumb };
  } finally {
    if ('close' in bild && typeof bild.close === 'function') bild.close();
  }
}
