import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import FotoWaehler, { type FotoDaten } from '../components/FotoWaehler';
import { gruppenPfad } from '../components/GruppenKarte';
import Seite from '../components/Seite';
import Segment from '../components/Segment';
import SpeicherAnzeige from '../components/SpeicherAnzeige';
import { StatusWahl } from '../components/Status';
import { useToast } from '../components/Toast';
import { db } from '../db/db';
import { teileHinzufuegen } from '../db/repo';
import KiBadge from '../components/KiBadge';
import { useAutoSpeichern } from '../hooks/useAutoSpeichern';
import { useAktiveTeile } from '../hooks/useDaten';
import { useKi } from '../hooks/useKi';
import { useKiErkennung } from '../hooks/useKiErkennung';
import { kiLaden } from '../ki/kiDienst';
import { useNachschlagen } from '../hooks/useNachschlagen';
import type { TeilDaten } from '../lib/aktionen';
import { fuelleFelder, type VorschlagsFeld } from '../lib/erkennung';
import { gruppenSchluessel } from '../lib/gruppierung';
import { baueName, kategorieFuerTyp, type Kleidungstyp } from '../lib/kleidungstypen';
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

function alsDaten(f: Formular, foto: FotoDaten | undefined): TeilDaten {
  return {
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
}

const LETZTER_STANDORT = 'letzterStandort';

/**
 * Neues Teil anlegen (/neu, optional ?vorlage=<teilId>) mit explizitem Speichern-Button,
 * oder bestehendes Teil bearbeiten (/teil/:id) mit automatischem Speichern.
 */
export default function TeilFormPage() {
  const { id } = useParams();
  const bearbeiten = !!id;
  const [params] = useSearchParams();
  const vorlageId = params.get('vorlage');
  const navigate = useNavigate();
  const toast = useToast();
  const { standorte, kategorien } = useNachschlagen();
  const alleTeile = useAktiveTeile();
  const { status: speicherStatus, speicher } = useAutoSpeichern(id);

  const [f, setF] = useState<Formular>(LEER);
  const [foto, setFotoState] = useState<FotoDaten>();
  const [fehler, setFehler] = useState<Fehler>({});
  const [speichert, setSpeichert] = useState(false);
  const [geladen, setGeladen] = useState(false);
  const nameRef = useRef<HTMLInputElement>(null);

  // Aktuellster Stand für Auto-Speichern (State-Updates sind asynchron)
  const fRef = useRef(f);
  const fotoRef = useRef(foto);
  fRef.current = f;
  fotoRef.current = foto;
  const fotoGeaendert = useRef(false);

  // KI-Vorschläge: nie Felder überschreiben, die der Nutzer geändert hat oder die vorbelegt sind
  const ki = useKi();
  const { anzeige: erkennung, erkenne, zuruecksetzen: erkennungZuruecksetzen } = useKiErkennung(kategorien);
  const gesperrt = useRef(new Set<VorschlagsFeld>());
  const [kiFelder, setKiFelder] = useState<ReadonlySet<VorschlagsFeld>>(new Set());
  const kiFelderRef = useRef(kiFelder);
  kiFelderRef.current = kiFelder;

  // Bereits heruntergeladenes Modell beim Öffnen des Formulars im Hintergrund in den Worker
  // laden, damit die erste Erkennung nicht auf das Laden warten muss (kein Download).
  useEffect(() => {
    if (ki.aktiv && ki.zustand.phase === 'gecacht') kiLaden();
  }, [ki.aktiv, ki.zustand.phase]);

  // Formular einmalig vorbelegen (Bearbeiten, Vorlage oder Filter aus der Liste)
  useEffect(() => {
    let abbruch = false;
    (async () => {
      const quelleId = id ?? vorlageId;
      const quelle = quelleId ? await db.teile.get(quelleId) : undefined;
      if (abbruch) return;
      if (quelle) {
        setF(ausTeil(quelle));
        setFotoState(quelle.foto && quelle.thumb ? { foto: quelle.foto, thumb: quelle.thumb } : undefined);
        // Vorhandene Werte sind "ausgefüllt"; eine leere Farbe darf die Erkennung ergänzen
        gesperrt.current = new Set<VorschlagsFeld>(['name', 'kategorieId', ...(quelle.farbe ? (['farbe'] as const) : [])]);
      } else {
        if (params.get('kategorie')) gesperrt.current.add('kategorieId');
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

  /** Im Bearbeiten-Modus: gültigen Stand zum Speichern vormerken, ungültigen verwerfen. */
  function autoSpeichern(neu: Formular, neuesFoto: FotoDaten | undefined, sofort: boolean) {
    if (!speicher) return;
    const fe = validiereTeil(neu, false);
    setFehler(fe);
    if (!istGueltig(fe)) {
      speicher.verwerfen(); // letzter gültiger Stand bleibt in der DB
      return;
    }
    const daten = alsDaten(neu, neuesFoto);
    // Ungeändertes Foto nicht mitschicken: IndexedDB liefert bei jedem Lesen ein neues
    // Blob-Objekt, ein Vergleich würde sonst immer "Foto geändert" ergeben.
    if (!fotoGeaendert.current) {
      delete daten.foto;
      delete daten.thumb;
    }
    speicher.aendern(daten, sofort);
  }

  /** Feld ändern (Nutzereingabe). `sofort` für Auswahlfelder/Schalter, sonst entprellt (Textfelder). */
  function aendere(patch: Partial<Formular>, sofort = true) {
    const geaendert = Object.keys(patch).filter((k): k is VorschlagsFeld => ['name', 'kategorieId', 'farbe'].includes(k));
    if (geaendert.length) {
      geaendert.forEach((k) => gesperrt.current.add(k));
      setKiFelder((alt) => new Set([...alt].filter((k) => !geaendert.includes(k))));
    }
    const neu = { ...fRef.current, ...patch };
    fRef.current = neu;
    setF(neu);
    if (bearbeiten) autoSpeichern(neu, fotoRef.current, sofort);
  }

  /** KI-Vorschlag übernehmen – sperrt die Felder nicht, markiert sie aber als Vorschlag. */
  function uebernimmVorschlag(patch: Partial<Record<VorschlagsFeld, string>>) {
    const felder = Object.keys(patch) as VorschlagsFeld[];
    if (!felder.length) return;
    const neu = { ...fRef.current, ...patch };
    fRef.current = neu;
    setF(neu);
    setKiFelder((alt) => new Set([...alt, ...felder]));
    if (bearbeiten) autoSpeichern(neu, fotoRef.current, true);
  }

  async function erkennungStarten(neuesFoto: Blob) {
    const ergebnis = await erkenne(neuesFoto);
    if (!ergebnis) return;
    const f = fRef.current;
    uebernimmVorschlag(
      fuelleFelder({ name: f.name, kategorieId: f.kategorieId, farbe: f.farbe }, ergebnis.vorschlag, gesperrt.current, kiFelderRef.current),
    );
  }

  /** Antippen eines der Top-3-Vorschläge bei unsicherer Erkennung (bewusste Nutzerwahl) */
  function typWaehlen(typ: Kleidungstyp) {
    const farbe = erkennung.ergebnis?.farbe;
    const patch: Partial<Formular> = {};
    const name = baueName(typ, farbe?.farbe, farbe?.helligkeit);
    if (name && !gesperrt.current.has('name')) patch.name = name;
    const kategorieId = kategorieFuerTyp(typ, kategorien);
    if (kategorieId) patch.kategorieId = kategorieId;
    aendere(patch);
    erkennungZuruecksetzen();
  }

  function setzeFoto(neu: FotoDaten | undefined) {
    fotoRef.current = neu;
    fotoGeaendert.current = true;
    setFotoState(neu);
    if (bearbeiten) autoSpeichern(fRef.current, neu, true);
    // Erkennung auf dem bereits verkleinerten Foto (max. 800 px) – einmal pro Foto, unabhängig von "Anzahl"
    if (neu && ki.aktiv) void erkennungStarten(neu.foto);
    if (!neu) erkennungZuruecksetzen();
  }

  /** onBlur von Textfeldern: ausstehende Eingabe sofort schreiben */
  const sichern = () => void speicher?.flush();

  async function hinzufuegen(e: FormEvent | null, naechstes: boolean) {
    e?.preventDefault();
    const fe = validiereTeil(f, true);
    setFehler(fe);
    if (!istGueltig(fe)) {
      nameRef.current?.focus();
      return;
    }
    setSpeichert(true);
    try {
      const daten = alsDaten(f, foto);
      try {
        localStorage.setItem(LETZTER_STANDORT, f.standortId);
      } catch {
        /* ignorieren */
      }
      const anzahl = Number(f.anzahl);
      await teileHinzufuegen(daten, anzahl);
      toast.zeige(anzahl === 1 ? `„${f.name.trim()}“ gespeichert` : `${anzahl} × „${f.name.trim()}“ gespeichert`);
      if (naechstes) {
        // Kategorie, Standort und Status bleiben für schnelles Erfassen stehen
        setF((alt) => ({ ...LEER, kategorieId: alt.kategorieId, standortId: alt.standortId, status: alt.status }));
        setFotoState(undefined);
        setFehler({});
        gesperrt.current = new Set();
        setKiFelder(new Set());
        erkennungZuruecksetzen();
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
    <Seite titel={titel} zurueck aktionen={bearbeiten ? <SpeicherAnzeige status={speicherStatus} onErneut={() => speicher?.erneutVersuchen()} /> : undefined}>
      <form
        onSubmit={(e) => (bearbeiten ? e.preventDefault() : hinzufuegen(e, false))}
        noValidate
        className="space-y-5"
      >
        <FotoWaehler wert={foto} onChange={setzeFoto} />

        {(erkennung.laeuft || erkennung.meldung || erkennung.ergebnis) && (
          <div aria-live="polite" className="-mt-2 rounded-xl bg-violet-50 px-3 py-2 text-sm text-violet-950 dark:bg-violet-950/40 dark:text-violet-100">
            {erkennung.laeuft ? (
              <p className="flex items-center gap-2">
                <span aria-hidden="true" className="h-4 w-4 animate-spin rounded-full border-2 border-violet-300 border-t-violet-700" />
                Erkenne Kleidungsstück …
              </p>
            ) : (
              <>
                {erkennung.ergebnis?.erkennung?.sicher && (
                  <p>
                    ✨ Erkannt: <strong>{erkennung.ergebnis.erkennung.typ?.name}</strong>
                    {erkennung.ergebnis.farbe && ` · Farbe ${erkennung.ergebnis.farbe.farbe}`}
                  </p>
                )}
                {erkennung.meldung && <p>{erkennung.meldung}</p>}
                {!erkennung.ergebnis?.erkennung?.sicher && erkennung.ergebnis?.erkennung?.top3.length ? (
                  <div className="mt-2">
                    <p className="mb-1 text-xs">Meintest du …</p>
                    <div className="flex flex-wrap gap-2">
                      {erkennung.ergebnis.erkennung.top3.map(({ typ, wert }) => (
                        <button key={typ.id} type="button" className="chip-aus min-h-[44px]" onClick={() => typWaehlen(typ)}>
                          {typ.name} <span className="text-xs text-slate-500 dark:text-slate-400">{Math.round(wert * 100)} %</span>
                        </button>
                      ))}
                    </div>
                  </div>
                ) : null}
                {!erkennung.ergebnis?.erkennung?.sicher && erkennung.ergebnis?.farbe && !erkennung.ergebnis.kiFehler && (
                  <p className="mt-1 text-xs">Farbe: {erkennung.ergebnis.farbe.farbe}</p>
                )}
              </>
            )}
          </div>
        )}

        <div>
          <label htmlFor="name" className="label">
            Name <span className="text-red-700 dark:text-red-400">*</span>
            <KiBadge sichtbar={kiFelder.has('name')} />
          </label>
          <input
            ref={nameRef}
            id="name"
            className="eingabe"
            value={f.name}
            onChange={(e) => aendere({ name: e.target.value }, false)}
            onBlur={sichern}
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
              {bearbeiten && ' Bis dahin bleibt der zuletzt gespeicherte Name erhalten.'}
            </p>
          )}
        </div>

        <fieldset>
          <legend className="label">
            Kategorie
            <KiBadge sichtbar={kiFelder.has('kategorieId')} />
          </legend>
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
            {kategorien.map((k) => (
              <label key={k.id}>
                <input
                  type="radio"
                  name="kategorie"
                  value={k.id}
                  checked={f.kategorieId === k.id}
                  onChange={() => aendere({ kategorieId: k.id })}
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
          onChange={(v) => aendere({ standortId: v })}
          fehler={fehler.standortId}
        />

        <details className="karte p-4" open={bearbeiten || !!vorlageId}>
          <summary className="-m-2 cursor-pointer rounded-lg p-2 font-medium">Weitere Angaben (optional)</summary>
          <div className="mt-4 space-y-5">
            <StatusWahl label="Status" wert={f.status} onChange={(v) => v && aendere({ status: v })} />
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="farbe" className="label">
                  Farbe
                  <KiBadge sichtbar={kiFelder.has('farbe')} />
                </label>
                <input
                  id="farbe"
                  className="eingabe"
                  value={f.farbe}
                  onChange={(e) => aendere({ farbe: e.target.value }, false)}
                  onBlur={sichern}
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
                  onChange={(e) => aendere({ groesse: e.target.value }, false)}
                  onBlur={sichern}
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
              onChange={(v) => aendere({ zustand: v })}
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
                onChange={(e) => aendere({ notiz: e.target.value }, false)}
                onBlur={sichern}
              />
            </div>
          </div>
        </details>

        {!bearbeiten && (
          <>
            <div>
              <label htmlFor="anzahl" className="label">
                Anzahl
              </label>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  aria-label="Anzahl verringern"
                  className="btn-sekundaer w-12 text-xl"
                  onClick={() => aendere({ anzahl: String(Math.max(ANZAHL_MIN, (Number(f.anzahl) || 1) - 1)) })}
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
                  onChange={(e) => aendere({ anzahl: e.target.value })}
                  aria-invalid={!!fehler.anzahl}
                  aria-describedby="anzahl-hinweis"
                />
                <button
                  type="button"
                  aria-label="Anzahl erhöhen"
                  className="btn-sekundaer w-12 text-xl"
                  onClick={() => aendere({ anzahl: String(Math.min(ANZAHL_MAX, (Number(f.anzahl) || 0) + 1)) })}
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

            <div className="flex flex-col gap-2 sm:flex-row">
              <button type="submit" className="btn-primaer flex-1" disabled={speichert}>
                Hinzufügen
              </button>
              <button type="button" className="btn-sekundaer flex-1" disabled={speichert} onClick={() => hinzufuegen(null, true)}>
                Speichern &amp; nächstes Teil
              </button>
            </div>
          </>
        )}

        {bearbeiten && (
          <p className="text-center text-sm text-slate-500 dark:text-slate-400">Änderungen werden automatisch gespeichert.</p>
        )}
      </form>
    </Seite>
  );
}
