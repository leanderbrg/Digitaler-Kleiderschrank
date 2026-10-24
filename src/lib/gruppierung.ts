import type { Teil } from '../types';

/** trim + lowercase + Mehrfach-Leerzeichen zusammenfassen */
export function normalisiere(s: string | undefined | null): string {
  return (s ?? '').trim().toLowerCase().replace(/\s+/g, ' ');
}

/** Gruppenschlüssel = kategorieId + normalisierter Name + normalisierte Farbe */
export function gruppenSchluessel(t: Pick<Teil, 'kategorieId' | 'name' | 'farbe'>): string {
  return [t.kategorieId, normalisiere(t.name), normalisiere(t.farbe)].join('|');
}

export interface StandortAnzahl {
  standortId: string;
  anzahl: number;
  waesche: number;
}

export interface Gruppe {
  schluessel: string;
  name: string;
  farbe?: string;
  kategorieId: string;
  /** Einzelteile in der Reihenfolge der Eingabe; das erste liefert das Vorschaufoto */
  teile: Teil[];
  anzahl: number;
  waesche: number;
  proStandort: StandortAnzahl[];
}

interface Sortierung {
  standortReihenfolge?: string[];
  kategorieReihenfolge?: string[];
}

function rang(reihenfolge: string[] | undefined, id: string): number {
  const i = reihenfolge?.indexOf(id) ?? -1;
  return i === -1 ? Number.MAX_SAFE_INTEGER : i;
}

/**
 * Fasst gleiche Teile zu Gruppen zusammen. Aussortierte Teile werden ignoriert.
 * Gruppen sind nach Kategorie-Reihenfolge, dann Name sortiert.
 */
export function gruppiere(teile: Teil[], sortierung: Sortierung = {}): Gruppe[] {
  const map = new Map<string, Gruppe>();
  for (const t of teile) {
    if (t.aussortiert) continue;
    const key = gruppenSchluessel(t);
    let g = map.get(key);
    if (!g) {
      g = {
        schluessel: key,
        name: t.name.trim(),
        farbe: t.farbe?.trim() || undefined,
        kategorieId: t.kategorieId,
        teile: [],
        anzahl: 0,
        waesche: 0,
        proStandort: [],
      };
      map.set(key, g);
    }
    g.teile.push(t);
    g.anzahl++;
    let s = g.proStandort.find((p) => p.standortId === t.standortId);
    if (!s) {
      s = { standortId: t.standortId, anzahl: 0, waesche: 0 };
      g.proStandort.push(s);
    }
    s.anzahl++;
    if (t.status === 'waesche') {
      s.waesche++;
      g.waesche++;
    }
  }

  const gruppen = [...map.values()];
  for (const g of gruppen) {
    g.proStandort.sort(
      (a, b) => rang(sortierung.standortReihenfolge, a.standortId) - rang(sortierung.standortReihenfolge, b.standortId),
    );
  }
  gruppen.sort(
    (a, b) =>
      rang(sortierung.kategorieReihenfolge, a.kategorieId) - rang(sortierung.kategorieReihenfolge, b.kategorieId) ||
      a.name.localeCompare(b.name, 'de') ||
      (a.farbe ?? '').localeCompare(b.farbe ?? '', 'de'),
  );
  return gruppen;
}

/** z. B. "4 Stück: Standort 1: 3 (1 in der Wäsche), Standort 2: 1" */
export function formatAufschluesselung(g: Gruppe, standortName: (id: string) => string): string {
  const teile = g.proStandort.map(
    (s) => `${standortName(s.standortId)}: ${s.anzahl}${s.waesche > 0 ? ` (${s.waesche} in der Wäsche)` : ''}`,
  );
  return `${g.anzahl} Stück: ${teile.join(', ')}`;
}
