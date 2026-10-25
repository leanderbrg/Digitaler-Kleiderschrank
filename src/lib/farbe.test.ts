import { describe, expect, it } from 'vitest';
import { analysiereFarbe, dominanteFarbe, farbName, helligkeit, rgbZuHsl, zentralePixel, type RGB } from './farbe';

/** Synthetisches RGBA-Bild: Hintergrundfarbe mit einem farbigen Rechteck in der Mitte */
function bild(breite: number, hoehe: number, hintergrund: RGB, motiv: RGB, motivAnteil = 0.5): Uint8ClampedArray {
  const d = new Uint8ClampedArray(breite * hoehe * 4);
  const rand = (1 - motivAnteil) / 2;
  for (let y = 0; y < hoehe; y++) {
    for (let x = 0; x < breite; x++) {
      const innen = x >= breite * rand && x < breite * (1 - rand) && y >= hoehe * rand && y < hoehe * (1 - rand);
      const [r, g, b] = innen ? motiv : hintergrund;
      d.set([r, g, b, 255], (y * breite + x) * 4);
    }
  }
  return d;
}

const name = (rgb: RGB) => farbName(rgbZuHsl(rgb));

describe('rgbZuHsl', () => {
  it('rechnet Grundfarben korrekt um', () => {
    expect(rgbZuHsl([255, 0, 0])).toEqual({ h: 0, s: 1, l: 0.5 });
    expect(rgbZuHsl([0, 0, 255]).h).toBe(240);
    expect(rgbZuHsl([128, 128, 128]).s).toBe(0);
  });
});

describe('farbName', () => {
  it.each<[RGB, string]>([
    [[250, 250, 250], 'weiß'],
    [[235, 232, 228], 'weiß'],
    [[15, 15, 18], 'schwarz'],
    [[40, 40, 42], 'schwarz'],
    [[128, 128, 130], 'grau'],
    [[200, 0, 0], 'rot'],
    [[120, 20, 30], 'rot'],
    [[250, 170, 180], 'rosa'],
    [[230, 60, 160], 'rosa'],
    [[240, 130, 20], 'orange'],
    [[240, 210, 40], 'gelb'],
    [[40, 140, 60], 'grün'],
    [[40, 80, 200], 'blau'],
    [[110, 140, 175], 'blau'], // helle Jeans
    [[30, 40, 70], 'blau'], // Navy / dunkle Jeans
    [[120, 50, 170], 'lila'],
    [[110, 70, 40], 'braun'],
    [[215, 195, 160], 'beige'],
  ])('%j → %s', (rgb, erwartet) => {
    expect(name(rgb)).toBe(erwartet);
  });
});

describe('helligkeit', () => {
  it('unterscheidet hell, dunkel und neutral über Schwellwerte', () => {
    expect(helligkeit({ h: 210, s: 0.3, l: 0.7 })).toBe('hell');
    expect(helligkeit({ h: 210, s: 0.3, l: 0.25 })).toBe('dunkel');
    expect(helligkeit({ h: 210, s: 0.3, l: 0.5 })).toBe('neutral');
  });
});

describe('zentralePixel', () => {
  it('wertet nur die mittleren 60 % aus und ignoriert Transparenz', () => {
    const d = bild(10, 10, [0, 0, 0], [255, 255, 255], 0.6);
    d[(5 * 10 + 5) * 4 + 3] = 0; // ein transparenter Pixel in der Mitte
    const pixel = zentralePixel(d, 10, 10);
    expect(pixel).toHaveLength(6 * 6 - 1);
    expect(pixel.every((p) => p[0] === 255)).toBe(true);
  });
});

describe('dominanteFarbe', () => {
  it('findet die häufigste Farbe trotz Rauschen', () => {
    const pixel: RGB[] = [
      ...Array.from({ length: 70 }, (_, i): RGB => [40 + (i % 5), 80, 200 - (i % 7)]),
      ...Array.from({ length: 30 }, (): RGB => [240, 240, 240]),
    ];
    const [r, g, b] = dominanteFarbe(pixel)!;
    expect(r).toBeGreaterThanOrEqual(40);
    expect(r).toBeLessThanOrEqual(44);
    expect(g).toBe(80);
    expect(b).toBeGreaterThan(190);
  });
  it('liefert null ohne Pixel', () => {
    expect(dominanteFarbe([])).toBeNull();
  });
});

describe('analysiereFarbe', () => {
  it('erkennt ein helles Jeans-Blau vor weißem Hintergrund', () => {
    const a = analysiereFarbe(bild(64, 64, [255, 255, 255], [140, 170, 205], 0.55), 64, 64)!;
    expect(a.farbe).toBe('blau');
    expect(a.helligkeit).toBe('hell');
  });
  it('erkennt schwarze Socken auf grauem Holzboden', () => {
    const a = analysiereFarbe(bild(64, 64, [150, 120, 90], [20, 20, 22], 0.5), 64, 64)!;
    expect(a.farbe).toBe('schwarz');
    expect(a.helligkeit).toBe('dunkel');
  });
});
