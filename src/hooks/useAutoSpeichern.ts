import { useEffect, useMemo, useState } from 'react';
import { teilAutoSpeichern } from '../db/repo';
import type { TeilDaten } from '../lib/aktionen';
import { ENTWURF_PRAEFIX, entwurfOhneBlobs, erzeugeAutoSpeicher, type SpeicherStatus } from '../lib/autoSpeichern';

/**
 * Auto-Speichern für ein bestehendes Teil. Ausstehende Änderungen werden beim Verlassen
 * der Seite (Unmount) und beim Tab-Wechsel (visibilitychange) geschrieben. Beim Schließen
 * oder Neuladen (pagehide) reicht die Zeit für IndexedDB evtl. nicht – dann wird der offene
 * Stand zusätzlich synchron als Notfall-Entwurf in localStorage gesichert und beim nächsten
 * Start nachgetragen (siehe entwuerfeNachtragen in repo.ts).
 */
export function useAutoSpeichern(teilId: string | undefined) {
  const [status, setStatus] = useState<SpeicherStatus>('bereit');

  const speicher = useMemo(
    () =>
      teilId
        ? erzeugeAutoSpeicher<Partial<TeilDaten>>({
            speichern: (daten) =>
              teilAutoSpeichern(teilId, daten).catch((e) => {
                console.error('Auto-Speichern fehlgeschlagen', e);
                throw e;
              }),
            onStatus: setStatus,
          })
        : null,
    [teilId],
  );

  useEffect(() => {
    if (!speicher || !teilId) return;
    const schluessel = ENTWURF_PRAEFIX + teilId;
    const sichern = () => void speicher.flush();
    const beiVerstecken = () => document.visibilityState === 'hidden' && sichern();
    const beimEntladen = () => {
      const offen = speicher.offenerStand();
      if (!offen) return;
      try {
        localStorage.setItem(schluessel, JSON.stringify(entwurfOhneBlobs(offen)));
      } catch {
        /* Speicher voll/gesperrt – dann bleibt nur der asynchrone Versuch */
      }
      // Überlebt die Seite (bfcache), ist der Entwurf nach dem Speichern überflüssig
      void speicher.flush().then(() => {
        try {
          localStorage.removeItem(schluessel);
        } catch {
          /* ignorieren */
        }
      });
    };
    document.addEventListener('visibilitychange', beiVerstecken);
    window.addEventListener('pagehide', beimEntladen);
    return () => {
      document.removeEventListener('visibilitychange', beiVerstecken);
      window.removeEventListener('pagehide', beimEntladen);
      sichern(); // Zurück-Navigation innerhalb der App: nichts verlieren
    };
  }, [speicher, teilId]);

  return { status, speicher };
}
