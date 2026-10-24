import { useEffect, useRef, useState } from 'react';
import BeispieldatenButton from '../components/BeispieldatenButton';
import Dialog from '../components/Dialog';
import Seite from '../components/Seite';
import Segment from '../components/Segment';
import { useToast } from '../components/Toast';
import {
  datenErsetzen,
  datenLesen,
  kategorieAktualisieren,
  kategorieHinzufuegen,
  kategorieLoeschen,
  standortUmbenennen,
} from '../db/repo';
import { setzeEinstellung, useAktiveTeile, useEinstellung } from '../hooks/useDaten';
import { useFarbschema } from '../hooks/useFarbschema';
import { useNachschlagen } from '../hooks/useNachschlagen';
import { erstelleExport, exportFaellig, pruefeImport, type Datenbestand } from '../lib/export';
import type { Kategorie, Standort } from '../types';

function Abschnitt({ titel, children }: { titel: string; children: React.ReactNode }) {
  return (
    <section className="karte p-4" aria-label={titel}>
      <h2 className="mb-3 text-lg font-semibold">{titel}</h2>
      {children}
    </section>
  );
}

export default function EinstellungenPage() {
  const [schema, setSchema] = useFarbschema();
  return (
    <Seite titel="Einstellungen">
      <div className="space-y-4">
        <BackupAbschnitt />
        <Abschnitt titel="Standorte">
          <StandortListe />
        </Abschnitt>
        <Abschnitt titel="Kategorien">
          <KategorieListe />
        </Abschnitt>
        <Abschnitt titel="Darstellung">
          <Segment
            label="Farbschema"
            optionen={[
              { wert: 'system', label: '🖥️ System' },
              { wert: 'hell', label: '☀️ Hell' },
              { wert: 'dunkel', label: '🌙 Dunkel' },
            ]}
            wert={schema}
            onChange={setSchema}
          />
        </Abschnitt>
        <Abschnitt titel="Beispieldaten">
          <p className="mb-3 text-sm text-slate-600 dark:text-slate-400">
            Zum Ausprobieren: lädt rund 40 Beispielteile mit Fotos. Beim Entfernen werden nur die Beispielteile gelöscht.
          </p>
          <BeispieldatenButton />
        </Abschnitt>
        <p className="px-1 text-center text-xs text-slate-500 dark:text-slate-400">
          Kleiderschrank · Alle Daten bleiben lokal auf diesem Gerät.
        </p>
      </div>
    </Seite>
  );
}

function StandortListe() {
  const { standorte } = useNachschlagen();
  return (
    <ul className="space-y-2">
      {standorte.map((s) => (
        <li key={s.id}>
          <StandortZeile standort={s} />
        </li>
      ))}
    </ul>
  );
}

function StandortZeile({ standort }: { standort: Standort }) {
  const [name, setName] = useState(standort.name);
  const toast = useToast();
  useEffect(() => setName(standort.name), [standort.name]);
  const geaendert = name.trim() !== standort.name && name.trim() !== '';

  async function speichern() {
    await standortUmbenennen(standort.id, name);
    toast.zeige('Standort umbenannt');
  }

  return (
    <form
      className="flex gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        if (geaendert) speichern();
      }}
    >
      <label htmlFor={`st-${standort.id}`} className="sr-only">
        Name für {standort.name}
      </label>
      <input id={`st-${standort.id}`} className="eingabe" value={name} onChange={(e) => setName(e.target.value)} maxLength={40} />
      <button type="submit" className="btn-primaer" disabled={!geaendert}>
        Speichern
      </button>
    </form>
  );
}

function KategorieListe() {
  const { kategorien } = useNachschlagen();
  const [name, setName] = useState('');
  const [emoji, setEmoji] = useState('');
  const [fehler, setFehler] = useState<string>();

  async function hinzufuegen(e: React.FormEvent) {
    e.preventDefault();
    try {
      await kategorieHinzufuegen(name, emoji);
      setName('');
      setEmoji('');
      setFehler(undefined);
    } catch (err) {
      setFehler((err as Error).message);
    }
  }

  return (
    <>
      <ul className="space-y-2">
        {kategorien.map((k) => (
          <li key={k.id}>
            <KategorieZeile kategorie={k} />
          </li>
        ))}
      </ul>
      <form onSubmit={hinzufuegen} className="mt-4 border-t border-slate-200 pt-4 dark:border-slate-800">
        <p className="label">Neue Kategorie</p>
        <div className="flex gap-2">
          <label htmlFor="neu-emoji" className="sr-only">
            Emoji
          </label>
          <input id="neu-emoji" className="eingabe w-16 text-center text-xl" placeholder="🧢" value={emoji} onChange={(e) => setEmoji(e.target.value)} maxLength={8} />
          <label htmlFor="neu-name" className="sr-only">
            Name
          </label>
          <input id="neu-name" className="eingabe" placeholder="z. B. Mützen" value={name} onChange={(e) => setName(e.target.value)} maxLength={40} />
          <button type="submit" className="btn-primaer" disabled={!name.trim()}>
            Hinzufügen
          </button>
        </div>
        {fehler && <p className="mt-1 text-sm text-red-700 dark:text-red-400">{fehler}</p>}
      </form>
    </>
  );
}

function KategorieZeile({ kategorie }: { kategorie: Kategorie }) {
  const [name, setName] = useState(kategorie.name);
  const [emoji, setEmoji] = useState(kategorie.emoji);
  const [fehler, setFehler] = useState<string>();
  const toast = useToast();
  useEffect(() => {
    setName(kategorie.name);
    setEmoji(kategorie.emoji);
  }, [kategorie.name, kategorie.emoji]);
  const geaendert = (name.trim() !== kategorie.name || emoji.trim() !== kategorie.emoji) && name.trim() !== '';

  async function speichern(e: React.FormEvent) {
    e.preventDefault();
    if (!geaendert) return;
    await kategorieAktualisieren(kategorie.id, name, emoji);
    toast.zeige('Kategorie gespeichert');
  }

  async function loeschen() {
    try {
      await kategorieLoeschen(kategorie.id);
      toast.zeige(`Kategorie „${kategorie.name}“ gelöscht`);
    } catch (err) {
      setFehler((err as Error).message);
    }
  }

  return (
    <form onSubmit={speichern}>
      <div className="flex gap-2">
        <label htmlFor={`ke-${kategorie.id}`} className="sr-only">
          Emoji für {kategorie.name}
        </label>
        <input id={`ke-${kategorie.id}`} className="eingabe w-16 text-center text-xl" value={emoji} onChange={(e) => setEmoji(e.target.value)} maxLength={8} />
        <label htmlFor={`kn-${kategorie.id}`} className="sr-only">
          Name für {kategorie.name}
        </label>
        <input id={`kn-${kategorie.id}`} className="eingabe" value={name} onChange={(e) => setName(e.target.value)} maxLength={40} />
        {geaendert ? (
          <button type="submit" className="btn-primaer">
            ✓<span className="sr-only">Speichern</span>
          </button>
        ) : (
          <button type="button" className="btn-sekundaer" onClick={loeschen} aria-label={`Kategorie ${kategorie.name} löschen`}>
            🗑️
          </button>
        )}
      </div>
      {fehler && <p className="mt-1 text-sm text-red-700 dark:text-red-400">{fehler}</p>}
    </form>
  );
}

function BackupAbschnitt() {
  const letzterExport = useEinstellung<number>('letzterExport');
  const teile = useAktiveTeile();
  const toast = useToast();
  const dateiRef = useRef<HTMLInputElement>(null);
  const [importDaten, setImportDaten] = useState<Datenbestand | null>(null);
  const [fehler, setFehler] = useState<string>();
  const [laeuft, setLaeuft] = useState(false);

  const erinnern = (teile?.length ?? 0) > 0 && exportFaellig(letzterExport, Date.now());

  async function exportieren() {
    setLaeuft(true);
    try {
      const datei = await erstelleExport(await datenLesen());
      const blob = new Blob([JSON.stringify(datei)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `kleiderschrank-backup-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      await setzeEinstellung('letzterExport', Date.now());
      toast.zeige(`Export mit ${datei.teile.length} Teilen erstellt`);
    } finally {
      setLaeuft(false);
    }
  }

  async function dateiGewaehlt(datei: File | undefined) {
    if (!datei) return;
    setFehler(undefined);
    try {
      const ergebnis = pruefeImport(JSON.parse(await datei.text()));
      if (ergebnis.ok) setImportDaten(ergebnis.daten);
      else setFehler(ergebnis.fehler);
    } catch {
      setFehler('Die Datei konnte nicht gelesen werden (kein gültiges JSON).');
    } finally {
      if (dateiRef.current) dateiRef.current.value = '';
    }
  }

  async function importieren() {
    if (!importDaten) return;
    setLaeuft(true);
    try {
      await datenErsetzen(importDaten);
      toast.zeige(`${importDaten.teile.length} Teile importiert`);
      setImportDaten(null);
    } catch {
      setFehler('Import fehlgeschlagen. Deine bisherigen Daten sind unverändert.');
      setImportDaten(null);
    } finally {
      setLaeuft(false);
    }
  }

  return (
    <Abschnitt titel="Sicherung (Export & Import)">
      {erinnern && (
        <div role="alert" className="mb-3 rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-700 dark:bg-amber-950/50 dark:text-amber-200">
          ⚠️ {letzterExport ? `Dein letzter Export ist mehr als 30 Tage her (${new Date(letzterExport).toLocaleDateString('de-DE')}).` : 'Du hast noch nie exportiert.'}{' '}
          Deine Daten liegen nur auf diesem Gerät – erstelle jetzt eine Sicherung.
        </div>
      )}
      <p className="mb-3 text-sm text-slate-600 dark:text-slate-400">
        Der Export enthält alle Teile inkl. Fotos, Verlauf, Standorte und Kategorien als JSON-Datei.
        {letzterExport && !erinnern && ` Letzter Export: ${new Date(letzterExport).toLocaleDateString('de-DE')}.`}
      </p>
      <div className="flex flex-col gap-2 sm:flex-row">
        <button type="button" className="btn-primaer flex-1" onClick={exportieren} disabled={laeuft}>
          ⬇️ Exportieren
        </button>
        <label className="btn-sekundaer flex-1 cursor-pointer focus-within:ring-2 focus-within:ring-marke-500">
          ⬆️ Importieren …
          <input ref={dateiRef} type="file" accept="application/json,.json" className="sr-only" onChange={(e) => dateiGewaehlt(e.target.files?.[0])} />
        </label>
      </div>
      {fehler && <p className="mt-2 text-sm text-red-700 dark:text-red-400">{fehler}</p>}

      <Dialog
        offen={!!importDaten}
        titel="Daten importieren?"
        onSchliessen={() => setImportDaten(null)}
        fuss={
          <>
            <button type="button" className="btn-sekundaer" onClick={() => setImportDaten(null)}>
              Abbrechen
            </button>
            <button type="button" className="btn-gefahr" onClick={importieren} disabled={laeuft}>
              Alles überschreiben
            </button>
          </>
        }
      >
        <div className="space-y-2 text-sm">
          <p>
            Die Datei enthält <strong>{importDaten?.teile.length} Teile</strong>, {importDaten?.verlauf.length} Verlaufseinträge,{' '}
            {importDaten?.standorte.length} Standorte und {importDaten?.kategorien.length} Kategorien.
          </p>
          <p className="rounded-lg bg-red-50 p-2 text-red-900 dark:bg-red-950/50 dark:text-red-200">
            ⚠️ Alle aktuellen Daten auf diesem Gerät werden <strong>überschrieben</strong>. Exportiere vorher, falls du sie behalten
            willst.
          </p>
        </div>
      </Dialog>
    </Abschnitt>
  );
}
