import { useCallback, useRef, useState } from 'react';
import { kiKlassifizieren, kiZustand } from '../ki/kiDienst';
import { farbeAusBild } from '../lib/bild';
import { erkenneKleidungsstueck, type ErkennungsErgebnis } from '../lib/erkennung';
import type { Kategorie } from '../types';

export interface ErkennungsAnzeige {
  laeuft: boolean;
  ergebnis?: ErkennungsErgebnis;
  /** Kurze, verständliche Meldung (nicht blockierend) */
  meldung?: string;
}

/**
 * Führt die Erkennung für ein Foto aus. Ältere, noch laufende Anfragen werden verworfen,
 * wenn inzwischen ein neues Foto gewählt wurde.
 */
export function useKiErkennung(kategorien: Pick<Kategorie, 'id' | 'name'>[]) {
  const [anzeige, setAnzeige] = useState<ErkennungsAnzeige>({ laeuft: false });
  const anfrage = useRef(0);

  const zuruecksetzen = useCallback(() => {
    anfrage.current++;
    setAnzeige({ laeuft: false });
  }, []);

  const erkenne = useCallback(
    async (foto: Blob): Promise<ErkennungsErgebnis | null> => {
      const nr = ++anfrage.current;
      setAnzeige({ laeuft: true });
      const modellFehlt = kiZustand().phase === 'nicht-geladen';
      const ergebnis = await erkenneKleidungsstueck(
        foto,
        {
          // Ohne heruntergeladenes Modell wird nichts ungefragt heruntergeladen – nur die Farbe erkannt
          klassifizieren: modellFehlt ? () => Promise.reject(new Error('nicht-geladen')) : kiKlassifizieren,
          farbeAnalysieren: farbeAusBild,
        },
        kategorien,
      );
      if (nr !== anfrage.current) return null; // veraltet
      let meldung: string | undefined;
      if (ergebnis.kiFehler) {
        meldung = modellFehlt
          ? 'KI-Modell noch nicht heruntergeladen (Einstellungen → KI-Erkennung). Nur die Farbe wurde erkannt.'
          : `${kiZustand().meldung ?? 'Die KI-Erkennung ist gerade nicht verfügbar.'} Du kannst ganz normal weitermachen.`;
      } else if (ergebnis.erkennung && !ergebnis.erkennung.sicher) {
        meldung = 'Nicht sicher erkannt.';
      }
      setAnzeige({ laeuft: false, ergebnis, meldung });
      return ergebnis;
    },
    [kategorien],
  );

  return { anzeige, erkenne, zuruecksetzen };
}
