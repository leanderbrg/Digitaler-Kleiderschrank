import { useEffect, useSyncExternalStore } from 'react';
import { kiAbonnieren, kiCachePruefen, kiZustand, type KiZustand } from '../ki/kiDienst';
import { setzeEinstellung, useEinstellung } from './useDaten';

/** Zustand der KI-Erkennung (Modell geladen/gecacht/…) plus Schalter aus den Einstellungen. */
export function useKi(): { aktiv: boolean; zustand: KiZustand; setzeAktiv: (an: boolean) => Promise<void> } {
  const zustand = useSyncExternalStore(kiAbonnieren, kiZustand);
  const aktiv = useEinstellung<boolean>('kiAktiv') ?? false;

  useEffect(() => {
    if (zustand.phase === 'unbekannt') void kiCachePruefen();
  }, [zustand.phase]);

  return { aktiv, zustand, setzeAktiv: (an) => setzeEinstellung('kiAktiv', an) };
}
