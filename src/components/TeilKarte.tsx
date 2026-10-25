import { Link } from 'react-router-dom';
import { statusSetzen } from '../db/repo';
import { useNachschlagen } from '../hooks/useNachschlagen';
import { STATUS_LABEL, type Status, type Teil } from '../types';
import { StatusBadge, StatusWahl } from './Status';
import TeilFoto from './TeilFoto';
import { useToast } from './Toast';

interface Props {
  teil: Teil;
  /** Großes Foto (Gruppen-Detail) statt kleinem Thumbnail */
  gross?: boolean;
  auswahlModus?: boolean;
  gewaehlt?: boolean;
  onUmschalten?: () => void;
  onVerschieben?: () => void;
  onAussortieren?: () => void;
}

export default function TeilKarte({ teil, gross, auswahlModus, gewaehlt, onUmschalten, onVerschieben, onAussortieren }: Props) {
  const n = useNachschlagen();
  const toast = useToast();

  async function statusAendern(status: Status | undefined) {
    if (!status || status === teil.status) return;
    const e = await statusSetzen([teil.id], status);
    toast.zeige(`„${teil.name}“: ${STATUS_LABEL[status]}`, e.rueckgaengig);
  }

  const details = [teil.groesse && `Gr. ${teil.groesse}`, teil.zustand === 'abgetragen' && 'abgetragen']
    .filter(Boolean)
    .join(' · ');

  const aktionsKlasse =
    'flex min-h-[48px] flex-col items-center justify-center text-xs font-medium text-slate-700 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800';

  return (
    <div className={`karte overflow-hidden ${gewaehlt ? 'ring-2 ring-marke-700' : ''}`}>
      <div className="flex gap-3 p-3">
        {auswahlModus && (
          <label className="-m-1 flex items-center p-1">
            <input
              type="checkbox"
              checked={!!gewaehlt}
              onChange={onUmschalten}
              className="h-6 w-6 accent-marke-700"
              aria-label={`${teil.name} auswählen`}
            />
          </label>
        )}
        {/* Im Auswahlmodus schaltet auch ein Tipp aufs Foto (die Checkbox bleibt das zugängliche Element) */}
        <div onClick={auswahlModus ? onUmschalten : undefined} className={auswahlModus ? 'cursor-pointer' : ''}>
          <TeilFoto
            blob={gross ? teil.foto : teil.thumb}
            alt={`Foto von ${teil.name}`}
            emoji={n.kategorieEmoji(teil.kategorieId)}
            className={gross ? 'h-28 w-28 sm:h-36 sm:w-36' : 'h-16 w-16'}
          />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold">{teil.name}</p>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            📍 {n.standortName(teil.standortId)}
            {teil.farbe && ` · ${teil.farbe}`}
          </p>
          <p className="mt-1 flex flex-wrap gap-1 text-xs">
            <StatusBadge status={teil.status} />
            {details && (
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                {details}
              </span>
            )}
          </p>
          {teil.notiz && gross && <p className="mt-1 line-clamp-2 text-sm text-slate-600 dark:text-slate-400">{teil.notiz}</p>}
        </div>
      </div>
      {!auswahlModus && (
        <>
          <div className="px-3 pb-3">
            <StatusWahl wert={teil.status} onChange={statusAendern} ariaLabel={`Status von ${teil.name}`} kompakt />
          </div>
          <div className="grid grid-cols-3 border-t border-slate-100 dark:border-slate-800">
            <button type="button" onClick={onVerschieben} className={aktionsKlasse}>
              <span aria-hidden="true">🔀</span>Verschieben
            </button>
            <button
              type="button"
              onClick={onAussortieren}
              className="flex min-h-[48px] flex-col items-center justify-center text-xs font-medium text-red-800 hover:bg-red-50 dark:text-red-300 dark:hover:bg-red-950/40"
            >
              <span aria-hidden="true">🗑️</span>Aussortieren
            </button>
            <Link to={`/teil/${teil.id}`} className={aktionsKlasse}>
              <span aria-hidden="true">✏️</span>Bearbeiten
            </Link>
          </div>
        </>
      )}
    </div>
  );
}
