import type { Verlaufseintrag } from '../types';

/** Textfelder speichern so lange nach der letzten Eingabe */
export const AUTOSPEICHERN_VERZOEGERUNG_MS = 600;
/** Bearbeitungen innerhalb dieses Fensters landen im selben "bearbeitet"-Verlaufseintrag */
export const BEARBEITUNGS_SITZUNG_MS = 2 * 60 * 1000;

export type SpeicherStatus = 'bereit' | 'speichert' | 'gespeichert' | 'fehler';

interface Optionen<T> {
  speichern: (stand: T) => Promise<void>;
  verzoegerung?: number;
  onStatus?: (s: SpeicherStatus) => void;
  /** Für Tests austauschbar */
  timer?: { setTimeout: (fn: () => void, ms: number) => unknown; clearTimeout: (id: unknown) => void };
}

export interface AutoSpeicher<T> {
  /** Neuen Stand vormerken. `sofort` speichert ohne Verzögerung (Auswahlfelder, Schalter, Foto). */
  aendern: (stand: T, sofort?: boolean) => void;
  /** Ausstehenden Stand sofort speichern und warten, bis alles geschrieben ist (onBlur, Seite verlassen). */
  flush: () => Promise<void>;
  /** Nach einem Fehler den letzten Stand erneut speichern */
  erneutVersuchen: () => Promise<void>;
  /** Vorgemerkten, noch nicht gestarteten Stand verwerfen (z. B. bei ungültiger Eingabe) */
  verwerfen: () => void;
  status: () => SpeicherStatus;
  /** Neuester noch nicht bestätigt gespeicherter Stand (ausstehend, laufend oder fehlgeschlagen) */
  offenerStand: () => T | null;
}

/**
 * Speicher-Warteschlange für ein Teil: entprellt Änderungen, führt Speichervorgänge
 * nacheinander aus (nie parallel) und schreibt immer nur den neuesten Stand.
 * Kommen während eines laufenden Speichervorgangs neue Änderungen, wird danach genau
 * einmal mit dem dann neuesten Stand gespeichert.
 */
export function erzeugeAutoSpeicher<T>(opt: Optionen<T>): AutoSpeicher<T> {
  const verzoegerung = opt.verzoegerung ?? AUTOSPEICHERN_VERZOEGERUNG_MS;
  const timer = opt.timer ?? {
    setTimeout: (fn: () => void, ms: number) => setTimeout(fn, ms),
    clearTimeout: (id: unknown) => clearTimeout(id as ReturnType<typeof setTimeout>),
  };
  let ausstehend: { stand: T } | null = null;
  let letzterFehlgeschlagen: { stand: T } | null = null;
  let inArbeit: { stand: T } | null = null;
  let laufend: Promise<void> | null = null;
  let timerId: unknown = null;
  let status: SpeicherStatus = 'bereit';

  const setzeStatus = (s: SpeicherStatus) => {
    status = s;
    opt.onStatus?.(s);
  };

  const timerStoppen = () => {
    if (timerId !== null) timer.clearTimeout(timerId);
    timerId = null;
  };

  /** Arbeitet die Warteschlange ab, bis nichts mehr aussteht. */
  function abarbeiten(): Promise<void> {
    if (laufend) return laufend;
    if (!ausstehend) return Promise.resolve();
    laufend = (async () => {
      while (ausstehend) {
        const { stand } = ausstehend;
        inArbeit = ausstehend;
        ausstehend = null;
        setzeStatus('speichert');
        try {
          await opt.speichern(stand);
          letzterFehlgeschlagen = null;
          inArbeit = null;
        } catch {
          inArbeit = null;
          // Neuere Änderungen haben Vorrang; sonst bleibt der Stand für "erneut versuchen" erhalten
          if (!ausstehend) {
            letzterFehlgeschlagen = { stand };
            setzeStatus('fehler');
            return;
          }
        }
      }
      setzeStatus('gespeichert');
    })().finally(() => {
      laufend = null;
    });
    return laufend;
  }

  return {
    aendern(stand, sofort = false) {
      ausstehend = { stand };
      letzterFehlgeschlagen = null;
      timerStoppen();
      if (sofort) {
        void abarbeiten();
      } else {
        timerId = timer.setTimeout(() => {
          timerId = null;
          void abarbeiten();
        }, verzoegerung);
      }
    },
    async flush() {
      timerStoppen();
      // Ein laufender Vorgang nimmt ausstehende Änderungen in seiner Schleife mit
      await abarbeiten();
      if (ausstehend) await abarbeiten();
    },
    async erneutVersuchen() {
      if (!ausstehend && letzterFehlgeschlagen) ausstehend = letzterFehlgeschlagen;
      letzterFehlgeschlagen = null;
      timerStoppen();
      await abarbeiten();
    },
    verwerfen() {
      timerStoppen();
      ausstehend = null;
    },
    status: () => status,
    offenerStand: () => (ausstehend ?? inArbeit ?? letzterFehlgeschlagen)?.stand ?? null,
  };
}

/** Präfix der Notfall-Entwürfe in localStorage (siehe useAutoSpeichern) */
export const ENTWURF_PRAEFIX = 'autospeichern-entwurf:';

/** Blobs (Foto) lassen sich nicht als JSON sichern – Fotos werden ohnehin sofort gespeichert. */
export function entwurfOhneBlobs<T extends object>(stand: T): Partial<T> {
  return Object.fromEntries(Object.entries(stand).filter(([, v]) => !(v instanceof Blob))) as Partial<T>;
}

/** Kommagetrennte Feldlisten vereinigen, Reihenfolge des ersten Vorkommens bleibt erhalten. */
export function vereinigeFelder(a: string | undefined, b: string | undefined): string {
  const felder = [...(a ?? '').split(','), ...(b ?? '').split(',')].map((f) => f.trim()).filter(Boolean);
  return [...new Set(felder)].join(', ');
}

/**
 * Fasst einen neuen "bearbeitet"-Eintrag mit dem letzten "bearbeitet"-Eintrag desselben
 * Teils zusammen, wenn dieser höchstens `fenster` ms alt ist. Andere Aktionen (Status,
 * Standort) bleiben eigene Einträge.
 */
export function fasseVerlaufZusammen(
  neue: Verlaufseintrag[],
  letzterBearbeitet: Verlaufseintrag | undefined,
  jetzt: number,
  fenster = BEARBEITUNGS_SITZUNG_MS,
): { hinzufuegen: Verlaufseintrag[]; aktualisieren?: Verlaufseintrag } {
  const neu = neue.find((v) => v.aktion === 'bearbeitet');
  if (!neu || !letzterBearbeitet || letzterBearbeitet.aktion !== 'bearbeitet' || letzterBearbeitet.teilId !== neu.teilId) {
    return { hinzufuegen: neue };
  }
  if (jetzt - letzterBearbeitet.datum > fenster) return { hinzufuegen: neue };
  return {
    hinzufuegen: neue.filter((v) => v !== neu),
    aktualisieren: {
      ...letzterBearbeitet,
      datum: jetzt,
      teilName: neu.teilName,
      kategorieId: neu.kategorieId,
      details: { ...letzterBearbeitet.details, text: vereinigeFelder(letzterBearbeitet.details?.text, neu.details?.text) },
    },
  };
}
