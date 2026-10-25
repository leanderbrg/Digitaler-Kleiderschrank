# 👕 Kleiderschrank

Progressive Web App zur Verwaltung deiner Kleidung an zwei Standorten. Jedes Kleidungsstück ist ein
eigener Datensatz mit eigenem Foto; gleiche Teile werden automatisch zu Gruppen zusammengefasst
(„4 Stück: Standort 1: 3 (1 getragen, 1 in der Wäsche), Standort 2: 1“).

- 📷 Teile per Handykamera erfassen (Fotos werden automatisch verkleinert)
- ✨ Optional: lokale KI erkennt Art und Farbe und schlägt Name, Kategorie und Farbe vor
- 📍 Jederzeit sehen, was wo ist – im Schrank 🗄️, getragen 🪑 oder in der Wäsche 🧺
- 🧳 Packliste: Teile gesammelt von einem Standort zum anderen verschieben
- 🧺 „Wäsche & Getragen“ mit Massenaktionen (Getragen → Wäsche, Wäsche → sauber in den Schrank)
- 💾 Bearbeiten speichert automatisch – kein Speichern-Button
- 🗑️ Aussortieren mit Grund, Rückgängig und Papierkorb
- 📈 Verlauf und Statistik (Bestand nach Kategorie und Status, Aussortiertes pro Monat, häufigste Gründe)
- 🌙 Dark Mode, offline nutzbar, installierbar, kein Konto, kein Server

> 🔒 **Alle Daten und Fotos bleiben auf deinem Gerät.** Auch die KI-Erkennung läuft vollständig im
> Browser; es werden keine Fotos hochgeladen. Einzige Verbindung nach außen ist der einmalige
> Download des KI-Modells – und nur, wenn du die KI-Erkennung einschaltest.

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

Getestet wird die Kernlogik als reine Funktionen in `src/lib` (Gruppierung mit drei Status, Filter,
Verschieben, Aussortieren, Statistik, Validierung, Export-Format, Migration, Auto-Speichern mit
Debounce/Serialisierung/Verlaufs-Zusammenfassung, Farb- und Helligkeitserkennung mit synthetischen
Pixel-Arrays, Namensbildung mit Deklination, Label→Kategorie-Zuordnung) sowie die Datenbank-Aktionen
inkl. „Rückgängig“ und Schema-Migration gegen eine simulierte IndexedDB (`fake-indexeddb`).
Das KI-Modell selbst wird in den Tests gemockt; für die echte Erkennung gibt es den
[manuellen Testplan](#manueller-testplan).

## KI-Erkennung

Unter **Einstellungen → KI-Erkennung** lässt sich die Erkennung einschalten (Standard: aus). Danach
wird nach jedem Foto automatisch erkannt, was zu sehen ist, z. B. Foto einer hellen Jeans →
Name „Helle Jeans“, Kategorie „Hosen“, Farbe „blau“.

**So funktioniert es**

- **Art des Kleidungsstücks:** Zero-Shot-Bildklassifikation mit einem CLIP-Modell über
  [Transformers.js](https://huggingface.co/docs/transformers.js) – das Foto wird mit 20 englischen
  Beschreibungen verglichen („a photo of jeans“, „a photo of socks“ …). Die Tabelle mit deutschem
  Namen, Genus, Standardkategorie und Prompt steht in `src/lib/kleidungstypen.ts`. Unterhalb von 35 %
  Wahrscheinlichkeit wird nichts ausgefüllt („Nicht sicher erkannt“); stattdessen erscheinen die drei
  wahrscheinlichsten Typen als antippbare Chips.
- **Farbe und Helligkeit** kommen **nicht** aus der KI, sondern aus einer Pixelanalyse: Bild auf 64 px
  verkleinern, nur die mittleren 60 % auswerten (Rand ≈ Hintergrund), dominante Farbe per k-Means,
  Umrechnung in HSL und Zuordnung zu einem deutschen Farbnamen sowie „hell“/„dunkel“. Schwellwerte
  stehen als Konstanten in `src/lib/farbe.ts`.
- **Name:** „<Farbe> <Typ>“ mit korrekter Endung je Genus („Weißes T-Shirt“, „Blauer Pullover“,
  „Schwarze Socken“). Bei Jeans und Hosen in Blau/Grau zählt die Helligkeit: „Helle Jeans“, „Dunkle Jeans“.
- **Kategorie** wird über den **Namen** zugeordnet. Fehlt die Kategorie (gelöscht/umbenannt), wird
  „Sonstiges“ genommen – oder das Feld bleibt, wie es ist. Es wird nie eine Kategorie angelegt.
- Vorschläge **überschreiben nie** Felder, die du selbst ausgefüllt oder geändert hast. Vorausgefüllte
  Felder tragen kurz das Badge „✨ Vorschlag der KI“, das beim Bearbeiten verschwindet.

**Modellwahl: Marqo-FashionCLIP statt Standard-CLIP**

Startpunkt war `Xenova/clip-vit-base-patch32` (allgemeines CLIP). Geprüft und gewählt wurde
[`Marqo/marqo-fashionCLIP`](https://huggingface.co/Marqo/marqo-fashionCLIP):

- speziell auf Mode-Produktbilder feinjustiert und laut Modellkarte auf allen dort genannten
  Mode-Benchmarks besser als das Basis-CLIP, aus dem es entstanden ist,
- ähnlich groß (quantisiert ca. 140–150 MB, Standard-CLIP ca. 150 MB),
- offiziell mit Transformers.js nutzbar (ONNX-Dateien und JS-Beispiel auf der Modellkarte),
- Text- und Bild-Encoder sind getrennt: Die 20 Prompts werden einmal pro Sitzung eingebettet, danach
  braucht jedes Foto nur noch den Bild-Encoder.

Im Test (Wikipedia-Fotos von Jeans, T-Shirt, Socken, Pullover, Hoodie, Sneakern, Schal) wurde jedes
Teil mit 98–100 % richtig erkannt; erste Erkennung pro Sitzung ca. 2 s (Laden + Text-Embeddings),
danach ca. 0,15 s pro Foto mit WebGPU.

**Technik, Download, Offline**

- Läuft in einem **Web Worker** (die Oberfläche bleibt bedienbar). Worker, Transformers.js und Modell
  werden erst geladen, wenn die Erkennung gebraucht wird – nie beim App-Start.
- **WebGPU**, wenn verfügbar (Modellvariante `q4f16`, ca. 139 MB), sonst **WebAssembly** (`q8`,
  ca. 152 MB). Dazu kommt die WASM-Laufzeit (ca. 21 MB). Angezeigt wird „ca. 170 MB“.
- Modelldateien kommen einmalig von huggingface.co und werden von Transformers.js im Cache
  `transformers-cache` abgelegt. Die WASM-Laufzeit liefert die App selbst aus (`/ki/`, kein CDN); sie
  und das Worker-Skript cacht der Service Worker beim ersten Gebrauch (`ki-laufzeit`). Beides ist
  **nicht** im Offline-Vorabcache – wer die KI nicht nutzt, lädt nichts davon. Das Haupt-Bundle wächst
  nur um ca. 25 KB.
- Nach dem ersten Download funktioniert die Erkennung **offline** (getestet mit gestopptem Server:
  App, Worker, Laufzeit und Modell kamen aus den Caches).
- **Modell löschen** in den Einstellungen leert beide Caches und schaltet die Erkennung aus.
- Kann das Modell nicht geladen werden (offline vor dem ersten Download, zu wenig Speicher, Browser
  ohne Unterstützung), läuft die App normal weiter: kurzer Hinweis, Farbe wird trotzdem erkannt.

**Grenzen der Erkennung**

- Nur die 20 Typen der Liste; alles andere landet beim ähnlichsten Typ oder bei „Sonstiges“
  (z. B. wurde eine Krawatte als „Schal“ erkannt).
- Mehrere Kleidungsstücke auf einem Foto, starke Anschnitte oder Fotos am Körper verschlechtern
  das Ergebnis.
- Die Farbe ist die dominante Farbe der Bildmitte: Muster, Streifen und Aufdrucke werden nicht
  erkannt; farbiges Licht oder ein Hintergrund in der Bildmitte verfälschen sie.
- Feinheiten wie „Chino“ oder „Slim Fit“ erkennt das Modell nicht – der Name ist ein Startpunkt
  zum Anpassen.

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

- Auf github.com ein **leeres** Repository anlegen (ohne README/Lizenz/.gitignore) und pushen:
  ```bash
  git remote add origin https://github.com/<user>/<repo-name>.git
  git push -u origin main
  ```
  Beim ersten Push öffnet sich ein Browserfenster zur GitHub-Anmeldung.
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
  Statuswechsel und Wiederherstellen.
- **Dark Mode** (System/Hell/Dunkel) wird pro Gerät in `localStorage` gespeichert, damit er schon
  vor dem ersten Rendern greift. Alle anderen Daten liegen in IndexedDB.
- Beim Bestätigen des Willkommenshinweises bittet die App den Browser um **dauerhaften Speicher**
  (`navigator.storage.persist()`), damit die Daten nicht bei Speicherknappheit gelöscht werden.
- **Beispieldaten** sind intern markiert und lassen sich gezielt wieder entfernen, ohne eigene
  Teile anzutasten.

### Status „Getragen“

- Drei Status: **Im Schrank** 🗄️ (grün), **Getragen** 🪑 (gelb/orange), **In der Wäsche** 🧺 (blau) –
  immer mit Icon und Text, nicht nur Farbe.
- Auf Karten gibt es ein **dreiteiliges Segment-Control**: ein Tipp setzt den Status direkt (mit
  Rückgängig). Das ist eindeutiger als ein Durchschalten per Tipp und überall gleich (Formular,
  Verschieben, Karten).
- **Migration:** Dexie-Schema Version 2; bestehende Daten bleiben unverändert gültig. Die alte
  Verlaufsaktion „wäsche“ wird zu „status“ (von/nach-Status bleibt erhalten). Exporte aus Version 1
  werden beim Import genauso migriert; neue Exporte haben Version 2.
- Der Navigationspunkt heißt weiterhin kurz „Wäsche“, die Seite „Wäsche & Getragen“. Massenaktionen
  wirken auf die Auswahl – ohne Auswahl auf alle Teile des Abschnitts.

### Auto-Speichern

- Gilt nur für **bestehende** Teile (Bearbeiten). Beim Neuanlegen bleiben „Hinzufügen“ und
  „Speichern & nächstes Teil“.
- Auswahlfelder, Segment-Controls und Foto speichern sofort; Textfelder 600 ms nach der letzten
  Eingabe sowie beim Verlassen des Feldes, beim Zurück-Navigieren und beim Tab-Wechsel.
- Speichervorgänge pro Teil laufen nacheinander; geschrieben wird immer der neueste Stand.
- Ist der Name leer, wird nicht gespeichert (Fehlermeldung am Feld); in der Datenbank bleibt der
  letzte gültige Stand.
- Änderungen innerhalb von **2 Minuten** werden zu **einem** „bearbeitet“-Eintrag im Verlauf
  zusammengefasst (z. B. „Geändert: Name, Farbe, Notiz“); Status- und Standortwechsel bleiben eigene
  Einträge.
- Wird der Tab geschlossen oder neu geladen, reicht die Zeit für IndexedDB evtl. nicht. Dann wird
  der offene Stand zusätzlich sofort als **Notfall-Entwurf** in `localStorage` gesichert und beim
  nächsten Start nachgetragen (Fotos werden ohnehin sofort gespeichert).

### KI-Erkennung

- Die **Farbe** wird auch dann vorgeschlagen, wenn die Art nicht sicher erkannt wurde oder das Modell
  nicht verfügbar ist – sie stammt aus der Pixelanalyse, nicht aus der KI. Ist die KI ausgeschaltet,
  läuft gar keine Erkennung.
- Ist die KI eingeschaltet, das Modell aber nicht heruntergeladen, wird **nicht** ungefragt
  heruntergeladen (mobiles Datenvolumen) – es erscheint ein Hinweis auf die Einstellungen.
- Ein neues Foto darf einen **unveränderten** KI-Vorschlag eines vorherigen Fotos ersetzen, aber
  nie eine eigene Eingabe. Werte aus einer Vorlage („Weiteres Teil dieser Gruppe“) oder aus dem
  Bearbeiten gelten als ausgefüllt; nur eine leere Farbe darf ergänzt werden.
- Die Erkennung läuft einmal pro Foto, egal welche Anzahl gespeichert wird, und auf dem bereits auf
  800 px verkleinerten Foto.
- Ein bereits heruntergeladenes Modell wird beim Öffnen des Formulars im Hintergrund in den Worker
  geladen, damit die erste Erkennung schneller ist (kein Download).

## Manueller Testplan

Die KI-Erkennung braucht echte Fotos und einen echten Browser. Vor einem Release einmal durchgehen
(am besten auf dem Handy über die veröffentlichte HTTPS-Adresse):

| # | Schritt | Erwartung |
|---|---------|-----------|
| 1 | Einstellungen → KI-Erkennung einschalten | Dialog mit „ca. 170 MB“ und WLAN-Hinweis |
| 2 | „Herunterladen“ | Fortschrittsbalken mit % und MB, App bleibt bedienbar; danach „Modell bereit“ |
| 3 | „+“ → Foto einer **hellen Jeans** | „Erkenne Kleidungsstück …“, dann Name „Helle Jeans“, Kategorie „Hosen“, Farbe „blau“, Badges „Vorschlag der KI“ |
| 4 | Foto eines **weißen T-Shirts** | „Weißes T-Shirt“, „T-Shirts“, „weiß“ |
| 5 | Foto **schwarzer Socken** | „Schwarze Socken“, „Socken“ |
| 6 | Foto eines **Pullovers** | „… Pullover“ (z. B. „Grauer Pullover“), „Pullover“ |
| 7 | Erst Namen eintippen, dann Foto | eigener Name bleibt, nur Kategorie/Farbe werden vorgeschlagen |
| 8 | Vorgeschlagenen Namen ändern | Badge verschwindet |
| 9 | Unscharfes/ungewöhnliches Foto | „Nicht sicher erkannt“ + bis zu 3 Chips; Tipp auf Chip übernimmt Name und Kategorie |
| 10 | Kategorie „Socken“ umbenennen, Socken fotografieren | Kategorie „Sonstiges“, keine neue Kategorie |
| 11 | Anzahl 3, Speichern | 3 Teile, Erkennung lief nur einmal |
| 12 | **Flugmodus** an, App neu öffnen, Foto | App startet, Erkennung funktioniert weiter (aus dem Cache) |
| 13 | Einstellungen → „Modell löschen“ | Status „nicht heruntergeladen“, Schalter aus |
| 14 | Flugmodus an, KI einschalten → Herunterladen | verständliche Fehlermeldung, kein Absturz |
| 15 | Danach Foto aufnehmen | Hinweis „KI-Erkennung … nicht verfügbar“, Farbe wird trotzdem erkannt, Speichern geht |
| 16 | Browser ohne WebGPU (z. B. Firefox) | Erkennung läuft über WebAssembly (Einstellungen zeigen „WebAssembly“) |

Weitere Kurztests: Teil bearbeiten → Name tippen → sofort „Zurück“ → Änderung ist gespeichert;
Name leeren → Fehlermeldung, alter Name bleibt; Verlauf zeigt eine zusammengefasste „Bearbeitet“-Zeile.

## Projektstruktur

```
src/
  components/   UI-Bausteine (Karten, Dialoge, Navigation, Diagramme …)
  pages/        ein Screen pro Datei
  db/           Dexie-Datenbank, Repository (schreibende Aktionen), Beispieldaten
  hooks/        Live-Queries, Object-URLs, Mehrfachauswahl, Farbschema, Auto-Speichern, KI
  ki/           Web Worker für die KI-Erkennung + Hauptthread-Dienst
  lib/          reine Funktionen + Vitest-Tests
  types/        Datentypen
```

Weitere Konventionen stehen in [CLAUDE.md](CLAUDE.md).
