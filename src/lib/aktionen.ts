import type { Aktion, Status, Teil, Verlaufseintrag, VerlaufDetails } from '../types';
import { neueId } from './id';

/**
 * Reine Funktionen für alle schreibenden Aktionen. Sie bekommen die betroffenen
 * Teile und liefern die geänderten Teile plus die zugehörigen Verlaufseinträge.
 * Das Speichern übernimmt src/db/repo.ts.
 */
export interface Aenderung {
  teile: Teil[];
  verlauf: Verlaufseintrag[];
}

export interface Kontext {
  jetzt: number;
  id: () => string;
}

export function kontext(): Kontext {
  return { jetzt: Date.now(), id: neueId };
}

function eintrag(t: Teil, aktion: Aktion, details: VerlaufDetails | undefined, k: Kontext): Verlaufseintrag {
  return {
    id: k.id(),
    datum: k.jetzt,
    teilId: t.id,
    teilName: t.name,
    kategorieId: t.kategorieId,
    aktion,
    ...(details ? { details } : {}),
  };
}

export type TeilDaten = Pick<Teil, 'name' | 'kategorieId' | 'standortId' | 'status' | 'zustand'> &
  Partial<Pick<Teil, 'foto' | 'thumb' | 'groesse' | 'farbe' | 'notiz' | 'beispiel'>>;

function bereinigen(s: string | undefined): string | undefined {
  const v = s?.trim();
  return v ? v : undefined;
}

/** Erzeugt `anzahl` einzelne Teile mit identischen Daten (und identischem Foto). */
export function erzeugeTeile(daten: TeilDaten, anzahl: number, k: Kontext): Aenderung {
  const teile: Teil[] = [];
  const verlauf: Verlaufseintrag[] = [];
  for (let i = 0; i < anzahl; i++) {
    const t: Teil = {
      id: k.id(),
      name: daten.name.trim(),
      kategorieId: daten.kategorieId,
      standortId: daten.standortId,
      status: daten.status,
      zustand: daten.zustand,
      foto: daten.foto,
      thumb: daten.thumb,
      groesse: bereinigen(daten.groesse),
      farbe: bereinigen(daten.farbe),
      notiz: bereinigen(daten.notiz),
      erstelltAm: k.jetzt + i, // eindeutige Reihenfolge innerhalb eines Speichervorgangs
      geaendertAm: k.jetzt,
      aussortiert: false,
      ...(daten.beispiel ? { beispiel: true } : {}),
    };
    teile.push(t);
    verlauf.push(eintrag(t, 'hinzugefügt', undefined, k));
  }
  return { teile, verlauf };
}

const BEARBEITBAR = ['name', 'kategorieId', 'groesse', 'farbe', 'zustand', 'notiz', 'foto'] as const;

/**
 * Übernimmt Änderungen an einem Teil. Standortwechsel erzeugen "verschoben",
 * Statuswechsel "status", alle übrigen Feldänderungen einen "bearbeitet"-Eintrag.
 */
export function bearbeiteTeil(alt: Teil, neu: Partial<TeilDaten>, k: Kontext): Aenderung {
  const t: Teil = { ...alt };
  const verlauf: Verlaufseintrag[] = [];
  const geaenderteFelder: string[] = [];

  for (const feld of BEARBEITBAR) {
    if (!(feld in neu)) continue;
    const wert = feld === 'foto' ? neu.foto : feld === 'name' ? neu.name?.trim() : neu[feld];
    const normal = typeof wert === 'string' && feld !== 'name' ? bereinigen(wert) : wert;
    if (normal !== alt[feld]) {
      (t as unknown as Record<string, unknown>)[feld] = normal;
      geaenderteFelder.push(feld);
    }
  }
  if ('foto' in neu && neu.foto !== alt.foto) t.thumb = neu.thumb;

  if (neu.standortId && neu.standortId !== alt.standortId) {
    t.standortId = neu.standortId;
    verlauf.push(eintrag(t, 'verschoben', { vonStandortId: alt.standortId, nachStandortId: neu.standortId }, k));
  }
  if (neu.status && neu.status !== alt.status) {
    t.status = neu.status;
    verlauf.push(eintrag(t, 'status', { vonStatus: alt.status, nachStatus: neu.status }, k));
  }
  if (geaenderteFelder.length) {
    verlauf.push(eintrag(t, 'bearbeitet', { text: geaenderteFelder.map(feldLabel).join(', ') }, k));
  }
  if (!verlauf.length) return { teile: [], verlauf: [] };
  t.geaendertAm = k.jetzt;
  return { teile: [t], verlauf };
}

function feldLabel(f: string): string {
  return (
    { name: 'Name', kategorieId: 'Kategorie', groesse: 'Größe', farbe: 'Farbe', zustand: 'Zustand', notiz: 'Notiz', foto: 'Foto' }[
      f
    ] ?? f
  );
}

/**
 * Verschiebt Teile an einen Zielstandort und setzt optional den Status.
 * Teile, bei denen sich nichts ändert, werden übersprungen.
 */
export function verschiebeTeile(teile: Teil[], zielStandortId: string, status: Status | undefined, k: Kontext): Aenderung {
  const ergebnis: Aenderung = { teile: [], verlauf: [] };
  for (const alt of teile) {
    if (alt.aussortiert) continue;
    const a = bearbeiteTeil(alt, { standortId: zielStandortId, ...(status ? { status } : {}) }, k);
    ergebnis.teile.push(...a.teile);
    ergebnis.verlauf.push(...a.verlauf);
  }
  return ergebnis;
}

/** Setzt den Status (Schrank/Wäsche) mehrerer Teile. */
export function setzeStatus(teile: Teil[], status: Status, k: Kontext): Aenderung {
  const ergebnis: Aenderung = { teile: [], verlauf: [] };
  for (const alt of teile) {
    if (alt.aussortiert || alt.status === status) continue;
    const t: Teil = { ...alt, status, geaendertAm: k.jetzt };
    ergebnis.teile.push(t);
    ergebnis.verlauf.push(eintrag(t, 'status', { vonStatus: alt.status, nachStatus: status }, k));
  }
  return ergebnis;
}

/** Soft-Delete: markiert Teile als aussortiert. */
export function aussortiereTeile(teile: Teil[], grund: string, k: Kontext): Aenderung {
  const ergebnis: Aenderung = { teile: [], verlauf: [] };
  for (const alt of teile) {
    if (alt.aussortiert) continue;
    const t: Teil = { ...alt, aussortiert: true, aussortiertAm: k.jetzt, aussortierGrund: grund, geaendertAm: k.jetzt };
    ergebnis.teile.push(t);
    ergebnis.verlauf.push(eintrag(t, 'aussortiert', { grund }, k));
  }
  return ergebnis;
}

/** Holt aussortierte Teile zurück in den Bestand. */
export function stelleWiederHer(teile: Teil[], k: Kontext): Aenderung {
  const ergebnis: Aenderung = { teile: [], verlauf: [] };
  for (const alt of teile) {
    if (!alt.aussortiert) continue;
    const t: Teil = { ...alt, aussortiert: false, geaendertAm: k.jetzt };
    delete t.aussortiertAm;
    delete t.aussortierGrund;
    ergebnis.teile.push(t);
    ergebnis.verlauf.push(eintrag(t, 'wiederhergestellt', undefined, k));
  }
  return ergebnis;
}
