import { Link } from 'react-router-dom';
import { useNachschlagen } from '../hooks/useNachschlagen';
import { STATUS_LABEL, type Teil } from '../types';
import TeilFoto from './TeilFoto';

export default function TeilListe({ teile }: { teile: Teil[] }) {
  const n = useNachschlagen();
  return (
    <ul className="space-y-2">
      {teile.map((t) => (
        <li key={t.id}>
          <Link to={`/teil/${t.id}`} className="karte flex items-center gap-3 p-3">
            <TeilFoto blob={t.thumb} alt="" emoji={n.kategorieEmoji(t.kategorieId)} />
            <div className="min-w-0 flex-1">
              <p className="truncate font-semibold">{t.name}</p>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                {n.standortName(t.standortId)} · {STATUS_LABEL[t.status]}
              </p>
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}
