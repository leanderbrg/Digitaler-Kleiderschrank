import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import FotoWaehler, { type FotoDaten } from '../components/FotoWaehler';
import { gruppenPfad } from '../components/GruppenKarte';
import Seite from '../components/Seite';
import Segment from '../components/Segment';
import { StatusWahl } from '../components/Status';
import { useToast } from '../components/Toast';
import { db } from '../db/db';
import { teileHinzufuegen, teilSpeichern } from '../db/repo';
import { useAktiveTeile } from '../hooks/useDaten';
import { useNachschlagen } from '../hooks/useNachschlagen';
import { gruppenSchluessel } from '../lib/gruppierung';
import { ANZAHL_MAX, ANZAHL_MIN, istGueltig, validiereTeil, type Fehler } from '../lib/validierung';
import type { Status, Teil, Zustand } from '../types';

interface Formular {
  name: string;
  kategorieId: string;
  standortId: string;
  status: Status;
  farbe: string;
  groesse: string;
  zustand: Zustand;
  notiz: string;
  anzahl: string;
}

const LEER: Formular = {
  name: '',
  kategorieId: '',
  standortId: '',
  status: 'schrank',
  farbe: '',
  groesse: '',
  zustand: 'gut',
  notiz: '',
  anzahl: '1',
};

function ausTeil(t: Teil): Formular {
  return {
    name: t.name,
    kategorieId: t.kategorieId,
    standortId: t.standortId,
    status: t.status,
    farbe: t.farbe ?? '',
    groesse: t.groesse ?? '',
    zustand: t.zustand,
    notiz: t.notiz ?? '',
    anzahl: '1',
  };
}

const LETZTER_STANDORT = 'letzterStandort';

/** Neues Teil anlegen (/neu, optional ?vorlage=<teilId>) oder bestehendes bearbeiten (/teil/:id). */
export default function TeilFormPage() {
  const { id } = useParams();
  const bearbeiten = !!id;
  const [params] = useSearchParams();
  const vorlageId = params.get('vorlage');
  const navigate = useNavigate();
  const toast = useToast();
  const { standorte, kategorien } = useNachschlagen();
  const alleTeile = useAktiveTeile();

  const [f, setF] = useState<Formular>(LEER);
  const [foto, setFoto] = useState<FotoDaten>();
  const [fehler, setFehler] = useState<Fehler>({});
  const [speichert, setSpeichert] = useState(false);
  const [geladen, setGeladen] = useState(false);
  const nameRef = useRef<HTMLInputElement>(null);

  // Formular einmalig vorbelegen (Bearbeiten, Vorlage oder Filter aus der Liste)
  useEffect(() => {
    let abbruch = false;
    (async () => {
      const quelleId = id ?? vorlageId;
      const quelle = quelleId ? await db.teile.get(quelleId) : undefined;
      if (abbruch) return;
      if (quelle) {
        setF(ausTeil(quelle));
        setFoto(quelle.foto && quelle.thumb ? { foto: quelle.foto, thumb: quelle.thumb } : undefined);
      } else {
        let letzter: string | null = null;
        try {
          letzter = localStorage.getItem(LETZTER_STANDORT);
        } catch {
          /* ignorieren */
        }
        setF({
          ...LEER,
          kategorieId: params.get('kategorie') ?? '',
          standortId: params.get('standort') ?? letzter ?? '',
        });
      }
      setGeladen(true);
    })();
    return () => {
      abbruch = true;
    };
    // bewusst nur bei ID-Wechsel – spätere Filter-Parameter sollen Eingaben nicht überschreiben
  }, [id, vorlageId]);

  // Standardwerte, sobald Standorte/Kategorien geladen sind
  useEffect(() => {
    if (!geladen) return;
    setF((alt) => ({
      ...alt,
      standortId: standorte.some((s) => s.id === alt.standortId) ? alt.standortId : (standorte[0]?.id ?? ''),
      kategorieId: kategorien.some((k) => k.id === alt.kategorieId) ? alt.kategorieId : (kategorien[0]?.id ?? ''),
    }));
  }, [geladen, standorte, kategorien]);

  // Vorschläge für Name/Farbe aus vorhandenen Teilen → einheitliche Schreibweise = saubere Gruppen
  const namensVorschlaege = useMemo(
    () => [...new Set((alleTeile ?? []).filter((t) => t.kategorieId === f.kategorieId).map((t) => t.name))].sort(),
    [alleTeile, f.kategorieId],
  );
  const farbVorschlaege = useMemo(
    () => [...new Set((alleTeile ?? []).map((t) => t.farbe).filter((x): x is string => !!x))].sort(),
    [alleTeile],
  );

  const setze = <K extends keyof Formular>(k: K, v: Formular[K]) => setF((alt) => ({ ...alt, [k]: v }));

  async function speichern(e: FormEvent | null, naechstes: boolean) {
    e?.preventDefault();
    const fe = validiereTeil(f, !bearbeiten);
    setFehler(fe);
    if (!istGueltig(fe)) {
      nameRef.current?.focus();
      return;
    }
    setSpeichert(true);
    try {
      const daten = {
        name: f.name,
        kategorieId: f.kategorieId,
        standortId: f.standortId,
        status: f.status,
        zustand: f.zustand,
        farbe: f.farbe,
        groesse: f.groesse,
        notiz: f.notiz,
        foto: foto?.foto,
        thumb: foto?.thumb,
      };
      try {
        localStorage.setItem(LETZTER_STANDORT, f.standortId);
      } catch {
        /* ignorieren */
      }
      if (bearbeiten) {
        await teilSpeichern(id!, daten);
        toast.zeige('Änderungen gespeichert');
        navigate(-1);
        return;
      }
      const anzahl = Number(f.anzahl);
      await teileHinzufuegen(daten, anzahl);
      toast.zeige(anzahl === 1 ? `„${f.name.trim()}“ gespeichert` : `${anzahl} × „${f.name.trim()}“ gespeichert`);
      if (naechstes) {
        // Kategorie, Standort und Status bleiben für schnelles Erfassen stehen
        setF((alt) => ({ ...LEER, kategorieId: alt.kategorieId, standortId: alt.standortId, status: alt.status }));
        setFoto(undefined);
        setFehler({});
        window.scrollTo({ top: 0 });
        nameRef.current?.focus();
      } else {
        navigate(gruppenPfad(gruppenSchluessel(daten)), { replace: true });
      }
    } finally {
      setSpeichert(false);
    }
  }

  const titel = bearbeiten ? 'Teil bearbeiten' : vorlageId ? 'Weiteres Teil' : 'Teil hinzufügen';

  return (
    <Seite titel={titel} zurueck>
      <form onSubmit={(e) => speichern(e, false)} noValidate className="space-y-5">
        <FotoWaehler wert={foto} onChange={setFoto} />

        <div>
          <label htmlFor="name" className="label">
            Name <span className="text-red-700 dark:text-red-400">*</span>
          </label>
          <input
            ref={nameRef}
            id="name"
            className="eingabe"
            value={f.name}
            onChange={(e) => setze('name', e.target.value)}
            list="namen"
            autoComplete="off"
            placeholder="z. B. Jeans Slim, Sneaker-Socken"
            aria-invalid={!!fehler.name}
            aria-describedby={fehler.name ? 'name-fehler' : undefined}
            required
          />
          <datalist id="namen">
            {namensVorschlaege.map((n) => (
              <option key={n} value={n} />
            ))}
          </datalist>
          {fehler.name && (
            <p id="name-fehler" className="mt-1 text-sm text-red-700 dark:text-red-400">
              {fehler.name}
            </p>
          )}
        </div>

        <fieldset>
          <legend className="label">Kategorie</legend>
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
            {kategorien.map((k) => (
              <label key={k.id}>
                <input
                  type="radio"
                  name="kategorie"
                  value={k.id}
                  checked={f.kategorieId === k.id}
                  onChange={() => setze('kategorieId', k.id)}
                  className="peer sr-only"
                />
                <span className="flex min-h-[64px] cursor-pointer flex-col items-center justify-center rounded-xl border border-slate-300 bg-white p-1 text-center text-xs font-medium peer-checked:border-marke-700 peer-checked:bg-marke-50 peer-checked:ring-2 peer-checked:ring-marke-700 peer-focus-visible:ring-2 peer-focus-visible:ring-marke-500 dark:border-slate-700 dark:bg-slate-900 dark:peer-checked:bg-teal-900/40">
                  <span aria-hidden="true" className="text-2xl">
                    {k.emoji}
                  </span>
                  <span className="w-full truncate">{k.name}</span>
                </span>
              </label>
            ))}
          </div>
          {fehler.kategorieId && <p className="mt-1 text-sm text-red-700 dark:text-red-400">{fehler.kategorieId}</p>}
        </fieldset>

        <Segment
          label="Standort"
          optionen={standorte.map((s) => ({ wert: s.id, label: s.name }))}
          wert={f.standortId}
          onChange={(v) => setze('standortId', v)}
          fehler={fehler.standortId}
        />

        <details className="karte p-4" open={bearbeiten || !!vorlageId}>
          <summary className="-m-2 cursor-pointer rounded-lg p-2 font-medium">Weitere Angaben (optional)</summary>
          <div className="mt-4 space-y-5">
            <StatusWahl label="Status" wert={f.status} onChange={(v) => v && setze('status', v)} />
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="farbe" className="label">
                  Farbe
                </label>
                <input
                  id="farbe"
                  className="eingabe"
                  value={f.farbe}
                  onChange={(e) => setze('farbe', e.target.value)}
                  list="farben"
                  autoComplete="off"
                />
                <datalist id="farben">
                  {farbVorschlaege.map((n) => (
                    <option key={n} value={n} />
                  ))}
                </datalist>
              </div>
              <div>
                <label htmlFor="groesse" className="label">
                  Größe
                </label>
                <input
                  id="groesse"
                  className="eingabe"
                  value={f.groesse}
                  onChange={(e) => setze('groesse', e.target.value)}
                  autoComplete="off"
                />
              </div>
            </div>
            <Segment
              label="Zustand"
              optionen={[
                { wert: 'gut', label: 'Gut' },
                { wert: 'abgetragen', label: 'Abgetragen' },
              ]}
              wert={f.zustand}
              onChange={(v) => setze('zustand', v)}
            />
            <div>
              <label htmlFor="notiz" className="label">
                Notiz
              </label>
              <textarea
                id="notiz"
                rows={2}
                className="eingabe"
                value={f.notiz}
                onChange={(e) => setze('notiz', e.target.value)}
              />
            </div>
          </div>
        </details>

        {!bearbeiten && (
          <div>
            <label htmlFor="anzahl" className="label">
              Anzahl
            </label>
            <div className="flex items-center gap-2">
              <button
                type="button"
                aria-label="Anzahl verringern"
                className="btn-sekundaer w-12 text-xl"
                onClick={() => setze('anzahl', String(Math.max(ANZAHL_MIN, (Number(f.anzahl) || 1) - 1)))}
              >
                −
              </button>
              <input
                id="anzahl"
                type="number"
                inputMode="numeric"
                min={ANZAHL_MIN}
                max={ANZAHL_MAX}
                className="eingabe w-20 text-center"
                value={f.anzahl}
                onChange={(e) => setze('anzahl', e.target.value)}
                aria-invalid={!!fehler.anzahl}
                aria-describedby="anzahl-hinweis"
              />
              <button
                type="button"
                aria-label="Anzahl erhöhen"
                className="btn-sekundaer w-12 text-xl"
                onClick={() => setze('anzahl', String(Math.min(ANZAHL_MAX, (Number(f.anzahl) || 0) + 1)))}
              >
                +
              </button>
            </div>
            <p
              id="anzahl-hinweis"
              className={`mt-1 text-sm ${fehler.anzahl ? 'text-red-700 dark:text-red-400' : 'text-slate-500 dark:text-slate-400'}`}
            >
              {fehler.anzahl ?? 'Erzeugt so viele einzelne Teile mit gleichen Angaben und gleichem Foto.'}
            </p>
          </div>
        )}

        <div className="flex flex-col gap-2 sm:flex-row">
          <button type="submit" className="btn-primaer flex-1" disabled={speichert}>
            Speichern
          </button>
          {!bearbeiten && (
            <button
              type="button"
              className="btn-sekundaer flex-1"
              disabled={speichert}
              onClick={() => speichern(null, true)}
            >
              Speichern &amp; nächstes Teil
            </button>
          )}
        </div>
      </form>
    </Seite>
  );
}
