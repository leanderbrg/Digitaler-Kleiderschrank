# 👕 Kleiderschrank

Progressive Web App zur Verwaltung deiner Kleidung an zwei Standorten. Jedes Kleidungsstück ist ein
eigener Datensatz mit eigenem Foto; gleiche Teile werden automatisch zu Gruppen zusammengefasst
(„4 Stück: Standort 1: 3 (1 in der Wäsche), Standort 2: 1“).

- 📷 Teile per Handykamera erfassen (Fotos werden automatisch verkleinert)
- 📍 Jederzeit sehen, was wo ist – im Schrank oder in der Wäsche
- 🧳 Packliste: Teile gesammelt von einem Standort zum anderen verschieben
- 🧺 Wäsche-Ansicht mit „Alles sauber → zurück in den Schrank“
- 🗑️ Aussortieren mit Grund, Rückgängig und Papierkorb
- 📈 Verlauf und Statistik (Bestand, Aussortiertes pro Monat, häufigste Gründe)
- 🌙 Dark Mode, offline nutzbar, installierbar, kein Konto, kein Server

## Voraussetzungen

[Node.js](https://nodejs.org/) 20 oder neuer (getestet mit Node 24).

## Lokal starten

```bash
npm install
npm run dev
```

Danach http://localhost:5173 öffnen. Mit `npm run dev -- --host` ist der Server auch im WLAN erreichbar
(Kamera und Service Worker funktionieren auf dem Handy allerdings nur über HTTPS – zum echten Testen am
besten deployen, siehe unten).

## Bauen

```bash
npm run build     # Typprüfung + Produktions-Build nach dist/
npm run preview   # Build lokal ansehen (inkl. Service Worker / Offline-Modus)
```

## Tests

```bash
npm test             # einmalig
npm run test:watch   # im Watch-Modus
```

Getestet wird die Kernlogik als reine Funktionen in `src/lib` (Gruppierung, Filter, Verschieben,
Aussortieren, Statistik, Validierung, Export-Format) sowie die Datenbank-Aktionen inkl. „Rückgängig“
gegen eine simulierte IndexedDB (`fake-indexeddb`).

## Auf dem Handy installieren

1. Die App über eine **HTTPS-Adresse** öffnen (z. B. nach dem Deployment auf Netlify/Vercel/GitHub Pages).
2. **Android (Chrome):** Menü ⋮ → „App installieren“ bzw. „Zum Startbildschirm hinzufügen“.
3. **iPhone (Safari):** Teilen-Symbol → „Zum Home-Bildschirm“.

Danach startet die App wie eine normale App im Vollbild und funktioniert auch ohne Internet.

> Hinweis: Die Daten sind an den Browser **und** die Adresse gebunden. Die installierte App auf dem
> Handy und der Browser am PC haben jeweils eigene, getrennte Daten. Zum Übertragen: Export auf dem
> einen Gerät, Import auf dem anderen.

## Deployment

Die App ist eine rein statische Seite – `npm run build` erzeugt den Ordner `dist/`, den jeder
Static-Hoster ausliefern kann.

### Netlify

- Build command: `npm run build`, Publish directory: `dist`
- Die Datei `public/_redirects` sorgt dafür, dass Unterseiten wie `/liste` beim Neuladen funktionieren.

### Vercel

- Framework Preset „Vite“, Output `dist` (wird automatisch erkannt).
- `vercel.json` enthält die nötige Weiterleitung für Unterseiten.

### GitHub Pages

- Repository auf GitHub anlegen und pushen (Branch `main`).
- Unter **Settings → Pages → Source** „GitHub Actions“ wählen.
- Der Workflow `.github/workflows/deploy.yml` testet, baut mit `BASE_PATH=/<repo-name>/` und
  veröffentlicht automatisch. Die App liegt dann unter `https://<user>.github.io/<repo-name>/`.

Für andere Unterordner lässt sich der Pfad beim Bauen über die Umgebungsvariable `BASE_PATH` setzen.

## ⚠️ Backup – wichtig!

Alle Daten (inkl. Fotos) liegen **ausschließlich lokal** in der IndexedDB deines Browsers. Es gibt keinen
Server und keine Cloud-Synchronisation. Die Daten gehen verloren, wenn du

- die Browserdaten bzw. Website-Daten löschst,
- die App deinstallierst oder
- das Gerät wechselst/zurücksetzt.

Erstelle deshalb regelmäßig unter **Einstellungen → Exportieren** eine Sicherung (JSON-Datei inkl. Fotos
als Base64) und speichere sie z. B. in deiner Cloud. Die App erinnert dich in den Einstellungen, wenn der
letzte Export länger als 30 Tage zurückliegt. Beim **Import** werden alle aktuellen Daten nach einer
Sicherheitsabfrage überschrieben.

## Annahmen & Entscheidungen

- **Vorschaubilder:** Zusätzlich zum Foto (max. 800 px, JPEG 0,8) wird pro Teil ein kleines
  Vorschaubild (max. 240 px) gespeichert. Listen laden nur diese Thumbnails – das spart Speicher
  und macht lange Listen flüssig. Fotos werden erst geladen, wenn sie in den sichtbaren Bereich
  kommen; Object-URLs werden beim Verlassen wieder freigegeben.
- **Gruppierung:** Schlüssel = Kategorie + Name + Farbe (jeweils ohne Groß-/Kleinschreibung und
  überflüssige Leerzeichen). Die Größe zählt bewusst nicht dazu. Damit gleiche Teile zuverlässig
  zusammenfinden, schlägt das Formular beim Tippen bereits vorhandene Namen und Farben vor.
- **„Weiteres Teil dieser Gruppe hinzufügen“** übernimmt alle Felder **inkl. Foto** des ersten
  Teils; das Foto lässt sich vor dem Speichern oder später über „Bearbeiten“ austauschen.
- **Gefilterte Liste:** Gruppenkarten zeigen die Zahlen innerhalb des aktiven Filters (z. B. nur
  Standort 2).
- **Aussortieren** ist immer Soft-Delete. Aussortierte Teile landen im **Papierkorb** (Tab im
  Verlauf), wo man sie wiederherstellen oder – mit Sicherheitsabfrage – endgültig löschen kann.
  Für Wiederherstellungen gibt es die zusätzliche Verlaufsaktion „wiederhergestellt“.
- **Statistik „aussortiert pro Monat/Gründe“** wird aus dem Verlauf berechnet. Dadurch zählen auch
  endgültig gelöschte Teile weiter mit; wiederhergestellte Teile zählen nicht.
- **Kategorien löschen** geht nur, wenn ihr gar keine Teile mehr zugeordnet sind – auch keine im
  Papierkorb.
- **Rückgängig** gibt es (6 Sekunden lang als Hinweis oben) für Aussortieren, Verschieben,
  Wäsche-Status und Wiederherstellen.
- **Dark Mode** (System/Hell/Dunkel) wird pro Gerät in `localStorage` gespeichert, damit er schon
  vor dem ersten Rendern greift. Alle anderen Daten liegen in IndexedDB.
- Beim Bestätigen des Willkommenshinweises bittet die App den Browser um **dauerhaften Speicher**
  (`navigator.storage.persist()`), damit die Daten nicht bei Speicherknappheit gelöscht werden.
- **Beispieldaten** sind intern markiert und lassen sich gezielt wieder entfernen, ohne eigene
  Teile anzutasten.

## Projektstruktur

```
src/
  components/   UI-Bausteine (Karten, Dialoge, Navigation, Diagramme …)
  pages/        ein Screen pro Datei
  db/           Dexie-Datenbank, Repository (schreibende Aktionen), Beispieldaten
  hooks/        Live-Queries, Object-URLs, Mehrfachauswahl, Farbschema
  lib/          reine Funktionen + Vitest-Tests
  types/        Datentypen
```

Weitere Konventionen stehen in [CLAUDE.md](CLAUDE.md).
