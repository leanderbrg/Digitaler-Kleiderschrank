import { useMemo } from 'react';
import { Link, useParams } from 'react-router-dom';
import LeerZustand from '../components/LeerZustand';
import Seite from '../components/Seite';
import TeilListe from '../components/TeilListe';
import { useAktiveTeile } from '../hooks/useDaten';
import { useNachschlagen } from '../hooks/useNachschlagen';
import { formatAufschluesselung, gruppiere } from '../lib/gruppierung';

export default function GruppePage() {
  const { schluessel = '' } = useParams();
  const teile = useAktiveTeile();
  const n = useNachschlagen();

  const gruppe = useMemo(
    () => gruppiere(teile ?? [], { standortReihenfolge: n.standortReihenfolge }).find((g) => g.schluessel === schluessel),
    [teile, schluessel, n],
  );

  if (teile === undefined) return null;

  if (!gruppe) {
    return (
      <Seite titel="Gruppe" zurueck>
        <LeerZustand emoji="📭" titel="Diese Gruppe ist leer">
          Alle Teile wurden aussortiert oder umbenannt.{' '}
          <Link to="/liste" className="font-medium text-marke-700 underline dark:text-teal-400">
            Zur Liste
          </Link>
        </LeerZustand>
      </Seite>
    );
  }

  return (
    <Seite titel={gruppe.name} zurueck>
      <div className="karte mb-4 p-4">
        <p className="text-sm text-slate-600 dark:text-slate-400">
          <span aria-hidden="true">{n.kategorieEmoji(gruppe.kategorieId)} </span>
          {n.kategorieName(gruppe.kategorieId)}
          {gruppe.farbe && ` · ${gruppe.farbe}`}
        </p>
        <p className="mt-1 font-medium">{formatAufschluesselung(gruppe, n.standortName)}</p>
        <Link to={`/neu?vorlage=${gruppe.teile[0].id}`} className="btn-primaer mt-3 w-full">
          + Weiteres Teil dieser Gruppe hinzufügen
        </Link>
      </div>
      <TeilListe teile={gruppe.teile} gross />
    </Seite>
  );
}
