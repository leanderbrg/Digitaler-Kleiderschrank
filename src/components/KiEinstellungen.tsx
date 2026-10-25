import { useState } from 'react';
import { useKi } from '../hooks/useKi';
import { kiLaden, kiLoeschen } from '../ki/kiDienst';
import { DOWNLOAD_MB } from '../ki/protokoll';
import Dialog from './Dialog';
import { useToast } from './Toast';

/** Einstellungen-Abschnitt: KI-Erkennung an/aus, Download mit Fortschritt, Modell löschen. */
export default function KiEinstellungen() {
  const { aktiv, zustand, setzeAktiv } = useKi();
  const [frageOffen, setFrageOffen] = useState(false);
  const toast = useToast();
  const vorhanden = zustand.phase === 'gecacht' || zustand.phase === 'bereit';

  async function umschalten() {
    if (aktiv) {
      await setzeAktiv(false);
      return;
    }
    if (vorhanden) await setzeAktiv(true);
    else setFrageOffen(true);
  }

  async function herunterladen() {
    setFrageOffen(false);
    await setzeAktiv(true);
    kiLaden();
  }

  async function loeschen() {
    await kiLoeschen();
    await setzeAktiv(false);
    toast.zeige('KI-Modell gelöscht');
  }

  return (
    <>
      <label className="flex min-h-[44px] cursor-pointer items-center justify-between gap-3">
        <span>
          <span className="block font-medium">KI-Erkennung aktivieren</span>
          <span className="block text-sm text-slate-600 dark:text-slate-400">
            Erkennt auf dem Foto Art und Farbe des Kleidungsstücks und schlägt Name, Kategorie und Farbe vor.
          </span>
        </span>
        <input type="checkbox" role="switch" checked={aktiv} onChange={umschalten} className="peer sr-only" />
        <span
          aria-hidden="true"
          className="relative h-7 w-12 shrink-0 rounded-full bg-slate-300 transition-colors after:absolute after:left-1 after:top-1 after:h-5 after:w-5 after:rounded-full after:bg-white after:transition-transform peer-checked:bg-marke-700 peer-checked:after:translate-x-5 peer-focus-visible:ring-2 peer-focus-visible:ring-marke-500 peer-focus-visible:ring-offset-2 dark:bg-slate-600"
        />
      </label>

      <div className="mt-3 rounded-xl bg-slate-50 p-3 text-sm dark:bg-slate-800/60" aria-live="polite">
        {zustand.phase === 'laedt' && (
          <div>
            <p className="mb-1 font-medium">
              Modell wird geladen … {zustand.prozent ?? 0} %
              {zustand.gesamtMB ? ` (${zustand.geladenMB} von ${zustand.gesamtMB} MB)` : ''}
            </p>
            <div
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={zustand.prozent ?? 0}
              aria-label="Download-Fortschritt"
              className="h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700"
            >
              <div className="h-full rounded-full bg-marke-700 transition-[width] dark:bg-teal-400" style={{ width: `${zustand.prozent ?? 0}%` }} />
            </div>
            <p className="mt-1 text-slate-600 dark:text-slate-400">Du kannst die App währenddessen normal weiter benutzen.</p>
          </div>
        )}
        {zustand.phase === 'bereit' && (
          <p>
            ✅ Modell bereit – läuft lokal mit {zustand.geraet === 'webgpu' ? 'WebGPU (Grafikchip)' : 'WebAssembly (Prozessor)'}.
          </p>
        )}
        {zustand.phase === 'gecacht' && <p>✅ Modell bereit – gespeichert und offline verfügbar.</p>}
        {zustand.phase === 'nicht-geladen' && <p>Modell nicht heruntergeladen (ca. {DOWNLOAD_MB} MB).</p>}
        {zustand.phase === 'fehler' && <p className="text-red-800 dark:text-red-300">⚠️ {zustand.meldung}</p>}
        {zustand.phase === 'unbekannt' && <p>Prüfe Modell …</p>}

        <div className="mt-2 flex flex-wrap gap-2">
          {(zustand.phase === 'nicht-geladen' || zustand.phase === 'fehler') && (
            <button type="button" className="btn-sekundaer" onClick={() => setFrageOffen(true)}>
              {zustand.phase === 'fehler' ? 'Erneut versuchen' : 'Modell herunterladen'}
            </button>
          )}
          {vorhanden && (
            <button type="button" className="btn-sekundaer" onClick={loeschen}>
              🗑️ Modell löschen
            </button>
          )}
        </div>
      </div>
      <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
        Die Erkennung läuft vollständig auf diesem Gerät. Fotos werden nicht hochgeladen; nur das Modell wird einmalig von
        Hugging Face heruntergeladen.
      </p>

      <Dialog
        offen={frageOffen}
        titel="KI-Modell herunterladen?"
        onSchliessen={() => setFrageOffen(false)}
        fuss={
          <>
            <button type="button" className="btn-sekundaer" onClick={() => setFrageOffen(false)}>
              Abbrechen
            </button>
            <button type="button" className="btn-primaer" onClick={herunterladen}>
              Herunterladen
            </button>
          </>
        }
      >
        <div className="space-y-2 text-sm">
          <p>
            Für die Erkennung wird einmalig ein Modell mit ca. <strong>{DOWNLOAD_MB} MB</strong> heruntergeladen und im Browser
            gespeichert. Danach funktioniert die Erkennung auch offline.
          </p>
          <p>📶 Am besten im WLAN herunterladen.</p>
          <p className="text-slate-600 dark:text-slate-400">
            Deine Fotos verlassen das Gerät nicht. Das Modell kannst du hier jederzeit wieder löschen.
          </p>
        </div>
      </Dialog>
    </>
  );
}
