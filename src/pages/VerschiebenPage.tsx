import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import LeerZustand from '../components/LeerZustand';
import Seite from '../components/Seite';
import Segment from '../components/Segment';
import TeilFoto from '../components/TeilFoto';
import { useToast } from '../components/Toast';
import { verschieben } from '../db/repo';
import { useAuswahl } from '../hooks/useAuswahl';
import { useAktiveTeile } from '../hooks/useDaten';
import { useNachschlagen } from '../hooks/useNachschlagen';
import { filterTeile } from '../lib/filter';
import { gruppiere } from '../lib/gruppierung';
import { STATUS_LABEL, type Status } from '../types';

type StatusWahl = 'gleich' | Status;

/** Verschieben & Packliste: Teile von Quelle nach Ziel auswählen und gesammelt verschieben. */
export default function VerschiebenPage() {
  const [params] = useSearchParams();
  const n = useNachschlagen();
  const teile = useAktiveTeile();
  const toast = useToast();

  const [quelle, setQuelle] = useState(params.get('von') ?? '');
  const [ziel, setZiel] = useState('');
  const [status, setStatus] = useState<StatusWahl>('gleich');
  const [kategorie, setKategorie] = useState('');

  useEffect(() => {
    if (!n.standorte.length) return;
    const q = n.standorte.some((s) => s.id === quelle) ? quelle : n.standorte[0].id;
    if (q !== quelle) setQuelle(q);
    if (!ziel || ziel === q) setZiel(n.standorte.find((s) => s.id !== q)?.id ?? '');
  }, [n.standorte, quelle, ziel]);

  const kandidaten = useMemo(
    () => filterTeile(teile ?? [], { standortId: quelle, kategorieId: kategorie || undefined }),
    [teile, quelle, kategorie],
  );
  const gruppen = useMemo(() => gruppiere(kandidaten, { kategorieReihenfolge: n.kategorieReihenfolge }), [kandidaten, n]);
  const ids = useMemo(() => kandidaten.map((t) => t.id), [kandidaten]);
  const auswahl = useAuswahl(ids);

  async function ausfuehren() {
    const e = await verschieben(auswahl.ids, ziel, status === 'gleich' ? undefined : status);
    toast.zeige(`${e.anzahl} ${e.anzahl === 1 ? 'Teil' : 'Teile'} nach ${n.standortName(ziel)} verschoben`, e.rueckgaengig);
    auswahl.leeren();
  }

  return (
    <Seite titel="Verschieben & Packliste" zurueck>
      <div className="karte mb-4 space-y-4 p-4">
        <div className="grid grid-cols-[1fr_auto_1fr] items-end gap-2">
          <div>
            <label htmlFor="quelle" className="label">
              Von
            </label>
            <select id="quelle" className="eingabe" value={quelle} onChange={(e) => setQuelle(e.target.value)}>
              {n.standorte.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
          <button
            type="button"
            aria-label="Von und Nach tauschen"
            className="btn-sekundaer w-11 px-0"
            onClick={() => {
              setQuelle(ziel);
              setZiel(quelle);
            }}
          >
            ⇄
          </button>
          <div>
            <label htmlFor="ziel" className="label">
              Nach
            </label>
            <select id="ziel" className="eingabe" value={ziel} onChange={(e) => setZiel(e.target.value)}>
              {n.standorte
                .filter((s) => s.id !== quelle)
                .map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
            </select>
          </div>
        </div>
        <Segment<StatusWahl>
          label="Status dabei setzen"
          optionen={[
            { wert: 'gleich', label: 'Unverändert' },
            { wert: 'schrank', label: 'Im Schrank' },
            { wert: 'waesche', label: 'In der Wäsche' },
          ]}
          wert={status}
          onChange={setStatus}
        />
        <div>
          <label htmlFor="pk-kategorie" className="label">
            Kategorie
          </label>
          <select id="pk-kategorie" className="eingabe" value={kategorie} onChange={(e) => setKategorie(e.target.value)}>
            <option value="">Alle</option>
            {n.kategorien.map((k) => (
              <option key={k.id} value={k.id}>
                {k.emoji} {k.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {teile !== undefined && kandidaten.length === 0 ? (
        <LeerZustand emoji="🧳" titel={`Keine Teile an ${n.standortName(quelle)}`} />
      ) : (
        <>
          <div className="mb-2 flex items-center justify-between">
            <p className="text-sm text-slate-600 dark:text-slate-400">{kandidaten.length} Teile verfügbar</p>
            <button
              type="button"
              className="btn-klein text-marke-700 hover:bg-slate-200 dark:text-teal-400 dark:hover:bg-slate-800"
              onClick={auswahl.alleGewaehlt ? auswahl.leeren : auswahl.alle}
            >
              {auswahl.alleGewaehlt ? 'Keine' : 'Alle'} auswählen
            </button>
          </div>
          <div className="space-y-3">
            {gruppen.map((g) => {
              const gIds = g.teile.map((t) => t.id);
              const alle = gIds.every((id) => auswahl.gewaehlt.has(id));
              return (
                <section key={g.schluessel} className="karte p-3">
                  <label className="flex min-h-[44px] cursor-pointer items-center gap-3">
                    <input
                      type="checkbox"
                      className="h-5 w-5 accent-marke-700"
                      checked={alle}
                      onChange={() =>
                        auswahl.setze(alle ? auswahl.ids.filter((id) => !gIds.includes(id)) : [...new Set([...auswahl.ids, ...gIds])])
                      }
                    />
                    <span className="font-semibold">
                      {n.kategorieEmoji(g.kategorieId)} {g.name}
                      {g.farbe && <span className="font-normal text-slate-500 dark:text-slate-400"> · {g.farbe}</span>}
                    </span>
                    <span className="ml-auto text-sm text-slate-500 dark:text-slate-400">
                      {gIds.filter((id) => auswahl.gewaehlt.has(id)).length}/{g.anzahl}
                    </span>
                  </label>
                  <ul className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
                    {g.teile.map((t) => (
                      <li key={t.id}>
                        <label className="flex min-h-[56px] cursor-pointer items-center gap-2 rounded-xl border border-slate-200 p-2 has-[:checked]:border-marke-700 has-[:checked]:bg-marke-50 dark:border-slate-700 dark:has-[:checked]:bg-teal-900/30">
                          <input
                            type="checkbox"
                            className="h-5 w-5 accent-marke-700"
                            checked={auswahl.gewaehlt.has(t.id)}
                            onChange={() => auswahl.umschalten(t.id)}
                            aria-label={`${t.name} ${t.groesse ?? ''} auswählen`}
                          />
                          <TeilFoto blob={t.thumb} alt="" emoji={n.kategorieEmoji(t.kategorieId)} className="h-12 w-12" />
                          <span className="min-w-0 text-xs text-slate-600 dark:text-slate-400">
                            {STATUS_LABEL[t.status]}
                            {t.groesse && <><br />Gr. {t.groesse}</>}
                          </span>
                        </label>
                      </li>
                    ))}
                  </ul>
                </section>
              );
            })}
          </div>
          <div className="sticky bottom-[96px] mt-4">
            <button type="button" className="btn-primaer w-full shadow-lg" disabled={!auswahl.anzahl || !ziel} onClick={ausfuehren}>
              {auswahl.anzahl} {auswahl.anzahl === 1 ? 'Teil' : 'Teile'} nach {n.standortName(ziel)} verschieben
            </button>
          </div>
        </>
      )}
    </Seite>
  );
}
