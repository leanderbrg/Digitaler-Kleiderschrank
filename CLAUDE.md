# Kleiderschrank – Projektüberblick

Progressive Web App zur Verwaltung von Kleidung an zwei Standorten. Jedes Kleidungsstück
ist ein eigener Datensatz (mit eigenem Foto); gleiche Teile werden in Listen automatisch
gruppiert. Alles läuft lokal im Browser (IndexedDB via Dexie), kein Backend, kein Login.

## Tech-Stack
React 18 + Vite + TypeScript, Tailwind CSS 3, React Router 6, Dexie 4 (+ dexie-react-hooks),
vite-plugin-pwa, Vitest, @huggingface/transformers (KI-Erkennung, nur im Web Worker).

## Befehle
- `npm install` – Abhängigkeiten installieren
- `npm run dev` – Entwicklungsserver (http://localhost:5173)
- `npm run build` – Typprüfung (`tsc -b`) + Produktions-Build nach `dist/`
- `npm run preview` – Build lokal ansehen (inkl. Service Worker)
- `npm test` – Vitest einmalig ausführen (`npm run test:watch` für Watch-Modus)

## Struktur
- `src/types` – Datentypen (Teil, Standort, Kategorie, Verlaufseintrag, …)
- `src/db` – Dexie-Datenbank, Standardwerte, Repository-Funktionen (schreibende Aktionen), Beispieldaten
- `src/lib` – **reine Funktionen** ohne DOM/DB-Zugriff (Gruppierung, Filter, Verschieben,
  Aussortieren, Statistik, Validierung, Export-Format, Migration, Auto-Speichern-Warteschlange,
  Farbanalyse, Kleidungstypen/Namensbildung, Auswertung der Erkennung). Jede Datei hat Tests in
  `*.test.ts`. Ausnahme: `bild.ts` (Canvas) und `export.ts`-Blob-Helfer nutzen Browser-APIs.
- `src/ki` – KI-Erkennung: `ki.worker.ts` (Transformers.js, Marqo-FashionCLIP), `kiDienst.ts`
  (Hauptthread-Singleton: Worker lazy starten, Status, Cache prüfen/löschen), `protokoll.ts` (Nachrichten)
- `src/hooks` – React-Hooks (Live-Queries, Object-URLs, Auswahl, Einstellungen, Auto-Speichern, KI)
- `src/components` – wiederverwendbare UI-Bausteine
- `src/pages` – eine Datei pro Screen

## Konventionen
- UI-Texte, Bezeichner der Domäne und Kommentare auf Deutsch (`teil`, `standortId`, `aussortiert`);
  technische Begriffe (hook, props) dürfen englisch bleiben.
- Schreibende DB-Operationen nur über `src/db/repo.ts`; die eigentliche Logik (was ändert sich,
  welche Verlaufseinträge entstehen) steckt in reinen Funktionen in `src/lib/aktionen.ts`.
- Aussortieren ist immer Soft-Delete (`aussortiert = true`). Endgültiges Löschen nur im Papierkorb
  (Verlauf-Screen) mit Sicherheitsabfrage.
- Object-URLs nur über `useObjectUrl` erzeugen – der Hook gibt sie beim Unmount frei.
- Zeitstempel sind `number` (ms seit Epoch).
- Mobile-first: Touch-Ziele mind. 44 px, sichtbare Fokus-Ringe (`focus-visible:ring`).
- Dark Mode über Tailwind `darkMode: 'class'` (Klasse `dark` auf `<html>`).
- Status: `'schrank' | 'getragen' | 'waesche'` (`STATUS_WERTE`, `STATUS_INFO` für Icon/Kurzlabel).
  Statusauswahl immer über `StatusWahl`/`StatusBadge` aus `components/Status.tsx`. Verlaufsaktion
  für Statuswechsel ist `'status'`; `'wäsche'` ist Altbestand (Version 1) und wird migriert.
- Schema-/Formatänderungen: Dexie-Version erhöhen (`db.ts`, mit `upgrade`), `EXPORT_VERSION`
  erhöhen, Normalisierung in `lib/migration.ts` ergänzen und testen (DB-Upgrade + Import alter Exporte).
- Bearbeiten speichert automatisch (`useAutoSpeichern` → `repo.teilAutoSpeichern`); keine
  Speichern-Buttons für bestehende Teile. Neue Felder in `alsDaten` (TeilFormPage) aufnehmen.
- KI: Worker/Transformers.js nie statisch im Hauptbundle importieren und nie beim App-Start laden.
  Modelldateien gehören nicht ins Bundle oder in den Precache. KI-Vorschläge nur über
  `fuelleFelder` anwenden (überschreibt keine Nutzereingaben).
- Textdateien nicht per PowerShell `Get-Content`/`Set-Content` umschreiben (zerstört Umlaute) –
  den Editor verwenden.
