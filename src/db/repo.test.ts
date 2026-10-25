import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import { db } from './db';
import { aussortieren, endgueltigLoeschen, entwuerfeNachtragen, teilAutoSpeichern, teileHinzufuegen, verschieben, wiederherstellen } from './repo';

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

  it('Auto-Speichern fasst Bearbeitungen einer Sitzung zusammen, Statuswechsel bleiben einzeln', async () => {
    const { ids } = await teileHinzufuegen(basis, 1);
    const id = ids[0];
    const t0 = Date.now();
    await teilAutoSpeichern(id, { name: 'Socke weiß' }, t0);
    await teilAutoSpeichern(id, { farbe: 'weiß' }, t0 + 30_000);
    await teilAutoSpeichern(id, { status: 'getragen' }, t0 + 40_000);
    await teilAutoSpeichern(id, { notiz: 'Lieblingssocke' }, t0 + 60_000);
    await teilAutoSpeichern(id, { notiz: 'Lieblingssocke' }, t0 + 70_000); // keine Änderung → kein Eintrag

    const verlauf = await db.verlauf.where('teilId').equals(id).sortBy('datum');
    expect(verlauf.map((v) => v.aktion)).toEqual(['hinzugefügt', 'status', 'bearbeitet']);
    const bearbeitet = verlauf.find((v) => v.aktion === 'bearbeitet')!;
    expect(bearbeitet.details?.text).toBe('Name, Farbe, Notiz');
    expect(bearbeitet.datum).toBe(t0 + 60_000);

    // Nach mehr als 2 Minuten beginnt ein neuer Eintrag
    await teilAutoSpeichern(id, { groesse: '43' }, t0 + 60_000 + 3 * 60_000);
    expect(await db.verlauf.where('aktion').equals('bearbeitet').count()).toBe(2);
    expect(await db.teile.get(id)).toMatchObject({ name: 'Socke weiß', farbe: 'weiß', status: 'getragen', groesse: '43' });
  });

  it('trägt Notfall-Entwürfe nach und verwirft ungültige', async () => {
    const { ids } = await teileHinzufuegen(basis, 2);
    const daten = new Map<string, string>([
      [`autospeichern-entwurf:${ids[0]}`, JSON.stringify({ name: 'Nachgetragen', notiz: 'beim Schließen' })],
      [`autospeichern-entwurf:${ids[1]}`, JSON.stringify({ name: '   ' })],
      ['autospeichern-entwurf:gibtsnicht', JSON.stringify({ name: 'X' })],
      ['anderer-schluessel', 'bleibt'],
    ]);
    const speicher = {
      get length() {
        return daten.size;
      },
      key: (i: number) => [...daten.keys()][i] ?? null,
      getItem: (k: string) => daten.get(k) ?? null,
      setItem: (k: string, v: string) => void daten.set(k, v),
      removeItem: (k: string) => void daten.delete(k),
      clear: () => daten.clear(),
    } as Storage;

    expect(await entwuerfeNachtragen(speicher)).toBe(1);
    expect(await db.teile.get(ids[0])).toMatchObject({ name: 'Nachgetragen', notiz: 'beim Schließen' });
    expect((await db.teile.get(ids[1]))?.name).toBe('Socke');
    expect([...daten.keys()]).toEqual(['anderer-schluessel']);
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
