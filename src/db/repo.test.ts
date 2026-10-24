import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import { db } from './db';
import { aussortieren, endgueltigLoeschen, teileHinzufuegen, verschieben, wiederherstellen } from './repo';

const basis = { name: 'Socke', kategorieId: 'socken', standortId: 'standort-1', status: 'schrank', zustand: 'gut' } as const;

beforeEach(async () => {
  await db.teile.clear();
  await db.verlauf.clear();
});

describe('repo', () => {
  it('legt N Teile an und schreibt Verlauf; Rückgängig entfernt beides', async () => {
    const e = await teileHinzufuegen(basis, 3);
    expect(await db.teile.count()).toBe(3);
    expect(await db.verlauf.count()).toBe(3);
    await e.rueckgaengig();
    expect(await db.teile.count()).toBe(0);
    expect(await db.verlauf.count()).toBe(0);
  });

  it('aussortieren ist Soft-Delete und lässt sich rückgängig machen', async () => {
    const { ids } = await teileHinzufuegen(basis, 2);
    const e = await aussortieren([ids[0]], 'Loch');
    expect(e.anzahl).toBe(1);
    expect((await db.teile.get(ids[0]))?.aussortiert).toBe(true);
    expect(await db.teile.count()).toBe(2);
    await e.rueckgaengig();
    expect((await db.teile.get(ids[0]))?.aussortiert).toBe(false);
    expect(await db.verlauf.where('aktion').equals('aussortiert').count()).toBe(0);
  });

  it('verschiebt mit Status und stellt den alten Zustand wieder her', async () => {
    const { ids } = await teileHinzufuegen(basis, 2);
    const e = await verschieben(ids, 'standort-2', 'waesche');
    expect((await db.teile.bulkGet(ids)).map((t) => [t?.standortId, t?.status])).toEqual([
      ['standort-2', 'waesche'],
      ['standort-2', 'waesche'],
    ]);
    await e.rueckgaengig();
    expect((await db.teile.bulkGet(ids)).map((t) => [t?.standortId, t?.status])).toEqual([
      ['standort-1', 'schrank'],
      ['standort-1', 'schrank'],
    ]);
  });

  it('löscht endgültig nur aussortierte Teile, Verlauf bleibt', async () => {
    const { ids } = await teileHinzufuegen(basis, 2);
    await aussortieren([ids[0]], 'verschenkt');
    expect(await endgueltigLoeschen(ids)).toBe(1);
    expect(await db.teile.count()).toBe(1);
    expect(await db.verlauf.where('teilId').equals(ids[0]).count()).toBe(2);
    await wiederherstellen([ids[1]]); // nicht aussortiert → keine Änderung
    expect(await db.verlauf.where('aktion').equals('wiederhergestellt').count()).toBe(0);
  });
});
