import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import LeerZustand from '../components/LeerZustand';
import Seite from '../components/Seite';
import { useAktiveTeile } from '../hooks/useDaten';
import { useNachschlagen } from '../hooks/useNachschlagen';
import { bestandMatrix, standortSummen } from '../lib/statistik';
import BeispieldatenButton from '../components/BeispieldatenButton';

function listePfad(filter: { standort?: string; kategorie?: string; status?: string }) {
  const p = new URLSearchParams(Object.entries(filter).filter(([, v]) => v) as [string, string][]);
  const s = p.toString();
  return s ? `/liste?${s}` : '/liste';
}

export default function UebersichtPage() {
  const teile = useAktiveTeile();
  const n = useNachschlagen();

  const summen = useMemo(() => standortSummen(teile ?? [], n.standortReihenfolge), [teile, n]);
  const matrix = useMemo(
    () => bestandMatrix(teile ?? [], n.kategorieReihenfolge, n.standortReihenfolge),
    [teile, n],
  );

  if (teile === undefined) return null;

  return (
    <Seite
      titel="Übersicht"
      aktionen={
        <Link to="/verschieben" className="btn-sekundaer px-3">
          🧳 Packliste
        </Link>
      }
    >
      <div className="mb-6 grid grid-cols-2 gap-3">
        {summen.map((s) => (
          <Link
            key={s.standortId}
            to={listePfad({ standort: s.standortId })}
            className="karte flex flex-col gap-1 p-4 transition hover:ring-marke-500"
          >
            <span className="truncate text-sm font-medium text-slate-600 dark:text-slate-400">📍 {n.standortName(s.standortId)}</span>
            <span className="text-4xl font-bold tabular-nums">{s.gesamt}</span>
            <span className="text-sm text-slate-600 dark:text-slate-400">{s.gesamt === 1 ? 'Teil gesamt' : 'Teile gesamt'}</span>
            <span className="text-sm">
              <span className="block text-amber-800 dark:text-amber-300">🪑 {s.getragen} getragen</span>
              <span className="block text-sky-800 dark:text-sky-300">🧺 {s.waesche} in der Wäsche</span>
            </span>
          </Link>
        ))}
      </div>

      {teile.length === 0 ? (
        <LeerZustand titel="Noch keine Teile – tippe auf +">
          <p>Erfasse dein erstes Kleidungsstück mit Foto, Name, Kategorie und Standort.</p>
          <div className="mt-4">
            <BeispieldatenButton />
          </div>
        </LeerZustand>
      ) : (
        <section aria-labelledby="bestand-titel" className="karte overflow-hidden">
          <h2 id="bestand-titel" className="px-4 pt-4 text-lg font-semibold">
            Bestand nach Kategorie
          </h2>
          <div className="overflow-x-auto">
            <table className="mt-2 w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-slate-600 dark:border-slate-800 dark:text-slate-400">
                  <th scope="col" className="px-4 py-2 font-medium">
                    Kategorie
                  </th>
                  {n.standorte.map((s) => (
                    <th key={s.id} scope="col" className="px-2 py-2 text-right font-medium">
                      {s.name}
                    </th>
                  ))}
                  <th scope="col" className="px-4 py-2 text-right font-medium">
                    Summe
                  </th>
                </tr>
              </thead>
              <tbody>
                {matrix.zeilen.map((z) => (
                  <tr key={z.kategorieId} className="border-b border-slate-100 dark:border-slate-800">
                    <th scope="row" className="p-0 text-left font-medium">
                      <Link to={listePfad({ kategorie: z.kategorieId })} className="flex min-h-[44px] items-center gap-2 px-4 hover:bg-slate-50 dark:hover:bg-slate-800">
                        <span aria-hidden="true">{n.kategorieEmoji(z.kategorieId)}</span>
                        {n.kategorieName(z.kategorieId)}
                      </Link>
                    </th>
                    {z.werte.map((w, i) => (
                      <td key={n.standortReihenfolge[i]} className="p-0 text-right tabular-nums">
                        <Link
                          to={listePfad({ kategorie: z.kategorieId, standort: n.standortReihenfolge[i] })}
                          aria-label={`${n.kategorieName(z.kategorieId)} an ${n.standortName(n.standortReihenfolge[i])}: ${w}`}
                          className={`flex min-h-[44px] items-center justify-end px-2 hover:bg-slate-50 dark:hover:bg-slate-800 ${
                            w === 0 ? 'text-slate-400 dark:text-slate-600' : ''
                          }`}
                        >
                          {w}
                        </Link>
                      </td>
                    ))}
                    <td className="px-4 text-right font-semibold tabular-nums">{z.summe}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-slate-50 font-semibold dark:bg-slate-800/50">
                  <th scope="row" className="px-4 py-3 text-left">
                    Gesamt
                  </th>
                  {matrix.spaltenSummen.map((w, i) => (
                    <td key={n.standortReihenfolge[i]} className="px-2 py-3 text-right tabular-nums">
                      {w}
                    </td>
                  ))}
                  <td className="px-4 py-3 text-right tabular-nums">{matrix.gesamt}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </section>
      )}
    </Seite>
  );
}
