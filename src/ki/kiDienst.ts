import type { TypWertung } from '../lib/erkennung';
import { KLEIDUNGSTYPEN } from '../lib/kleidungstypen';
import { LAUFZEIT_CACHE, MODELL_CACHE, MODELL_ID, type AnWorker, type Geraet, type VomWorker } from './protokoll';

export type KiPhase = 'unbekannt' | 'nicht-geladen' | 'gecacht' | 'laedt' | 'bereit' | 'fehler';

export interface KiZustand {
  phase: KiPhase;
  prozent?: number;
  geladenMB?: number;
  gesamtMB?: number;
  geraet?: Geraet;
  meldung?: string;
}

/**
 * Hauptthread-Seite der KI-Erkennung (Singleton). Der Worker – und damit Transformers.js,
 * WASM-Laufzeit und Modell – wird erst beim ersten Bedarf gestartet, nie beim App-Start.
 */
let zustand: KiZustand = { phase: 'unbekannt' };
const hoerer = new Set<() => void>();
let worker: Worker | null = null;
let naechsteId = 1;
const offen = new Map<number, { resolve: (w: TypWertung[]) => void; reject: (e: Error) => void }>();

function setze(z: KiZustand) {
  zustand = z;
  hoerer.forEach((h) => h());
}

export function kiZustand(): KiZustand {
  return zustand;
}

export function kiAbonnieren(h: () => void): () => void {
  hoerer.add(h);
  return () => hoerer.delete(h);
}

/** Verständliche Meldung statt technischer Fehlertexte */
export function freundlicheMeldung(roh: string): string {
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    return 'Offline – das Modell kann erst mit Internetverbindung heruntergeladen werden.';
  }
  if (/memory|allocation|out of/i.test(roh)) return 'Zu wenig Arbeitsspeicher für die KI-Erkennung auf diesem Gerät.';
  if (/quota/i.test(roh)) return 'Nicht genug Speicherplatz im Browser für das Modell.';
  return 'Die KI-Erkennung konnte nicht geladen werden.';
}

export function kiUnterstuetzt(): boolean {
  return typeof Worker !== 'undefined' && typeof WebAssembly !== 'undefined' && typeof caches !== 'undefined';
}

/** Prüft, ob die Modelldateien bereits im Cache liegen (ohne etwas zu laden). */
export async function kiCachePruefen(): Promise<void> {
  if (zustand.phase === 'laedt' || zustand.phase === 'bereit') return;
  if (!kiUnterstuetzt()) {
    setze({ phase: 'fehler', meldung: 'Dieser Browser unterstützt die lokale KI-Erkennung nicht.' });
    return;
  }
  try {
    const cache = await caches.open(MODELL_CACHE);
    const dateien = (await cache.keys()).map((r) => r.url).filter((u) => u.includes(MODELL_ID));
    const vollstaendig = dateien.some((u) => u.includes('vision_model')) && dateien.some((u) => u.includes('text_model'));
    // Während des await kann ein Ladevorgang gestartet worden sein
    const aktuell = kiZustand().phase;
    if (aktuell === 'laedt' || aktuell === 'bereit') return;
    setze({ phase: vollstaendig ? 'gecacht' : 'nicht-geladen' });
  } catch {
    setze({ phase: 'nicht-geladen' });
  }
}

function beiNachricht(e: MessageEvent<VomWorker>) {
  const n = e.data;
  switch (n.typ) {
    case 'fortschritt':
      if (zustand.phase !== 'bereit') setze({ phase: 'laedt', prozent: n.prozent, geladenMB: n.geladenMB, gesamtMB: n.gesamtMB });
      break;
    case 'bereit':
      setze({ phase: 'bereit', geraet: n.geraet });
      break;
    case 'ladefehler':
      setze({ phase: 'fehler', meldung: freundlicheMeldung(n.meldung) });
      offen.forEach((p) => p.reject(new Error(n.meldung)));
      offen.clear();
      break;
    case 'ergebnis':
      offen.get(n.id)?.resolve(n.wertungen);
      offen.delete(n.id);
      break;
    case 'fehler':
      offen.get(n.id)?.reject(new Error(n.meldung));
      offen.delete(n.id);
      break;
  }
}

function holeWorker(): Worker {
  if (!worker) {
    worker = new Worker(new URL('./ki.worker.ts', import.meta.url), { type: 'module' });
    worker.onmessage = beiNachricht;
    worker.onerror = (e) => {
      const text = e.message || 'KI-Worker konnte nicht gestartet werden';
      setze({ phase: 'fehler', meldung: freundlicheMeldung(text) });
      offen.forEach((p) => p.reject(new Error(text)));
      offen.clear();
      worker?.terminate();
      worker = null;
    };
  }
  return worker;
}

const senden = (n: AnWorker) => holeWorker().postMessage(n);

/** Modell laden (beim ersten Mal: herunterladen, danach aus dem Cache). */
export function kiLaden(): void {
  if (!kiUnterstuetzt()) {
    setze({ phase: 'fehler', meldung: 'Dieser Browser unterstützt die lokale KI-Erkennung nicht.' });
    return;
  }
  if (zustand.phase === 'bereit' || zustand.phase === 'laedt') return;
  setze({ phase: 'laedt', prozent: 0 });
  senden({ typ: 'laden' });
}

/** Klassifiziert ein (bereits verkleinertes) Foto. Lädt das Modell bei Bedarf. */
export function kiKlassifizieren(bild: Blob): Promise<TypWertung[]> {
  if (!kiUnterstuetzt()) return Promise.reject(new Error('nicht unterstützt'));
  if (zustand.phase !== 'bereit') kiLaden();
  const id = naechsteId++;
  return new Promise((resolve, reject) => {
    offen.set(id, { resolve, reject });
    senden({ typ: 'erkennen', id, bild, prompts: KLEIDUNGSTYPEN.map((t) => ({ id: t.id, prompt: t.prompt })) });
  });
}

/** Modell und Laufzeit aus dem Browser-Speicher entfernen. */
export async function kiLoeschen(): Promise<void> {
  worker?.terminate();
  worker = null;
  offen.forEach((p) => p.reject(new Error('abgebrochen')));
  offen.clear();
  await Promise.all([caches.delete(MODELL_CACHE), caches.delete(LAUFZEIT_CACHE)]).catch(() => {});
  setze({ phase: 'nicht-geladen' });
}
