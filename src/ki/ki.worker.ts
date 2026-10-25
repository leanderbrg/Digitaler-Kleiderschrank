/// <reference lib="webworker" />
/**
 * Web Worker für die lokale Kleidungserkennung (Zero-Shot mit Marqo-FashionCLIP).
 * Läuft komplett im Browser; Modelldateien werden einmalig von Hugging Face geladen und
 * von Transformers.js im Cache "transformers-cache" abgelegt (danach offline nutzbar).
 */
import {
  AutoProcessor,
  AutoTokenizer,
  CLIPTextModelWithProjection,
  CLIPVisionModelWithProjection,
  env,
  RawImage,
  type PreTrainedModel,
  type PreTrainedTokenizer,
  type Processor,
  type Tensor,
} from '@huggingface/transformers';
import { softmax } from '../lib/erkennung';
import { MODELL_ID, type AnWorker, type Geraet, type VomWorker } from './protokoll';

declare const self: DedicatedWorkerGlobalScope;

env.allowLocalModels = false;
env.useBrowserCache = true;
// WASM-Laufzeit aus der eigenen App statt vom CDN (siehe Plugin "ki-laufzeit" in vite.config.ts)
if (env.backends.onnx.wasm) {
  env.backends.onnx.wasm.wasmPaths = new URL(`${import.meta.env.BASE_URL}ki/`, self.location.origin).href;
}

interface Modelle {
  geraet: Geraet;
  tokenizer: PreTrainedTokenizer;
  textModell: PreTrainedModel;
  processor: Processor;
  bildModell: PreTrainedModel;
}

let laden: Promise<Modelle> | null = null;
/** Text-Embeddings je Prompt – einmal pro Sitzung berechnet */
const textCache = new Map<string, number[]>();

const senden = (n: VomWorker) => self.postMessage(n);

async function webgpuMoeglich(): Promise<boolean> {
  try {
    const gpu = (navigator as Navigator & { gpu?: { requestAdapter(): Promise<{ features: Set<string> } | null> } }).gpu;
    const adapter = await gpu?.requestAdapter();
    // q4f16-Modelle brauchen Halbgenauigkeit im Shader
    return !!adapter?.features.has('shader-f16');
  } catch {
    return false;
  }
}

/** Fortschritt über alle Dateien zusammenfassen */
function fortschrittMelder() {
  const dateien = new Map<string, { geladen: number; gesamt: number }>();
  let zuletzt = 0;
  return (p: { status: string; file?: string; loaded?: number; total?: number }) => {
    if (p.status !== 'progress' || !p.file || !p.total) return;
    dateien.set(p.file, { geladen: p.loaded ?? 0, gesamt: p.total });
    const jetzt = Date.now();
    if (jetzt - zuletzt < 150) return;
    zuletzt = jetzt;
    let geladen = 0;
    let gesamt = 0;
    for (const d of dateien.values()) {
      geladen += d.geladen;
      gesamt += d.gesamt;
    }
    senden({
      typ: 'fortschritt',
      prozent: gesamt ? Math.round((geladen / gesamt) * 100) : 0,
      geladenMB: Math.round(geladen / 1e6),
      gesamtMB: Math.round(gesamt / 1e6),
    });
  };
}

async function ladeModelle(geraet: Geraet): Promise<Modelle> {
  const progress_callback = fortschrittMelder();
  const optionen = { device: geraet, dtype: geraet === 'webgpu' ? 'q4f16' : 'q8', progress_callback } as const;
  const [tokenizer, textModell, processor, bildModell] = await Promise.all([
    AutoTokenizer.from_pretrained(MODELL_ID, { progress_callback }),
    CLIPTextModelWithProjection.from_pretrained(MODELL_ID, optionen),
    AutoProcessor.from_pretrained(MODELL_ID, { progress_callback }),
    CLIPVisionModelWithProjection.from_pretrained(MODELL_ID, optionen),
  ]);
  return { geraet, tokenizer, textModell, processor, bildModell };
}

function ensureGeladen(): Promise<Modelle> {
  laden ??= (async () => {
    if (await webgpuMoeglich()) {
      try {
        return await ladeModelle('webgpu');
      } catch (e) {
        console.warn('WebGPU nicht nutzbar, weiter mit WASM', e);
      }
    }
    return ladeModelle('wasm');
  })();
  laden.then(
    (m) => senden({ typ: 'bereit', geraet: m.geraet }),
    (e) => {
      laden = null; // erneuter Versuch möglich (z. B. wieder online)
      senden({ typ: 'ladefehler', meldung: String((e as Error)?.message ?? e) });
    },
  );
  return laden;
}

const normalisiert = (t: Tensor) => (t.normalize(2, -1).tolist() as number[][]);
const skalar = (a: number[], b: number[]) => a.reduce((s, x, i) => s + x * b[i], 0);

async function erkenne(bild: Blob, prompts: { id: string; prompt: string }[]) {
  const m = await ensureGeladen();
  const fehlend = prompts.filter((p) => !textCache.has(p.prompt));
  if (fehlend.length) {
    const eingaben = m.tokenizer(
      fehlend.map((p) => p.prompt),
      { padding: 'max_length', truncation: true },
    );
    const { text_embeds } = await m.textModell(eingaben);
    normalisiert(text_embeds).forEach((v, i) => textCache.set(fehlend[i].prompt, v));
  }
  const bildDaten = await RawImage.fromBlob(bild);
  const { image_embeds } = await m.bildModell(await m.processor(bildDaten));
  const v = normalisiert(image_embeds)[0];
  // Wie im Modell-Beispiel: Kosinus-Ähnlichkeit × 100, dann Softmax
  const wahrscheinlichkeiten = softmax(prompts.map((p) => 100 * skalar(v, textCache.get(p.prompt)!)));
  return prompts.map((p, i) => ({ id: p.id, wert: wahrscheinlichkeiten[i] }));
}

self.onmessage = async (e: MessageEvent<AnWorker>) => {
  const n = e.data;
  if (n.typ === 'laden') {
    ensureGeladen().catch(() => {
      /* bereits als "ladefehler" gemeldet */
    });
    return;
  }
  try {
    senden({ typ: 'ergebnis', id: n.id, wertungen: await erkenne(n.bild, n.prompts) });
  } catch (err) {
    senden({ typ: 'fehler', id: n.id, meldung: String((err as Error)?.message ?? err) });
  }
};
