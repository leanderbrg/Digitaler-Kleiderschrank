import Dexie, { type EntityTable } from 'dexie';
import { normalisiereTeil } from '../lib/migration';
import type { Einstellung, Kategorie, Standort, Teil, Verlaufseintrag } from '../types';

export class KleiderschrankDB extends Dexie {
  teile!: EntityTable<Teil, 'id'>;
  standorte!: EntityTable<Standort, 'id'>;
  kategorien!: EntityTable<Kategorie, 'id'>;
  verlauf!: EntityTable<Verlaufseintrag, 'id'>;
  einstellungen!: EntityTable<Einstellung, 'key'>;

  constructor(name = 'kleiderschrank') {
    super(name);
    // Booleans lassen sich in IndexedDB nicht indizieren – "aussortiert" wird im Speicher gefiltert.
    this.version(1).stores({
      teile: 'id, kategorieId, standortId, status, erstelltAm',
      standorte: 'id, reihenfolge',
      kategorien: 'id, reihenfolge',
      verlauf: 'id, datum, teilId, aktion',
      einstellungen: 'key',
    });
    // Version 2: neuer Status "getragen". Bestehende Werte bleiben gültig; Verlaufsaktion
    // "wäsche" wird zu "status" (Details mit von/nach-Status bleiben unverändert).
    this.version(2)
      .stores({})
      .upgrade(async (tx) => {
        await tx.table('teile').toCollection().modify((t: Teil) => {
          Object.assign(t, normalisiereTeil(t));
        });
        await tx
          .table('verlauf')
          .where('aktion')
          .equals('wäsche')
          .modify((v: Verlaufseintrag) => {
            v.aktion = 'status';
          });
      });
    this.on('populate', (tx) => {
      tx.table('standorte').bulkAdd(STANDARD_STANDORTE);
      tx.table('kategorien').bulkAdd(STANDARD_KATEGORIEN);
    });
  }
}

export const STANDARD_STANDORTE: Standort[] = [
  { id: 'standort-1', name: 'Standort 1', reihenfolge: 1 },
  { id: 'standort-2', name: 'Standort 2', reihenfolge: 2 },
];

export const STANDARD_KATEGORIEN: Kategorie[] = [
  ['hosen', 'Hosen', '👖'],
  ['socken', 'Socken', '🧦'],
  ['unterhosen', 'Unterhosen', '🩲'],
  ['tshirts', 'T-Shirts', '👕'],
  ['hemden', 'Hemden', '👔'],
  ['pullover', 'Pullover', '🧶'],
  ['jacken', 'Jacken', '🧥'],
  ['schuhe', 'Schuhe', '👟'],
  ['sonstiges', 'Sonstiges', '📦'],
].map(([id, name, emoji], i) => ({ id, name, emoji, reihenfolge: i + 1 }));

export const db = new KleiderschrankDB();
