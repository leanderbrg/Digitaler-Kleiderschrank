import type { TypWertung } from '../lib/erkennung';

/** Modell und Laufzeit – siehe README ("Modellwahl") */
export const MODELL_ID = 'Marqo/marqo-fashionCLIP';
/**
 * Ungefähre Download-Größe: quantisierter Text- + Bild-Encoder (WebGPU q4f16 ≈ 139 MB,
 * WASM q8 ≈ 152 MB), Tokenizer/Konfiguration und WASM-Laufzeit (≈ 21 MB)
 */
export const DOWNLOAD_MB = 170;
/** Name des Caches, in dem Transformers.js die Modelldateien ablegt */
export const MODELL_CACHE = 'transformers-cache';
/** Workbox-Runtime-Cache für Worker-Skript und WASM-Laufzeit (siehe vite.config.ts) */
export const LAUFZEIT_CACHE = 'ki-laufzeit';

export type Geraet = 'webgpu' | 'wasm';

/** Nachrichten Hauptthread → Worker */
export type AnWorker =
  | { typ: 'laden' }
  | { typ: 'erkennen'; id: number; bild: Blob; prompts: { id: string; prompt: string }[] };

/** Nachrichten Worker → Hauptthread */
export type VomWorker =
  | { typ: 'fortschritt'; prozent: number; geladenMB: number; gesamtMB: number }
  | { typ: 'bereit'; geraet: Geraet }
  | { typ: 'ladefehler'; meldung: string }
  | { typ: 'ergebnis'; id: number; wertungen: TypWertung[] }
  | { typ: 'fehler'; id: number; meldung: string };
