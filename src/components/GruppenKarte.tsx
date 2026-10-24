import { Link } from 'react-router-dom';
import { formatAufschluesselung, type Gruppe } from '../lib/gruppierung';
import TeilFoto from './TeilFoto';

interface Props {
  gruppe: Gruppe;
  standortName: (id: string) => string;
  kategorieEmoji: (id: string) => string;
}

export function gruppenPfad(schluessel: string): string {
  return `/gruppe/${encodeURIComponent(schluessel)}`;
}

export default function GruppenKarte({ gruppe, standortName, kategorieEmoji }: Props) {
  const vorschau = gruppe.teile.find((t) => t.thumb)?.thumb ?? gruppe.teile[0]?.thumb;
  const emoji = kategorieEmoji(gruppe.kategorieId);
  return (
    <Link
      to={gruppenPfad(gruppe.schluessel)}
      className="karte flex items-center gap-3 p-3 transition hover:ring-marke-500"
    >
      <TeilFoto blob={vorschau} alt="" emoji={emoji} className="h-16 w-16" />
      <div className="min-w-0 flex-1">
        <p className="truncate font-semibold">
          <span aria-hidden="true">{emoji} </span>
          {gruppe.name}
          {gruppe.farbe && <span className="font-normal text-slate-500 dark:text-slate-400"> · {gruppe.farbe}</span>}
        </p>
        <p className="text-sm text-slate-600 dark:text-slate-400">{formatAufschluesselung(gruppe, standortName)}</p>
      </div>
      <span className="rounded-full bg-marke-50 px-2.5 py-1 text-sm font-bold text-marke-800 dark:bg-teal-900/40 dark:text-teal-300">
        {gruppe.anzahl}
      </span>
    </Link>
  );
}
