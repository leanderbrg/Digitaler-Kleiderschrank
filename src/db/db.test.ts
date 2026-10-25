import 'fake-indexeddb/auto';
import Dexie from 'dexie';
import { describe, expect, it } from 'vitest';
import { KleiderschrankDB } from './db';

describe('KleiderschrankDB', () => {
  it('legt beim ersten Öffnen Standard-Standorte und -Kategorien an', async () => {
    const db = new KleiderschrankDB('test-populate');
    const standorte = await db.standorte.orderBy('reihenfolge').toArray();
    const kategorien = await db.kategorien.orderBy('reihenfolge').toArray();
    expect(standorte.map((s) => s.name)).toEqual(['Standort 1', 'Standort 2']);
    expect(kategorien.map((k) => k.name)).toEqual([
      'Hosen',
      'Socken',
      'Unterhosen',
      'T-Shirts',
      'Hemden',
      'Pullover',
      'Jacken',
      'Schuhe',
      'Sonstiges',
    ]);
    db.close();
  });

  it('migriert eine Datenbank aus Version 1 ohne Datenverlust', async () => {
    // Version-1-Datenbank mit dem damaligen Schema anlegen
    const alt = new Dexie('test-migration');
    alt.version(1).stores({
      teile: 'id, kategorieId, standortId, status, erstelltAm',
      standorte: 'id, reihenfolge',
      kategorien: 'id, reihenfolge',
      verlauf: 'id, datum, teilId, aktion',
      einstellungen: 'key',
    });
    await alt.table('teile').bulkAdd([
      { id: 'a', name: 'Jeans', kategorieId: 'hosen', standortId: 'standort-1', status: 'waesche', zustand: 'gut', erstelltAm: 1, geaendertAm: 1, aussortiert: false },
      { id: 'b', name: 'Shirt', kategorieId: 'tshirts', standortId: 'standort-2', status: 'schrank', zustand: 'gut', erstelltAm: 2, geaendertAm: 2, aussortiert: true, aussortierGrund: 'Loch' },
    ]);
    await alt.table('verlauf').add({
      id: 'v1', datum: 3, teilId: 'a', teilName: 'Jeans', kategorieId: 'hosen', aktion: 'wäsche',
      details: { vonStatus: 'schrank', nachStatus: 'waesche' },
    });
    alt.close();

    const db = new KleiderschrankDB('test-migration');
    expect(db.verno).toBe(2);
    const teile = await db.teile.orderBy('erstelltAm').toArray();
    expect(teile.map((t) => [t.id, t.status, t.aussortiert, t.aussortierGrund])).toEqual([
      ['a', 'waesche', false, undefined],
      ['b', 'schrank', true, 'Loch'],
    ]);
    const [v] = await db.verlauf.toArray();
    expect(v.aktion).toBe('status');
    expect(v.details).toEqual({ vonStatus: 'schrank', nachStatus: 'waesche' });
    db.close();
  });
});
