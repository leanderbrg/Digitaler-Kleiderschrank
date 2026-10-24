import { useMemo } from 'react';
import LeerZustand from '../components/LeerZustand';
import Seite from '../components/Seite';
import TeilFoto from '../components/TeilFoto';
import { useToast } from '../components/Toast';
import { statusSetzen } from '../db/repo';
import { useAuswahl } from '../hooks/useAuswahl';
import { useAktiveTeile } from '../hooks/useDaten';
import { useNachschlagen } from '../hooks/useNachschlagen';
import type { Teil } from '../types';

export default function WaeschePage() {
  const teile = useAktiveTeile();
  const n = useNachschlagen();
  const waesche = useMemo(() => (teile ?? []).filter((t) => t.status === 'waesche'), [teile]);

  return (
    <Seite titel="Wäsche">
      {teile === undefined ? null : waesche.length === 0 ? (
        <LeerZustand emoji="✨" titel="Alles sauber!">
          Keine Teile in der Wäsche. Über den Wäsche-Schalter an einem Teil landet es hier.
        </LeerZustand>
      ) : (
        <div className="space-y-6">
          {n.standorte.map((s) => (
            <StandortWaesche key={s.id} name={s.name} teile={waesche.filter((t) => t.standortId === s.id)} />
          ))}
        </div>
      )}
    </Seite>
  );
}

function StandortWaesche({ name, teile }: { name: string; teile: Teil[] }) {
  const n = useNachschlagen();
  const toast = useToast();
  const ids = useMemo(() => teile.map((t) => t.id), [teile]);
  const auswahl = useAuswahl(ids);

  async function zurueck(zielIds: string[]) {
    const e = await statusSetzen(zielIds, 'schrank');
    auswahl.leeren();
    toast.zeige(`${e.anzahl} ${e.anzahl === 1 ? 'Teil' : 'Teile'} an ${name} zurück im Schrank`, e.rueckgaengig);
  }

  return (
    <section aria-labelledby={`w-${name}`}>
      <div className="mb-2 flex items-baseline justify-between gap-2">
        <h2 id={`w-${name}`} className="text-lg font-semibold">
          📍 {name}
        </h2>
        <span className="text-sm text-slate-600 dark:text-slate-400">
          {teile.length} {teile.length === 1 ? 'Teil' : 'Teile'} in der Wäsche
        </span>
      </div>
      {teile.length === 0 ? (
        <p className="karte p-4 text-sm text-slate-600 dark:text-slate-400">Hier ist nichts in der Wäsche.</p>
      ) : (
        <div className="karte p-3">
          <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {teile.map((t) => (
              <li key={t.id}>
                <label className="flex min-h-[64px] cursor-pointer items-center gap-2 rounded-xl border border-slate-200 p-2 has-[:checked]:border-marke-700 has-[:checked]:bg-marke-50 dark:border-slate-700 dark:has-[:checked]:bg-teal-900/30">
                  <input
                    type="checkbox"
                    className="h-5 w-5 shrink-0 accent-marke-700"
                    checked={auswahl.gewaehlt.has(t.id)}
                    onChange={() => auswahl.umschalten(t.id)}
                  />
                  <TeilFoto blob={t.thumb} alt="" emoji={n.kategorieEmoji(t.kategorieId)} className="h-12 w-12" />
                  <span className="min-w-0 text-sm">
                    <span className="line-clamp-2 break-words font-medium leading-tight">{t.name}</span>
                    {t.farbe && <span className="block truncate text-xs text-slate-500 dark:text-slate-400">{t.farbe}</span>}
                  </span>
                </label>
              </li>
            ))}
          </ul>
          <div className="mt-3 flex flex-col gap-2 sm:flex-row">
            <button type="button" className="btn-primaer flex-1" onClick={() => zurueck(ids)}>
              ✨ Alles sauber → zurück in den Schrank
            </button>
            <button type="button" className="btn-sekundaer flex-1" disabled={!auswahl.anzahl} onClick={() => zurueck(auswahl.ids)}>
              Auswahl sauber ({auswahl.anzahl})
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
