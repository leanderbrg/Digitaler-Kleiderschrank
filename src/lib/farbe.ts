/**
 * Farb- und Helligkeitserkennung per Pixelanalyse (ohne KI). Reine Funktionen auf
 * RGBA-Pixel-Arrays, wie sie Canvas.getImageData liefert – dadurch gut testbar.
 */

export type RGB = [r: number, g: number, b: number];
export interface HSL {
  /** Farbton 0–360° */
  h: number;
  /** Sättigung 0–1 */
  s: number;
  /** Helligkeit 0–1 */
  l: number;
}

export type Farbname =
  | 'weiß'
  | 'schwarz'
  | 'grau'
  | 'beige'
  | 'braun'
  | 'rot'
  | 'orange'
  | 'gelb'
  | 'grün'
  | 'blau'
  | 'lila'
  | 'rosa';

export type Helligkeit = 'hell' | 'dunkel' | 'neutral';

/** Auf diese Kantenlänge wird das Bild vor der Analyse verkleinert */
export const ANALYSE_KANTE = 64;
/** Nur der zentrale Bereich (Anteil je Achse) wird ausgewertet – der Rand ist meist Hintergrund */
export const ZENTRUM_ANTEIL = 0.6;

/** Schwellwerte – bewusst als Konstanten, damit Tests und Feinjustierung einfach sind */
export const SCHWELLEN = {
  /** Darunter gilt eine Farbe als unbunt (weiß/grau/schwarz) */
  unbuntSaettigung: 0.12,
  schwarzBis: 0.18,
  weissAb: 0.86,
  /** Sehr helle Töne bis zu dieser Sättigung gelten als (Off-)Weiß, z. B. bei warmem Licht */
  weissMaxSaettigung: 0.3,
  /** Sehr dunkle/helle Pixel wirken unabhängig von der Sättigung unbunt */
  fastSchwarzBis: 0.1,
  fastWeissAb: 0.95,
  /** Braun/Beige: warme Farbtöne mit wenig Helligkeit bzw. wenig Sättigung */
  braunHelligkeitBis: 0.42,
  beigeHelligkeitAb: 0.6,
  beigeSaettigungBis: 0.55,
  /** Helle Rot-/Pinktöne heißen rosa */
  rosaHelligkeitAb: 0.72,
  dunkelBis: 0.35,
  hellAb: 0.62,
} as const;

export function rgbZuHsl([r, g, b]: RGB): HSL {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const l = (max + min) / 2;
  const d = max - min;
  if (d === 0) return { h: 0, s: 0, l };
  const s = d / (1 - Math.abs(2 * l - 1));
  let h: number;
  if (max === rn) h = ((gn - bn) / d) % 6;
  else if (max === gn) h = (bn - rn) / d + 2;
  else h = (rn - gn) / d + 4;
  h *= 60;
  if (h < 0) h += 360;
  return { h, s: Math.min(1, s), l };
}

/** Pixel aus dem zentralen Bereich eines RGBA-Arrays; (fast) transparente Pixel werden ignoriert. */
export function zentralePixel(daten: ArrayLike<number>, breite: number, hoehe: number, anteil = ZENTRUM_ANTEIL): RGB[] {
  const rand = (1 - anteil) / 2;
  const x0 = Math.floor(breite * rand);
  const x1 = Math.ceil(breite * (1 - rand));
  const y0 = Math.floor(hoehe * rand);
  const y1 = Math.ceil(hoehe * (1 - rand));
  const pixel: RGB[] = [];
  for (let y = y0; y < y1; y++) {
    for (let x = x0; x < x1; x++) {
      const i = (y * breite + x) * 4;
      if (daten[i + 3] < 128) continue;
      pixel.push([daten[i], daten[i + 1], daten[i + 2]]);
    }
  }
  return pixel;
}

const abstand2 = (a: RGB, b: RGB) => (a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2 + (a[2] - b[2]) ** 2;

/**
 * Dominante Farbe per k-Means. Startwerte sind die k häufigsten Zellen einer groben
 * Quantisierung (8 Stufen je Kanal) – deterministisch, ohne Zufall.
 * Ergebnis ist der Mittelwert des größten Clusters.
 */
export function dominanteFarbe(pixel: RGB[], k = 3, iterationen = 8): RGB | null {
  if (!pixel.length) return null;
  const zellen = new Map<number, { anzahl: number; summe: RGB }>();
  for (const p of pixel) {
    const key = ((p[0] >> 5) << 6) | ((p[1] >> 5) << 3) | (p[2] >> 5);
    const z = zellen.get(key) ?? { anzahl: 0, summe: [0, 0, 0] };
    z.anzahl++;
    z.summe[0] += p[0];
    z.summe[1] += p[1];
    z.summe[2] += p[2];
    zellen.set(key, z);
  }
  let zentren: RGB[] = [...zellen.values()]
    .sort((a, b) => b.anzahl - a.anzahl)
    .slice(0, k)
    .map((z) => [z.summe[0] / z.anzahl, z.summe[1] / z.anzahl, z.summe[2] / z.anzahl]);

  let zuordnung = new Array<number>(pixel.length).fill(0);
  for (let it = 0; it < iterationen; it++) {
    zuordnung = pixel.map((p) => {
      let best = 0;
      for (let c = 1; c < zentren.length; c++) if (abstand2(p, zentren[c]) < abstand2(p, zentren[best])) best = c;
      return best;
    });
    zentren = zentren.map((alt, c) => {
      const summe: RGB = [0, 0, 0];
      let n = 0;
      pixel.forEach((p, i) => {
        if (zuordnung[i] !== c) return;
        summe[0] += p[0];
        summe[1] += p[1];
        summe[2] += p[2];
        n++;
      });
      return n ? [summe[0] / n, summe[1] / n, summe[2] / n] : alt;
    });
  }
  const groessen = zentren.map((_, c) => zuordnung.filter((z) => z === c).length);
  const groesster = groessen.indexOf(Math.max(...groessen));
  return zentren[groesster].map(Math.round) as RGB;
}

/** Bildet eine Farbe (HSL) auf einen deutschen Farbnamen ab. */
export function farbName({ h, s, l }: HSL): Farbname {
  const S = SCHWELLEN;
  if (l <= S.fastSchwarzBis) return 'schwarz';
  if (l >= S.fastWeissAb) return 'weiß';
  if (l >= S.weissAb && s <= S.weissMaxSaettigung) return 'weiß';
  if (s < S.unbuntSaettigung) {
    if (l <= S.schwarzBis) return 'schwarz';
    if (l >= S.weissAb) return 'weiß';
    return 'grau';
  }
  const warm = h >= 15 && h < 50;
  if (warm && l <= S.braunHelligkeitBis) return 'braun';
  if (warm && l >= S.beigeHelligkeitAb && s <= S.beigeSaettigungBis) return 'beige';
  if (h < 15 || h >= 345) return l >= S.rosaHelligkeitAb ? 'rosa' : 'rot';
  if (h < 40) return 'orange';
  if (h < 66) return 'gelb';
  if (h < 170) return 'grün';
  if (h < 255) return 'blau';
  if (h < 290) return 'lila';
  return 'rosa';
}

export function helligkeit({ l }: HSL): Helligkeit {
  if (l <= SCHWELLEN.dunkelBis) return 'dunkel';
  if (l >= SCHWELLEN.hellAb) return 'hell';
  return 'neutral';
}

export interface FarbAnalyse {
  rgb: RGB;
  hsl: HSL;
  farbe: Farbname;
  helligkeit: Helligkeit;
}

/** Komplette Analyse eines (bereits verkleinerten) RGBA-Bildes. */
export function analysiereFarbe(daten: ArrayLike<number>, breite: number, hoehe: number): FarbAnalyse | null {
  const rgb = dominanteFarbe(zentralePixel(daten, breite, hoehe));
  if (!rgb) return null;
  const hsl = rgbZuHsl(rgb);
  return { rgb, hsl, farbe: farbName(hsl), helligkeit: helligkeit(hsl) };
}
