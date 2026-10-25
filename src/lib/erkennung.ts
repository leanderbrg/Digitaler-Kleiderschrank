import type { Kategorie } from '../types';
import type { FarbAnalyse } from './farbe';
import { baueName, kategorieFuerTyp, typNachId, type Kleidungstyp } from './kleidungstypen';

/** Unter dieser Wahrscheinlichkeit der Top-Prediction gilt die Erkennung als unsicher */
export const KONFIDENZ_SCHWELLE = 0.35;

export interface TypWertung {
  id: string;
  /** Wahrscheinlichkeit 0–1 (Summe über alle Typen = 1) */
  wert: number;
}

export interface Erkennung {
  sicher: boolean;
  typ?: Kleidungstyp;
  konfidenz: number;
  /** Die drei wahrscheinlichsten Typen (für antippbare Chips bei unsicherer Erkennung) */
  top3: { typ: Kleidungstyp; wert: number }[];
}

export function softmax(logits: number[]): number[] {
  const max = Math.max(...logits);
  const exp = logits.map((x) => Math.exp(x - max));
  const summe = exp.reduce((a, b) => a + b, 0);
  return exp.map((x) => x / summe);
}

/** Nimmt die Top-Prediction; unter dem Schwellwert ist das Ergebnis "nicht sicher". */
export function werteAus(wertungen: TypWertung[], schwelle = KONFIDENZ_SCHWELLE): Erkennung {
  const sortiert = wertungen
    .map((w) => ({ typ: typNachId(w.id), wert: w.wert }))
    .filter((w): w is { typ: Kleidungstyp; wert: number } => !!w.typ)
    .sort((a, b) => b.wert - a.wert);
  const top = sortiert[0];
  if (!top) return { sicher: false, konfidenz: 0, top3: [] };
  return {
    sicher: top.wert >= schwelle,
    typ: top.typ,
    konfidenz: top.wert,
    top3: sortiert.slice(0, 3),
  };
}

export interface Vorschlag {
  name?: string;
  kategorieId?: string;
  farbe?: string;
}

/**
 * Baut aus Typ (KI) und Farbe (Pixelanalyse) einen Vorschlag. Ohne sicheren Typ wird nur
 * die Farbe vorgeschlagen – sie stammt nicht aus der KI und ist davon unabhängig.
 */
export function baueVorschlag(
  typ: Kleidungstyp | undefined,
  farbe: FarbAnalyse | null,
  kategorien: Pick<Kategorie, 'id' | 'name'>[],
): Vorschlag {
  const v: Vorschlag = {};
  if (farbe) v.farbe = farbe.farbe;
  if (typ) {
    v.name = baueName(typ, farbe?.farbe, farbe?.helligkeit);
    v.kategorieId = kategorieFuerTyp(typ, kategorien);
  }
  return v;
}

export type VorschlagsFeld = 'name' | 'kategorieId' | 'farbe';

/**
 * Welche Felder dürfen vorausgefüllt werden? Nie Felder, die der Nutzer geändert hat oder
 * die schon vorbelegt sind (`gesperrt`); Name und Farbe außerdem nur, wenn sie leer sind.
 */
export function fuelleFelder(
  aktuell: Record<VorschlagsFeld, string>,
  vorschlag: Vorschlag,
  gesperrt: ReadonlySet<VorschlagsFeld>,
): Partial<Record<VorschlagsFeld, string>> {
  const patch: Partial<Record<VorschlagsFeld, string>> = {};
  for (const feld of ['name', 'kategorieId', 'farbe'] as const) {
    const wert = vorschlag[feld];
    if (!wert || gesperrt.has(feld)) continue;
    if (feld !== 'kategorieId' && aktuell[feld].trim() !== '') continue;
    if (aktuell[feld] === wert) continue;
    patch[feld] = wert;
  }
  return patch;
}
