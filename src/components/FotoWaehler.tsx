import { useId, useRef, useState } from 'react';
import { useObjectUrl } from '../hooks/useObjectUrl';
import { fotoVorbereiten } from '../lib/bild';

export interface FotoDaten {
  foto: Blob;
  thumb: Blob;
}

interface Props {
  wert: FotoDaten | undefined;
  onChange: (f: FotoDaten | undefined) => void;
}

/** Foto aufnehmen (Handy-Kamera) oder auswählen (Desktop); wird vor dem Speichern verkleinert. */
export default function FotoWaehler({ wert, onChange }: Props) {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [laedt, setLaedt] = useState(false);
  const [fehler, setFehler] = useState<string>();
  const url = useObjectUrl(wert?.foto);

  async function dateiGewaehlt(datei: File | undefined) {
    if (!datei) return;
    setFehler(undefined);
    setLaedt(true);
    try {
      onChange(await fotoVorbereiten(datei));
    } catch {
      setFehler('Das Bild konnte nicht gelesen werden. Bitte ein anderes Foto versuchen.');
    } finally {
      setLaedt(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  }

  return (
    <div>
      <span className="label">Foto</span>
      <div className="flex items-center gap-3">
        <label
          htmlFor={inputId}
          className="flex h-32 w-32 shrink-0 cursor-pointer flex-col items-center justify-center overflow-hidden rounded-2xl border-2 border-dashed border-slate-300 bg-slate-100 text-center text-sm text-slate-600 hover:border-marke-500 focus-within:ring-2 focus-within:ring-marke-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
        >
          {laedt ? (
            <span>Wird verarbeitet …</span>
          ) : url ? (
            <img src={url} alt="Gewähltes Foto" className="h-full w-full object-cover" />
          ) : (
            <>
              <span aria-hidden="true" className="text-4xl">
                📷
              </span>
              <span className="px-2">Foto aufnehmen oder wählen</span>
            </>
          )}
          <input
            ref={inputRef}
            id={inputId}
            type="file"
            accept="image/*"
            capture="environment"
            className="sr-only"
            onChange={(e) => dateiGewaehlt(e.target.files?.[0])}
          />
        </label>
        <div className="flex flex-col gap-2">
          {wert && (
            <>
              <button type="button" className="btn-sekundaer" onClick={() => inputRef.current?.click()}>
                Foto ändern
              </button>
              <button type="button" className="btn-sekundaer" onClick={() => onChange(undefined)}>
                Foto entfernen
              </button>
            </>
          )}
          {!wert && <p className="text-sm text-slate-500 dark:text-slate-400">Optional, hilft beim Wiedererkennen.</p>}
        </div>
      </div>
      {fehler && <p className="mt-1 text-sm text-red-700 dark:text-red-400">{fehler}</p>}
    </div>
  );
}
