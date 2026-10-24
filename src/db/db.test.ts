import 'fake-indexeddb/auto';
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
});
