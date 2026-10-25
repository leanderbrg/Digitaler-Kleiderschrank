import { useMemo } from 'react';
import LeerZustand from '../components/LeerZustand';
import Seite from '../components/Seite';
import TeilFoto from '../components/TeilFoto';
import { useToast } from '../components/Toast';
import { statusSetzen } from '../db/repo';
import { useAuswahl } from '../hooks/useAuswahl';
import { useAktiveTeile } from '../hooks/useDaten';
import { useNachschlagen } from '../hooks/useNachschlagen';
import { STATUS_INFO, type Status, type Teil } from '../types';

interface Massenaktion {
  ziel: Status;
  /** z. B. "in die Wäsche" – wird zu "Alle 3 → in die Wäsche" bzw. "2 ausgewählte → …" */
  text: string;
  primaer?: boolean;
}

const AKTIONEN_GETRAGEN: Massenaktion[] = [
  { ziel: 'waesche', text: 'in die Wäsche', primaer: true },
  { ziel: 'schrank', text: 'zurück in den Schrank' },
];
const AKTIONEN_WAESCHE: Massenaktion[] = [{ ziel: 'schrank', text: 'sauber in den Schrank', primaer: true }];

export default function WaeschePage() {
  const teile = useAktiveTeile();
  const n = useNachschlagen();
  const offen = useMemo(() => (teile ?? []).filter((t) => t.status !== 'schrank'), [teile]);

  return (
    <Seite titel="Wäsche & Getragen">
      {teile === undefined ? null : offen.length === 0 ? (
        <LeerZustand emoji="✨" titel="Alles im Schrank!">
          Nichts getragen und nichts in der Wäsche. Über den Status an einem Teil landet es hier.
        </LeerZustand>
      ) : (
        <div className="space-y-8">
          {n.standorte.map((s) => {
            const hier = offen.filter((t) => t.standortId === s.id);
            return (
              <section key={s.id} aria-labelledby={`w-${s.id}`} className="space-y-3">
                <h2 id={`w-${s.id}`} className="text-xl font-semibold">
                  📍 {s.name}
                </h2>
                {hier.length === 0 ? (
                  <p className="karte p-4 text-sm text-slate-600 dark:text-slate-400">Hier ist alles im Schrank.</p>
                ) : (
                  <>
                    <StatusAbschnitt
                      status="getragen"
                      titel="Getragen"
                      leer="Nichts getragen."
                      standortName={s.name}
                      teile={hier.filter((t) => t.status === 'getragen')}
                      aktionen={AKTIONEN_GETRAGEN}
                    />
                    <StatusAbschnitt
                      status="waesche"
                      titel="In der Wäsche"
                      leer="Nichts in der Wäsche."
                      standortName={s.name}
                      teile={hier.filter((t) => t.status === 'waesche')}
                      aktionen={AKTIONEN_WAESCHE}
                    />
                  </>
                )}
              </section>
            );
          })}
        </div>
      )}
    </Seite>
  );
}

interface AbschnittProps {
  status: Status;
  titel: string;
  leer: string;
  standortName: string;
  teile: Teil[];
  aktionen: Massenaktion[];
}

/** Ein Status-Abschnitt mit Mehrfachauswahl. Ohne Auswahl wirken die Aktionen auf alle Teile. */
function StatusAbschnitt({ status, titel, leer, standortName, teile, aktionen }: AbschnittProps) {
  const n = useNachschlagen();
  const toast = useToast();
  const ids = useMemo(() => teile.map((t) => t.id), [teile]);
  const auswahl = useAuswahl(ids);

  async function ausfuehren(a: Massenaktion) {
    const ziel = auswahl.anzahl ? auswahl.ids : ids;
    const e = await statusSetzen(ziel, a.ziel);
    auswahl.leeren();
    toast.zeige(`${e.anzahl} ${e.anzahl === 1 ? 'Teil' : 'Teile'} an ${standortName} ${a.text}`, e.rueckgaengig);
  }

  return (
    <div className="karte p-3">
      <div className="mb-2 flex items-baseline justify-between gap-2">
        <h3 className="font-semibold">
          <span aria-hidden="true">{STATUS_INFO[status].icon}</span> {titel}
        </h3>
        <span className="text-sm text-slate-600 dark:text-slate-400">
          {teile.length} {teile.length === 1 ? 'Teil' : 'Teile'}
        </span>
      </div>
      {teile.length === 0 ? (
        <p className="text-sm text-slate-600 dark:text-slate-400">{leer}</p>
      ) : (
        <>
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
                    <span className="line-clamp-2 hyphens-auto font-medium leading-tight">{t.name}</span>
                    {t.farbe && <span className="block truncate text-xs text-slate-500 dark:text-slate-400">{t.farbe}</span>}
                  </span>
                </label>
              </li>
            ))}
          </ul>
          <div className="mt-3 flex flex-col gap-2 sm:flex-row">
            {aktionen.map((a) => (
              <button
                key={a.ziel}
                type="button"
                className={`${a.primaer ? 'btn-primaer' : 'btn-sekundaer'} flex-1`}
                onClick={() => ausfuehren(a)}
              >
                {auswahl.anzahl ? `${auswahl.anzahl} ausgewählte` : teile.length === 1 ? 'Das Teil' : `Alle ${teile.length}`} → {a.text}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
