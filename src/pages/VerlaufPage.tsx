import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { BalkenHorizontal, BalkenVertikal } from '../components/Balken';
import Dialog from '../components/Dialog';
import LeerZustand from '../components/LeerZustand';
import Seite from '../components/Seite';
import TeilFoto from '../components/TeilFoto';
import { useToast } from '../components/Toast';
import { endgueltigLoeschen, wiederherstellen } from '../db/repo';
import { useAuswahl } from '../hooks/useAuswahl';
import { useAlleTeile, useVerlauf } from '../hooks/useDaten';
import { useNachschlagen } from '../hooks/useNachschlagen';
import {
  aussortierEreignisse,
  aussortiertProMonat,
  bestandProKategorie,
  haeufigsteGruende,
} from '../lib/statistik';
import { AKTION_INFO, tagesLabel, verlaufDetails } from '../lib/verlaufText';
import type { Aktion, Teil, Verlaufseintrag } from '../types';

const TABS = [
  ['verlauf', 'Verlauf'],
  ['statistik', 'Statistik'],
  ['papierkorb', 'Papierkorb'],
] as const;
type Tab = (typeof TABS)[number][0];

export default function VerlaufPage() {
  const [params, setParams] = useSearchParams();
  const tab: Tab = (TABS.find(([t]) => t === params.get('tab'))?.[0] ?? 'verlauf') as Tab;

  return (
    <Seite titel="Verlauf & Statistik">
      <div role="tablist" aria-label="Bereich" className="mb-4 grid grid-cols-3 rounded-xl bg-slate-200 p-1 dark:bg-slate-800">
        {TABS.map(([t, label]) => (
          <button
            key={t}
            role="tab"
            type="button"
            aria-selected={tab === t}
            onClick={() => setParams(t === 'verlauf' ? {} : { tab: t }, { replace: true })}
            className={`min-h-[44px] rounded-lg text-sm font-medium ${
              tab === t ? 'bg-white text-slate-900 shadow dark:bg-slate-950 dark:text-white' : 'text-slate-600 dark:text-slate-300'
            }`}
          >
            {label}
          </button>
        ))}
      </div>
      <div role="tabpanel">
        {tab === 'verlauf' && <VerlaufListe />}
        {tab === 'statistik' && <Statistik />}
        {tab === 'papierkorb' && <Papierkorb />}
      </div>
    </Seite>
  );
}

const SEITE = 100;

function VerlaufListe() {
  const verlauf = useVerlauf();
  const n = useNachschlagen();
  const [aktion, setAktion] = useState<Aktion | ''>('');
  const [kategorie, setKategorie] = useState('');
  const [suche, setSuche] = useState('');
  const [limit, setLimit] = useState(SEITE);

  const gefiltert = useMemo(() => {
    const s = suche.trim().toLowerCase();
    return (verlauf ?? []).filter(
      (v) =>
        (!aktion || v.aktion === aktion) &&
        (!kategorie || v.kategorieId === kategorie) &&
        (!s || v.teilName.toLowerCase().includes(s)),
    );
  }, [verlauf, aktion, kategorie, suche]);

  const tage = useMemo(() => {
    const jetzt = Date.now();
    const gruppen: { label: string; eintraege: Verlaufseintrag[] }[] = [];
    for (const v of gefiltert.slice(0, limit)) {
      const label = tagesLabel(v.datum, jetzt);
      const letzte = gruppen[gruppen.length - 1];
      if (letzte?.label === label) letzte.eintraege.push(v);
      else gruppen.push({ label, eintraege: [v] });
    }
    return gruppen;
  }, [gefiltert, limit]);

  if (verlauf === undefined) return null;
  if (verlauf.length === 0) return <LeerZustand emoji="📜" titel="Noch kein Verlauf">Hier erscheinen alle Änderungen an deinen Teilen.</LeerZustand>;

  return (
    <>
      <div className="mb-4 grid grid-cols-2 gap-2">
        <div className="col-span-2">
          <label htmlFor="v-suche" className="sr-only">
            Nach Teil suchen
          </label>
          <input id="v-suche" type="search" className="eingabe" placeholder="🔍 Nach Teil suchen" value={suche} onChange={(e) => setSuche(e.target.value)} />
        </div>
        <div>
          <label htmlFor="v-aktion" className="label">
            Aktion
          </label>
          <select id="v-aktion" className="eingabe" value={aktion} onChange={(e) => setAktion(e.target.value as Aktion | '')}>
            <option value="">Alle</option>
            {(Object.keys(AKTION_INFO) as Aktion[]).map((a) => (
              <option key={a} value={a}>
                {AKTION_INFO[a].emoji} {AKTION_INFO[a].label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="v-kategorie" className="label">
            Kategorie
          </label>
          <select id="v-kategorie" className="eingabe" value={kategorie} onChange={(e) => setKategorie(e.target.value)}>
            <option value="">Alle</option>
            {n.kategorien.map((k) => (
              <option key={k.id} value={k.id}>
                {k.emoji} {k.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {gefiltert.length === 0 ? (
        <LeerZustand emoji="🔍" titel="Keine passenden Einträge" />
      ) : (
        <div className="space-y-4">
          {tage.map((t) => (
            <section key={t.label}>
              <h2 className="mb-1 text-sm font-semibold text-slate-600 dark:text-slate-400">{t.label}</h2>
              <ul className="karte divide-y divide-slate-100 dark:divide-slate-800">
                {t.eintraege.map((v) => {
                  const info = AKTION_INFO[v.aktion] ?? { emoji: '•', label: v.aktion };
                  const details = verlaufDetails(v, n.standortName);
                  return (
                    <li key={v.id} className="flex items-start gap-3 px-3 py-2.5">
                      <span aria-hidden="true" className="mt-0.5 text-lg">
                        {info.emoji}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm">
                          <span className="font-medium">{v.teilName}</span>{' '}
                          <span className="text-slate-600 dark:text-slate-400">· {info.label}</span>
                        </p>
                        {details && <p className="text-xs text-slate-600 dark:text-slate-400">{details}</p>}
                      </div>
                      <time dateTime={new Date(v.datum).toISOString()} className="shrink-0 text-xs tabular-nums text-slate-500 dark:text-slate-400">
                        {new Date(v.datum).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}
                      </time>
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
          {gefiltert.length > limit && (
            <button type="button" className="btn-sekundaer w-full" onClick={() => setLimit((l) => l + SEITE)}>
              Ältere Einträge anzeigen ({gefiltert.length - limit} weitere)
            </button>
          )}
        </div>
      )}
    </>
  );
}

const MONATE = ['Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez'];

function Statistik() {
  const teile = useAlleTeile();
  const verlauf = useVerlauf();
  const n = useNachschlagen();

  const daten = useMemo(() => {
    const ereignisse = aussortierEreignisse(verlauf ?? []);
    return {
      bestand: bestandProKategorie(teile ?? [], n.kategorieReihenfolge),
      monate: aussortiertProMonat(ereignisse, Date.now(), 12),
      gruende: haeufigsteGruende(ereignisse),
      aussortiertGesamt: ereignisse.length,
    };
  }, [teile, verlauf, n]);

  if (!teile || !verlauf) return null;
  const aktivGesamt = daten.bestand.reduce((a, b) => a + b.anzahl, 0);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="karte p-4">
          <p className="text-sm text-slate-600 dark:text-slate-400">Im Bestand</p>
          <p className="text-3xl font-bold tabular-nums">{aktivGesamt}</p>
        </div>
        <div className="karte p-4">
          <p className="text-sm text-slate-600 dark:text-slate-400">Aussortiert (gesamt)</p>
          <p className="text-3xl font-bold tabular-nums">{daten.aussortiertGesamt}</p>
        </div>
      </div>

      <section className="karte p-4">
        <h2 className="mb-3 font-semibold">Bestand pro Kategorie</h2>
        {daten.bestand.length ? (
          <BalkenHorizontal
            daten={daten.bestand.map((b) => ({ label: n.kategorieName(b.kategorieId), icon: n.kategorieEmoji(b.kategorieId), wert: b.anzahl }))}
          />
        ) : (
          <p className="text-sm text-slate-600 dark:text-slate-400">Noch keine Teile erfasst.</p>
        )}
      </section>

      <section className="karte p-4">
        <h2 className="mb-3 font-semibold">Aussortiert pro Monat (12 Monate)</h2>
        <BalkenVertikal
          daten={daten.monate.map((m) => ({ label: MONATE[Number(m.monat.slice(5)) - 1], wert: m.anzahl }))}
        />
      </section>

      <section className="karte p-4">
        <h2 className="mb-3 font-semibold">Häufigste Aussortier-Gründe</h2>
        {daten.gruende.length ? (
          <BalkenHorizontal daten={daten.gruende.map((g) => ({ label: g.grund, wert: g.anzahl }))} />
        ) : (
          <p className="text-sm text-slate-600 dark:text-slate-400">Noch nichts aussortiert.</p>
        )}
      </section>
    </div>
  );
}

function Papierkorb() {
  const alle = useAlleTeile();
  const n = useNachschlagen();
  const toast = useToast();
  const aussortiert = useMemo(
    () => (alle ?? []).filter((t) => t.aussortiert).sort((a, b) => (b.aussortiertAm ?? 0) - (a.aussortiertAm ?? 0)),
    [alle],
  );
  const ids = useMemo(() => aussortiert.map((t) => t.id), [aussortiert]);
  const auswahl = useAuswahl(ids);
  const [loeschenIds, setLoeschenIds] = useState<string[] | null>(null);

  async function zurueckholen(zielIds: string[]) {
    const e = await wiederherstellen(zielIds);
    auswahl.leeren();
    toast.zeige(`${e.anzahl} ${e.anzahl === 1 ? 'Teil' : 'Teile'} wiederhergestellt`, e.rueckgaengig);
  }

  async function loeschen() {
    if (!loeschenIds) return;
    const anzahl = await endgueltigLoeschen(loeschenIds);
    setLoeschenIds(null);
    auswahl.leeren();
    toast.zeige(`${anzahl} ${anzahl === 1 ? 'Teil' : 'Teile'} endgültig gelöscht`);
  }

  if (alle === undefined) return null;
  if (!aussortiert.length) {
    return (
      <LeerZustand emoji="🗑️" titel="Papierkorb ist leer">
        Aussortierte Teile landen hier und können wiederhergestellt oder endgültig gelöscht werden.
      </LeerZustand>
    );
  }

  return (
    <>
      <div className="mb-2 flex items-center justify-between">
        <p className="text-sm text-slate-600 dark:text-slate-400">{aussortiert.length} aussortierte Teile</p>
        <button
          type="button"
          className="btn-klein text-marke-700 hover:bg-slate-200 dark:text-teal-400 dark:hover:bg-slate-800"
          onClick={auswahl.alleGewaehlt ? auswahl.leeren : auswahl.alle}
        >
          {auswahl.alleGewaehlt ? 'Keine' : 'Alle'} auswählen
        </button>
      </div>
      <ul className="space-y-2">
        {aussortiert.map((t: Teil) => (
          <li key={t.id}>
            <label className="karte flex cursor-pointer items-center gap-3 p-3 has-[:checked]:ring-2 has-[:checked]:ring-marke-700">
              <input type="checkbox" className="h-5 w-5 accent-marke-700" checked={auswahl.gewaehlt.has(t.id)} onChange={() => auswahl.umschalten(t.id)} />
              <TeilFoto blob={t.thumb} alt="" emoji={n.kategorieEmoji(t.kategorieId)} className="h-14 w-14 grayscale" />
              <span className="min-w-0 flex-1">
                <span className="block truncate font-medium">{t.name}</span>
                <span className="block text-xs text-slate-600 dark:text-slate-400">
                  {t.aussortierGrund ?? 'ohne Grund'}
                  {t.aussortiertAm && ` · ${new Date(t.aussortiertAm).toLocaleDateString('de-DE')}`}
                  {` · ${n.standortName(t.standortId)}`}
                </span>
              </span>
            </label>
          </li>
        ))}
      </ul>
      <div className="sticky bottom-[96px] mt-4 flex gap-2">
        <button type="button" className="btn-primaer flex-1 shadow-lg" disabled={!auswahl.anzahl} onClick={() => zurueckholen(auswahl.ids)}>
          ♻️ Wiederherstellen ({auswahl.anzahl})
        </button>
        <button type="button" className="btn-gefahr flex-1 shadow-lg" disabled={!auswahl.anzahl} onClick={() => setLoeschenIds(auswahl.ids)}>
          Endgültig löschen
        </button>
      </div>

      <Dialog
        offen={!!loeschenIds}
        titel="Endgültig löschen?"
        onSchliessen={() => setLoeschenIds(null)}
        fuss={
          <>
            <button type="button" className="btn-sekundaer" onClick={() => setLoeschenIds(null)}>
              Abbrechen
            </button>
            <button type="button" className="btn-gefahr" onClick={loeschen}>
              Ja, endgültig löschen
            </button>
          </>
        }
      >
        <p className="text-sm">
          {loeschenIds?.length === 1 ? 'Das Teil wird' : `${loeschenIds?.length} Teile werden`} samt Foto dauerhaft gelöscht. Das kann
          nicht rückgängig gemacht werden. Einträge im Verlauf und in der Statistik bleiben erhalten.
        </p>
      </Dialog>
    </>
  );
}
