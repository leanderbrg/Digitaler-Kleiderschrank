import {
  aussortiereTeile,
  bearbeiteTeil,
  erzeugeTeile,
  kontext,
  setzeStatus,
  stelleWiederHer,
  verschiebeTeile,
  type Aenderung,
  type TeilDaten,
} from '../lib/aktionen';
import type { Status, Teil } from '../types';
import { db } from './db';

export type Rueckgaengig = () => Promise<void>;

export interface Ergebnis {
  anzahl: number;
  rueckgaengig: Rueckgaengig;
}

/** Speichert eine Änderung atomar und liefert eine Funktion zum Zurücknehmen. */
async function anwenden(a: Aenderung, vorher: Teil[]): Promise<Ergebnis> {
  await db.transaction('rw', db.teile, db.verlauf, async () => {
    if (a.teile.length) await db.teile.bulkPut(a.teile);
    if (a.verlauf.length) await db.verlauf.bulkAdd(a.verlauf);
  });
  const geaendert = new Set(a.teile.map((t) => t.id));
  const alteStaende = vorher.filter((t) => geaendert.has(t.id));
  const neueIds = a.teile.filter((t) => !vorher.some((v) => v.id === t.id)).map((t) => t.id);
  const verlaufIds = a.verlauf.map((v) => v.id);
  return {
    anzahl: a.teile.length,
    rueckgaengig: async () => {
      await db.transaction('rw', db.teile, db.verlauf, async () => {
        if (alteStaende.length) await db.teile.bulkPut(alteStaende);
        if (neueIds.length) await db.teile.bulkDelete(neueIds);
        await db.verlauf.bulkDelete(verlaufIds);
      });
    },
  };
}

async function lade(ids: string[]): Promise<Teil[]> {
  return (await db.teile.bulkGet(ids)).filter((t): t is Teil => !!t);
}

export async function teileHinzufuegen(daten: TeilDaten, anzahl: number): Promise<Ergebnis & { ids: string[] }> {
  const a = erzeugeTeile(daten, anzahl, kontext());
  const e = await anwenden(a, []);
  return { ...e, ids: a.teile.map((t) => t.id) };
}

export async function teilSpeichern(id: string, neu: Partial<TeilDaten>): Promise<Ergebnis> {
  const alt = await db.teile.get(id);
  if (!alt) throw new Error('Teil nicht gefunden');
  return anwenden(bearbeiteTeil(alt, neu, kontext()), [alt]);
}

export async function verschieben(ids: string[], zielStandortId: string, status?: Status): Promise<Ergebnis> {
  const vorher = await lade(ids);
  return anwenden(verschiebeTeile(vorher, zielStandortId, status, kontext()), vorher);
}

export async function statusSetzen(ids: string[], status: Status): Promise<Ergebnis> {
  const vorher = await lade(ids);
  return anwenden(setzeStatus(vorher, status, kontext()), vorher);
}

export async function aussortieren(ids: string[], grund: string): Promise<Ergebnis> {
  const vorher = await lade(ids);
  return anwenden(aussortiereTeile(vorher, grund, kontext()), vorher);
}

export async function wiederherstellen(ids: string[]): Promise<Ergebnis> {
  const vorher = await lade(ids);
  return anwenden(stelleWiederHer(vorher, kontext()), vorher);
}

/** Endgültiges Löschen (nur für aussortierte Teile). Verlaufseinträge bleiben erhalten. */
export async function endgueltigLoeschen(ids: string[]): Promise<number> {
  const teile = await lade(ids);
  const loeschbar = teile.filter((t) => t.aussortiert).map((t) => t.id);
  await db.teile.bulkDelete(loeschbar);
  return loeschbar.length;
}
