import type { Teil, Verlaufseintrag } from '../types';

export interface StandortSumme {
  standortId: string;
  gesamt: number;
  waesche: number;
}

/** Gesamtzahl und Wäsche-Anzahl aktiver Teile je Standort (in der gegebenen Reihenfolge). */
export function standortSummen(teile: Teil[], standortIds: string[]): StandortSumme[] {
  return standortIds.map((standortId) => {
    const hier = teile.filter((t) => !t.aussortiert && t.standortId === standortId);
    return { standortId, gesamt: hier.length, waesche: hier.filter((t) => t.status === 'waesche').length };
  });
}

export interface Matrix {
  zeilen: { kategorieId: string; werte: number[]; summe: number }[];
  spaltenSummen: number[];
  gesamt: number;
}

/**
 * Bestandstabelle Kategorie × Standort inkl. Summen.
 * Leere Kategorien werden weggelassen, wenn `leereZeigen` false ist.
 */
export function bestandMatrix(teile: Teil[], kategorieIds: string[], standortIds: string[], leereZeigen = false): Matrix {
  const aktiv = teile.filter((t) => !t.aussortiert);
  const zeilen = kategorieIds
    .map((kategorieId) => {
      const werte = standortIds.map(
        (s) => aktiv.filter((t) => t.kategorieId === kategorieId && t.standortId === s).length,
      );
      return { kategorieId, werte, summe: werte.reduce((a, b) => a + b, 0) };
    })
    .filter((z) => leereZeigen || z.summe > 0);
  const spaltenSummen = standortIds.map((_, i) => zeilen.reduce((a, z) => a + z.werte[i], 0));
  return { zeilen, spaltenSummen, gesamt: spaltenSummen.reduce((a, b) => a + b, 0) };
}

/** Aktiver Bestand je Kategorie, absteigend sortiert (ohne leere Kategorien). */
export function bestandProKategorie(teile: Teil[], kategorieIds: string[]): { kategorieId: string; anzahl: number }[] {
  return kategorieIds
    .map((kategorieId) => ({
      kategorieId,
      anzahl: teile.filter((t) => !t.aussortiert && t.kategorieId === kategorieId).length,
    }))
    .filter((x) => x.anzahl > 0)
    .sort((a, b) => b.anzahl - a.anzahl);
}

export interface AussortierEreignis {
  teilId: string;
  datum: number;
  grund: string;
}

/**
 * Leitet die gültigen Aussortier-Ereignisse aus dem Verlauf ab: pro Teil zählt das
 * letzte "aussortiert", sofern danach kein "wiederhergestellt" kam. So bleiben auch
 * endgültig gelöschte Teile in der Statistik.
 */
export function aussortierEreignisse(verlauf: Verlaufseintrag[]): AussortierEreignis[] {
  const letzte = new Map<string, Verlaufseintrag>();
  const sortiert = [...verlauf].sort((a, b) => a.datum - b.datum);
  for (const v of sortiert) {
    if (v.aktion === 'aussortiert' || v.aktion === 'wiederhergestellt') letzte.set(v.teilId, v);
  }
  return [...letzte.values()]
    .filter((v) => v.aktion === 'aussortiert')
    .map((v) => ({ teilId: v.teilId, datum: v.datum, grund: v.details?.grund ?? 'Sonstiges' }));
}

export function monatsSchluessel(datum: number): string {
  const d = new Date(datum);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

/** Anzahl aussortierter Teile je Monat für die letzten `monate` Monate (inkl. aktuellem), älteste zuerst. */
export function aussortiertProMonat(
  ereignisse: AussortierEreignis[],
  jetzt: number,
  monate = 12,
): { monat: string; anzahl: number }[] {
  const heute = new Date(jetzt);
  const ergebnis: { monat: string; anzahl: number }[] = [];
  for (let i = monate - 1; i >= 0; i--) {
    const d = new Date(heute.getFullYear(), heute.getMonth() - i, 1);
    ergebnis.push({ monat: monatsSchluessel(d.getTime()), anzahl: 0 });
  }
  const index = new Map(ergebnis.map((e, i) => [e.monat, i]));
  for (const e of ereignisse) {
    const i = index.get(monatsSchluessel(e.datum));
    if (i !== undefined) ergebnis[i].anzahl++;
  }
  return ergebnis;
}

/** Aussortier-Gründe nach Häufigkeit (absteigend, bei Gleichstand alphabetisch). */
export function haeufigsteGruende(ereignisse: AussortierEreignis[]): { grund: string; anzahl: number }[] {
  const zaehler = new Map<string, number>();
  for (const e of ereignisse) zaehler.set(e.grund, (zaehler.get(e.grund) ?? 0) + 1);
  return [...zaehler.entries()]
    .map(([grund, anzahl]) => ({ grund, anzahl }))
    .sort((a, b) => b.anzahl - a.anzahl || a.grund.localeCompare(b.grund, 'de'));
}
