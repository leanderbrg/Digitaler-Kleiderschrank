import { useMemo } from 'react';
import type { Kategorie, Standort } from '../types';
import { useKategorien, useStandorte } from './useDaten';

/** Standorte/Kategorien plus Lookup-Funktionen für Namen und Emojis. */
export function useNachschlagen() {
  const standorte = useStandorte();
  const kategorien = useKategorien();
  return useMemo(() => {
    const sMap = new Map<string, Standort>(standorte.map((s) => [s.id, s]));
    const kMap = new Map<string, Kategorie>(kategorien.map((k) => [k.id, k]));
    return {
      standorte,
      kategorien,
      standortName: (id: string) => sMap.get(id)?.name ?? 'Unbekannt',
      kategorieName: (id: string) => kMap.get(id)?.name ?? 'Ohne Kategorie',
      kategorieEmoji: (id: string) => kMap.get(id)?.emoji ?? '📦',
      standortReihenfolge: standorte.map((s) => s.id),
      kategorieReihenfolge: kategorien.map((k) => k.id),
    };
  }, [standorte, kategorien]);
}
