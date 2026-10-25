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
import { ENTWURF_PRAEFIX, fasseVerlaufZusammen } from '../lib/autoSpeichern';
import type { Datenbestand } from '../lib/export';
import { neueId } from '../lib/id';
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

/**
 * Auto-Speichern im Bearbeiten-Modus: schreibt den aktuellen Stand und fasst "bearbeitet"-
 * Einträge einer Bearbeitungssitzung (2 Minuten) zu einem Verlaufseintrag zusammen.
 */
export async function teilAutoSpeichern(id: string, neu: Partial<TeilDaten>, jetzt = Date.now()): Promise<void> {
  await db.transaction('rw', db.teile, db.verlauf, async () => {
    const alt = await db.teile.get(id);
    if (!alt) throw new Error('Teil nicht gefunden');
    const a = bearbeiteTeil(alt, neu, { jetzt, id: neueId });
    if (!a.teile.length) return;
    const verlaufDesTeils = await db.verlauf.where('teilId').equals(id).sortBy('datum');
    const letzterBearbeitet = verlaufDesTeils.reverse().find((v) => v.aktion === 'bearbeitet');
    const { hinzufuegen, aktualisieren } = fasseVerlaufZusammen(a.verlauf, letzterBearbeitet, jetzt);
    await db.teile.put(a.teile[0]);
    if (hinzufuegen.length) await db.verlauf.bulkAdd(hinzufuegen);
    if (aktualisieren) await db.verlauf.put(aktualisieren);
  });
}

/**
 * Trägt Notfall-Entwürfe nach, die beim Schließen/Neuladen während des Bearbeitens
 * gesichert wurden. Ungültige Entwürfe (leerer Name) werden verworfen.
 */
export async function entwuerfeNachtragen(speicher: Storage = localStorage): Promise<number> {
  let anzahl = 0;
  const schluessel = Array.from({ length: speicher.length }, (_, i) => speicher.key(i)).filter(
    (k): k is string => !!k?.startsWith(ENTWURF_PRAEFIX),
  );
  for (const k of schluessel) {
    try {
      const daten = JSON.parse(speicher.getItem(k) ?? 'null') as Partial<TeilDaten> | null;
      const id = k.slice(ENTWURF_PRAEFIX.length);
      if (daten && (daten.name === undefined || daten.name.trim()) && (await db.teile.get(id))) {
        await teilAutoSpeichern(id, daten);
        anzahl++;
      }
    } catch (e) {
      console.error('Entwurf konnte nicht nachgetragen werden', e);
    }
    speicher.removeItem(k);
  }
  return anzahl;
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

// --- Standorte & Kategorien ---

export async function standortUmbenennen(id: string, name: string): Promise<void> {
  const n = name.trim();
  if (!n) throw new Error('Der Name darf nicht leer sein.');
  await db.standorte.update(id, { name: n });
}

export async function kategorieHinzufuegen(name: string, emoji: string): Promise<void> {
  const n = name.trim();
  if (!n) throw new Error('Der Name darf nicht leer sein.');
  const alle = await db.kategorien.toArray();
  if (alle.some((k) => k.name.trim().toLowerCase() === n.toLowerCase())) throw new Error('Diese Kategorie gibt es schon.');
  const reihenfolge = Math.max(0, ...alle.map((k) => k.reihenfolge)) + 1;
  await db.kategorien.add({ id: neueId(), name: n, emoji: emoji.trim() || '📦', reihenfolge });
}

export async function kategorieAktualisieren(id: string, name: string, emoji: string): Promise<void> {
  const n = name.trim();
  if (!n) throw new Error('Der Name darf nicht leer sein.');
  await db.kategorien.update(id, { name: n, emoji: emoji.trim() || '📦' });
}

/** Anzahl Teile (inkl. Papierkorb) in einer Kategorie. */
export function teileInKategorie(id: string): Promise<number> {
  return db.teile.where('kategorieId').equals(id).count();
}

/** Löscht eine Kategorie – nur wenn ihr keine Teile (auch keine aussortierten) mehr zugeordnet sind. */
export async function kategorieLoeschen(id: string): Promise<void> {
  await db.transaction('rw', db.kategorien, db.teile, async () => {
    const n = await teileInKategorie(id);
    if (n > 0) throw new Error(`Die Kategorie enthält noch ${n} ${n === 1 ? 'Teil' : 'Teile'} (inkl. Papierkorb).`);
    await db.kategorien.delete(id);
  });
}

// --- Export & Import ---

export async function datenLesen(): Promise<Datenbestand> {
  const [standorte, kategorien, teile, verlauf] = await Promise.all([
    db.standorte.orderBy('reihenfolge').toArray(),
    db.kategorien.orderBy('reihenfolge').toArray(),
    db.teile.toArray(),
    db.verlauf.orderBy('datum').toArray(),
  ]);
  return { standorte, kategorien, teile, verlauf };
}

/** Ersetzt den kompletten Datenbestand (Einstellungen bleiben erhalten). */
export async function datenErsetzen(d: Datenbestand): Promise<void> {
  await db.transaction('rw', [db.standorte, db.kategorien, db.teile, db.verlauf], async () => {
    await Promise.all([db.standorte.clear(), db.kategorien.clear(), db.teile.clear(), db.verlauf.clear()]);
    await db.standorte.bulkAdd(d.standorte);
    await db.kategorien.bulkAdd(d.kategorien);
    await db.teile.bulkAdd(d.teile);
    await db.verlauf.bulkAdd(d.verlauf);
  });
}
