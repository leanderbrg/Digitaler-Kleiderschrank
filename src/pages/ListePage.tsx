import { useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import GruppenKarte from '../components/GruppenKarte';
import LeerZustand from '../components/LeerZustand';
import Seite from '../components/Seite';
import TeilListe from '../components/TeilListe';
import { useAktiveTeile } from '../hooks/useDaten';
import { useNachschlagen } from '../hooks/useNachschlagen';
import { filterTeile, type TeilFilter } from '../lib/filter';
import { gruppiere } from '../lib/gruppierung';
import type { Status } from '../types';

export default function ListePage() {
  const [params, setParams] = useSearchParams();
  const n = useNachschlagen();
  const teile = useAktiveTeile();

  const filter: TeilFilter = {
    standortId: params.get('standort') ?? undefined,
    kategorieId: params.get('kategorie') ?? undefined,
    status: (params.get('status') as Status | null) ?? undefined,
    suche: params.get('q') ?? undefined,
  };
  const ansicht = params.get('ansicht') === 'einzeln' ? 'einzeln' : 'gruppen';

  const setzeParam = (key: string, wert: string | undefined) => {
    const neu = new URLSearchParams(params);
    if (wert) neu.set(key, wert);
    else neu.delete(key);
    setParams(neu, { replace: true });
  };

  const gefiltert = useMemo(
    () => filterTeile(teile ?? [], filter, n.kategorieName),
    [teile, filter.standortId, filter.kategorieId, filter.status, filter.suche, n],
  );
  const gruppen = useMemo(
    () =>
      gruppiere(gefiltert, { standortReihenfolge: n.standortReihenfolge, kategorieReihenfolge: n.kategorieReihenfolge }),
    [gefiltert, n],
  );

  const filterAktiv = !!(filter.standortId || filter.kategorieId || filter.status || filter.suche);
  const neuLink = `/neu?${new URLSearchParams({
    ...(filter.standortId ? { standort: filter.standortId } : {}),
    ...(filter.kategorieId ? { kategorie: filter.kategorieId } : {}),
  })}`;

  return (
    <Seite
      titel="Liste"
      aktionen={
        <Link to="/verschieben" className="btn-sekundaer px-3">
          🧳 Packliste
        </Link>
      }
    >
      <div className="mb-4 space-y-3">
        <label htmlFor="suche" className="sr-only">
          Suche
        </label>
        <input
          id="suche"
          type="search"
          className="eingabe"
          placeholder="🔍 Suchen nach Name, Farbe, Größe …"
          value={filter.suche ?? ''}
          onChange={(e) => setzeParam('q', e.target.value)}
        />

        <div className="grid grid-cols-3 gap-2">
          <div>
            <label htmlFor="f-standort" className="label">
              Standort
            </label>
            <select
              id="f-standort"
              className="eingabe"
              value={filter.standortId ?? ''}
              onChange={(e) => setzeParam('standort', e.target.value)}
            >
              <option value="">Alle</option>
              {n.standorte.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="f-kategorie" className="label">
              Kategorie
            </label>
            <select
              id="f-kategorie"
              className="eingabe"
              value={filter.kategorieId ?? ''}
              onChange={(e) => setzeParam('kategorie', e.target.value)}
            >
              <option value="">Alle</option>
              {n.kategorien.map((k) => (
                <option key={k.id} value={k.id}>
                  {k.emoji} {k.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="f-status" className="label">
              Status
            </label>
            <select
              id="f-status"
              className="eingabe"
              value={filter.status ?? ''}
              onChange={(e) => setzeParam('status', e.target.value)}
            >
              <option value="">Alle</option>
              <option value="schrank">🗄️ Im Schrank</option>
              <option value="getragen">🪑 Getragen</option>
              <option value="waesche">🧺 In der Wäsche</option>
            </select>
          </div>
        </div>

        <div className="flex items-center justify-between gap-2">
          <div role="group" aria-label="Ansicht" className="inline-flex rounded-xl bg-slate-200 p-1 dark:bg-slate-800">
            {(
              [
                ['gruppen', 'Gruppen'],
                ['einzeln', 'Einzelteile'],
              ] as const
            ).map(([wert, label]) => (
              <button
                key={wert}
                type="button"
                aria-pressed={ansicht === wert}
                onClick={() => setzeParam('ansicht', wert === 'gruppen' ? undefined : wert)}
                className={`min-h-[40px] rounded-lg px-3 text-sm font-medium ${
                  ansicht === wert
                    ? 'bg-white text-slate-900 shadow dark:bg-slate-950 dark:text-white'
                    : 'text-slate-600 dark:text-slate-300'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          <p className="text-sm text-slate-600 dark:text-slate-400" aria-live="polite">
            {gefiltert.length} {gefiltert.length === 1 ? 'Teil' : 'Teile'}
            {ansicht === 'gruppen' && ` · ${gruppen.length} ${gruppen.length === 1 ? 'Gruppe' : 'Gruppen'}`}
          </p>
        </div>
        {filterAktiv && (
          <button type="button" className="text-sm font-medium text-marke-700 underline dark:text-teal-400" onClick={() => setParams({}, { replace: true })}>
            Filter zurücksetzen
          </button>
        )}
      </div>

      {teile === undefined ? null : teile.length === 0 ? (
        <LeerZustand titel="Noch keine Teile">Tippe unten auf „+“, um dein erstes Kleidungsstück zu erfassen.</LeerZustand>
      ) : gefiltert.length === 0 ? (
        <LeerZustand emoji="🔍" titel="Keine Treffer">
          Passe die Filter an oder{' '}
          <Link to={neuLink} className="font-medium text-marke-700 underline dark:text-teal-400">
            lege ein neues Teil an
          </Link>
          .
        </LeerZustand>
      ) : ansicht === 'gruppen' ? (
        <ul className="space-y-2">
          {gruppen.map((g) => (
            <li key={g.schluessel}>
              <GruppenKarte gruppe={g} standortName={n.standortName} kategorieEmoji={n.kategorieEmoji} />
            </li>
          ))}
        </ul>
      ) : (
        <TeilListe teile={gefiltert} />
      )}
    </Seite>
  );
}
