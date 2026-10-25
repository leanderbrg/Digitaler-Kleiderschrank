import type { SpeicherStatus } from '../lib/autoSpeichern';

/** Dezente Statusanzeige für Auto-Speichern ("Speichert …" / "Gespeichert ✓" / Fehler mit Wiederholen). */
export default function SpeicherAnzeige({ status, onErneut }: { status: SpeicherStatus; onErneut: () => void }) {
  return (
    <div aria-live="polite" className="min-w-[7rem] text-right text-sm">
      {status === 'speichert' && <span className="text-slate-500 dark:text-slate-400">Speichert …</span>}
      {status === 'gespeichert' && <span className="text-emerald-700 dark:text-emerald-400">Gespeichert ✓</span>}
      {status === 'fehler' && (
        <button
          type="button"
          onClick={onErneut}
          className="btn-klein bg-red-50 text-red-800 hover:bg-red-100 dark:bg-red-950/50 dark:text-red-200"
        >
          Nicht gespeichert – erneut versuchen
        </button>
      )}
    </div>
  );
}
