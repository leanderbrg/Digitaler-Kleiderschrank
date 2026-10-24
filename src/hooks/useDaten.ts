import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/db';
import type { Kategorie, Standort, Teil, Verlaufseintrag } from '../types';

const LEER: never[] = [];

export function useStandorte(): Standort[] {
  return useLiveQuery(() => db.standorte.orderBy('reihenfolge').toArray(), []) ?? LEER;
}

export function useKategorien(): Kategorie[] {
  return useLiveQuery(() => db.kategorien.orderBy('reihenfolge').toArray(), []) ?? LEER;
}

/** Alle Teile inkl. aussortierter. `undefined` solange geladen wird. */
export function useAlleTeile(): Teil[] | undefined {
  return useLiveQuery(() => db.teile.orderBy('erstelltAm').toArray(), []);
}

/** Nur aktive (nicht aussortierte) Teile. `undefined` solange geladen wird. */
export function useAktiveTeile(): Teil[] | undefined {
  return useLiveQuery(
    () =>
      db.teile
        .orderBy('erstelltAm')
        .filter((t) => !t.aussortiert)
        .toArray(),
    [],
  );
}

export function useTeil(id: string | undefined): Teil | undefined | null {
  return useLiveQuery(async () => (id ? ((await db.teile.get(id)) ?? null) : null), [id]);
}

export function useVerlauf(): Verlaufseintrag[] | undefined {
  return useLiveQuery(() => db.verlauf.orderBy('datum').reverse().toArray(), []);
}

export function useEinstellung<T>(key: string): T | undefined {
  return useLiveQuery(async () => (await db.einstellungen.get(key))?.value as T | undefined, [key]);
}

export async function setzeEinstellung(key: string, value: unknown): Promise<void> {
  await db.einstellungen.put({ key, value });
}
