import { describe, expect, it } from 'vitest';
import { baueVorschlag, fuelleFelder, softmax, werteAus, type VorschlagsFeld } from './erkennung';
import type { FarbAnalyse } from './farbe';
import { typNachId } from './kleidungstypen';

const KATEGORIEN = [
  { id: 'hosen', name: 'Hosen' },
  { id: 'tshirts', name: 'T-Shirts' },
  { id: 'socken', name: 'Socken' },
  { id: 'sonstiges', name: 'Sonstiges' },
];
const hellblau: FarbAnalyse = { rgb: [140, 170, 205], hsl: { h: 212, s: 0.4, l: 0.68 }, farbe: 'blau', helligkeit: 'hell' };

describe('softmax', () => {
  it('ergibt Wahrscheinlichkeiten mit Summe 1', () => {
    const p = softmax([2, 1, 0]);
    expect(p.reduce((a, b) => a + b, 0)).toBeCloseTo(1);
    expect(p[0]).toBeGreaterThan(p[1]);
  });
});

describe('werteAus', () => {
  it('nimmt die Top-Prediction und liefert die Top 3', () => {
    const e = werteAus([
      { id: 'tshirt', wert: 0.1 },
      { id: 'jeans', wert: 0.7 },
      { id: 'hose', wert: 0.15 },
      { id: 'socken', wert: 0.05 },
    ]);
    expect(e.sicher).toBe(true);
    expect(e.typ?.id).toBe('jeans');
    expect(e.top3.map((t) => t.typ.id)).toEqual(['jeans', 'hose', 'tshirt']);
  });
  it('ist unter dem Schwellwert nicht sicher', () => {
    const e = werteAus([
      { id: 'jeans', wert: 0.3 },
      { id: 'hose', wert: 0.28 },
      { id: 'jogginghose', wert: 0.42 - 0.0001 },
    ], 0.5);
    expect(e.sicher).toBe(false);
  });
  it('ignoriert unbekannte IDs und kommt mit leerer Liste klar', () => {
    expect(werteAus([{ id: 'gibtsnicht', wert: 1 }])).toEqual({ sicher: false, konfidenz: 0, top3: [] });
  });
});

describe('baueVorschlag', () => {
  it('Foto einer hellen Jeans → "Helle Jeans", Hosen, blau', () => {
    expect(baueVorschlag(typNachId('jeans'), hellblau, KATEGORIEN)).toEqual({
      name: 'Helle Jeans',
      kategorieId: 'hosen',
      farbe: 'blau',
    });
  });
  it('ohne sicheren Typ nur die Farbe', () => {
    expect(baueVorschlag(undefined, hellblau, KATEGORIEN)).toEqual({ farbe: 'blau' });
  });
  it('fehlende Kategorie → Sonstiges', () => {
    expect(baueVorschlag(typNachId('schuhe'), null, KATEGORIEN)).toEqual({ name: 'Schuhe', kategorieId: 'sonstiges' });
  });
});

describe('fuelleFelder', () => {
  const leer = { name: '', kategorieId: 'hosen', farbe: '' };
  const vorschlag = { name: 'Weißes T-Shirt', kategorieId: 'tshirts', farbe: 'weiß' };
  const gesperrt = (...f: VorschlagsFeld[]) => new Set(f);

  it('füllt leere, unberührte Felder', () => {
    expect(fuelleFelder(leer, vorschlag, gesperrt())).toEqual(vorschlag);
  });
  it('überschreibt nie vom Nutzer geänderte Felder', () => {
    expect(fuelleFelder(leer, vorschlag, gesperrt('kategorieId'))).toEqual({ name: 'Weißes T-Shirt', farbe: 'weiß' });
  });
  it('überschreibt keinen bereits eingetippten Namen und keine Farbe', () => {
    expect(fuelleFelder({ name: 'Mein Shirt', kategorieId: 'hosen', farbe: 'creme' }, vorschlag, gesperrt())).toEqual({
      kategorieId: 'tshirts',
    });
  });
  it('lässt identische Werte aus', () => {
    expect(fuelleFelder({ name: '', kategorieId: 'tshirts', farbe: '' }, vorschlag, gesperrt()).kategorieId).toBeUndefined();
  });
});
