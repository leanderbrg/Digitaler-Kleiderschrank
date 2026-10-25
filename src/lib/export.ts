import type { Kategorie, Standort, Teil, Verlaufseintrag } from '../types';
import { normalisiereTeil, normalisiereVerlauf } from './migration';

export const EXPORT_FORMAT = 'kleiderschrank-export';
/** Version 2: Status "getragen", Verlaufsaktion "status". Version-1-Dateien werden beim Import migriert. */
export const EXPORT_VERSION = 2;

type TeilExport = Omit<Teil, 'foto' | 'thumb'> & { foto?: string; thumb?: string };

export interface ExportDatei {
  format: typeof EXPORT_FORMAT;
  version: number;
  exportiertAm: string;
  standorte: Standort[];
  kategorien: Kategorie[];
  teile: TeilExport[];
  verlauf: Verlaufseintrag[];
}

export interface Datenbestand {
  standorte: Standort[];
  kategorien: Kategorie[];
  teile: Teil[];
  verlauf: Verlaufseintrag[];
}

/** Blob → Data-URL (base64). Funktioniert im Browser und in Node (Tests). */
export async function blobZuBase64(blob: Blob): Promise<string> {
  const bytes = new Uint8Array(await blob.arrayBuffer());
  let binaer = '';
  const BLOCK = 0x8000;
  for (let i = 0; i < bytes.length; i += BLOCK) {
    binaer += String.fromCharCode(...bytes.subarray(i, i + BLOCK));
  }
  return `data:${blob.type || 'application/octet-stream'};base64,${btoa(binaer)}`;
}

/** Data-URL (base64) → Blob */
export function base64ZuBlob(dataUrl: string): Blob {
  const treffer = /^data:([^;,]*)(;base64)?,(.*)$/s.exec(dataUrl);
  if (!treffer || !treffer[2]) throw new Error('Ungültiges Bildformat');
  const binaer = atob(treffer[3]);
  const bytes = new Uint8Array(binaer.length);
  for (let i = 0; i < binaer.length; i++) bytes[i] = binaer.charCodeAt(i);
  return new Blob([bytes], { type: treffer[1] || 'application/octet-stream' });
}

export async function erstelleExport(d: Datenbestand, jetzt = new Date()): Promise<ExportDatei> {
  const teile: TeilExport[] = [];
  for (const t of d.teile) {
    const { foto, thumb, ...rest } = t;
    teile.push({
      ...rest,
      ...(foto ? { foto: await blobZuBase64(foto) } : {}),
      ...(thumb ? { thumb: await blobZuBase64(thumb) } : {}),
    });
  }
  return {
    format: EXPORT_FORMAT,
    version: EXPORT_VERSION,
    exportiertAm: jetzt.toISOString(),
    standorte: d.standorte,
    kategorien: d.kategorien,
    teile,
    verlauf: d.verlauf,
  };
}

export type ImportErgebnis = { ok: true; daten: Datenbestand } | { ok: false; fehler: string };

const istObjekt = (x: unknown): x is Record<string, unknown> => typeof x === 'object' && x !== null && !Array.isArray(x);
const istString = (x: unknown): x is string => typeof x === 'string';

/** Prüft eine eingelesene Exportdatei und wandelt Fotos zurück in Blobs. */
export function pruefeImport(json: unknown): ImportErgebnis {
  if (!istObjekt(json) || json.format !== EXPORT_FORMAT) {
    return { ok: false, fehler: 'Das ist keine Exportdatei dieser App.' };
  }
  if (typeof json.version !== 'number' || json.version > EXPORT_VERSION) {
    return { ok: false, fehler: 'Die Datei stammt aus einer neueren App-Version.' };
  }
  const { standorte, kategorien, teile, verlauf } = json;
  if (![standorte, kategorien, teile, verlauf].every(Array.isArray)) {
    return { ok: false, fehler: 'Die Datei ist unvollständig.' };
  }
  const s = standorte as unknown[];
  const k = kategorien as unknown[];
  const t = teile as unknown[];
  const v = verlauf as unknown[];
  if (!s.every((x) => istObjekt(x) && istString(x.id) && istString(x.name))) {
    return { ok: false, fehler: 'Ungültige Standorte in der Datei.' };
  }
  if (!k.every((x) => istObjekt(x) && istString(x.id) && istString(x.name))) {
    return { ok: false, fehler: 'Ungültige Kategorien in der Datei.' };
  }
  if (!t.every((x) => istObjekt(x) && istString(x.id) && istString(x.name) && istString(x.kategorieId) && istString(x.standortId))) {
    return { ok: false, fehler: 'Ungültige Kleidungsstücke in der Datei.' };
  }
  if (!v.every((x) => istObjekt(x) && istString(x.id) && typeof x.datum === 'number')) {
    return { ok: false, fehler: 'Ungültige Verlaufseinträge in der Datei.' };
  }
  try {
    const teileMitBlobs: Teil[] = (t as TeilExport[]).map((x) => {
      const { foto, thumb, ...rest } = x;
      return {
        ...normalisiereTeil(rest),
        ...(foto ? { foto: base64ZuBlob(foto) } : {}),
        ...(thumb ? { thumb: base64ZuBlob(thumb) } : foto ? { thumb: base64ZuBlob(foto) } : {}),
      };
    });
    return {
      ok: true,
      daten: {
        standorte: s as Standort[],
        kategorien: (k as Kategorie[]).map((x, i) => ({ ...x, emoji: x.emoji ?? '📦', reihenfolge: x.reihenfolge ?? i + 1 })),
        teile: teileMitBlobs,
        verlauf: (v as Verlaufseintrag[]).map(normalisiereVerlauf),
      },
    };
  } catch {
    return { ok: false, fehler: 'Ein Foto in der Datei ist beschädigt.' };
  }
}

/** true, wenn der letzte Export fehlt oder älter als `tage` Tage ist. */
export function exportFaellig(letzterExport: number | undefined, jetzt: number, tage = 30): boolean {
  return !letzterExport || jetzt - letzterExport > tage * 24 * 60 * 60 * 1000;
}
