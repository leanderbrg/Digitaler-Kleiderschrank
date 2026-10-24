import { aussortiereTeile, erzeugeTeile, type Aenderung } from '../lib/aktionen';
import { neueId } from '../lib/id';
import type { Status } from '../types';
import { db } from './db';

const FARBEN: Record<string, string> = {
  blau: '#3b82f6',
  dunkelblau: '#1e3a8a',
  schwarz: '#1f2937',
  weiß: '#e5e7eb',
  grau: '#9ca3af',
  rot: '#dc2626',
  grün: '#15803d',
  beige: '#d6c7a1',
};

/** Erzeugt ein einfaches Beispielfoto (Farbfläche + Emoji) per Canvas. */
async function beispielFoto(emoji: string, farbe: string): Promise<{ foto: Blob; thumb: Blob }> {
  const mache = (groesse: number) => {
    const c = document.createElement('canvas');
    c.width = c.height = groesse;
    const ctx = c.getContext('2d')!;
    const g = ctx.createLinearGradient(0, 0, groesse, groesse);
    g.addColorStop(0, FARBEN[farbe] ?? '#94a3b8');
    g.addColorStop(1, '#ffffff');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, groesse, groesse);
    ctx.font = `${groesse * 0.5}px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(emoji, groesse / 2, groesse / 2 + groesse * 0.04);
    return new Promise<Blob>((r) => c.toBlob((b) => r(b!), 'image/jpeg', 0.8));
  };
  const [foto, thumb] = await Promise.all([mache(480), mache(200)]);
  return { foto, thumb };
}

type Vorlage = [name: string, kategorieId: string, farbe: string, emoji: string, verteilung: [s1: number, s2: number, waesche: number], groesse?: string];

const VORLAGEN: Vorlage[] = [
  ['Jeans Slim', 'hosen', 'blau', '👖', [2, 1, 1], '32/32'],
  ['Chino', 'hosen', 'beige', '👖', [1, 1, 0], '32/32'],
  ['Sneaker-Socken', 'socken', 'weiß', '🧦', [5, 3, 2], '43–46'],
  ['Wollsocken', 'socken', 'grau', '🧦', [2, 0, 0], '43–46'],
  ['Boxershorts', 'unterhosen', 'schwarz', '🩲', [4, 3, 2], 'L'],
  ['Basic Shirt', 'tshirts', 'weiß', '👕', [3, 2, 1], 'L'],
  ['Basic Shirt', 'tshirts', 'schwarz', '👕', [2, 1, 0], 'L'],
  ['Oxford-Hemd', 'hemden', 'blau', '👔', [2, 0, 1], '41'],
  ['Strickpullover', 'pullover', 'dunkelblau', '🧶', [1, 1, 0], 'L'],
  ['Regenjacke', 'jacken', 'grün', '🧥', [0, 1, 0], 'L'],
  ['Laufschuhe', 'schuhe', 'rot', '👟', [1, 0, 0], '44'],
];

/** Lädt Beispieldaten (markiert mit `beispiel: true`), inkl. einiger aussortierter Teile für die Statistik. */
export async function beispieldatenLaden(): Promise<number> {
  const standorte = await db.standorte.orderBy('reihenfolge').toArray();
  const kategorien = new Set((await db.kategorien.toArray()).map((k) => k.id));
  const [s1, s2] = [standorte[0]?.id, standorte[1]?.id ?? standorte[0]?.id];
  if (!s1) return 0;

  const gesamt: Aenderung = { teile: [], verlauf: [] };
  const sammle = (a: Aenderung) => {
    gesamt.teile.push(...a.teile);
    gesamt.verlauf.push(...a.verlauf);
  };
  const tag = 24 * 60 * 60 * 1000;
  const jetzt = Date.now();

  for (const [name, kat, farbe, emoji, [n1, n2, w], groesse] of VORLAGEN) {
    const kategorieId = kategorien.has(kat) ? kat : 'sonstiges';
    const bild = await beispielFoto(emoji, farbe);
    const basis = { name, kategorieId, farbe, groesse, zustand: 'gut' as const, beispiel: true, ...bild };
    const k = { jetzt: jetzt - 40 * tag, id: neueId };
    const mitStatus = (standortId: string, anzahl: number, waesche: number) => {
      if (anzahl <= 0) return;
      const im = (status: Status, n: number) => n > 0 && sammle(erzeugeTeile({ ...basis, standortId, status }, n, k));
      im('waesche', Math.min(waesche, anzahl));
      im('schrank', anzahl - Math.min(waesche, anzahl));
    };
    mitStatus(s1, n1, w);
    mitStatus(s2, n2, 0);
  }

  // Aussortierte Teile in den letzten Monaten
  const alt: [string, string, string, string, number, string][] = [
    ['Sneaker-Socken', 'socken', 'weiß', '🧦', 20, 'Loch'],
    ['Sneaker-Socken', 'socken', 'weiß', '🧦', 50, 'Loch'],
    ['Basic Shirt', 'tshirts', 'weiß', '👕', 80, 'verschlissen'],
    ['Jeans Slim', 'hosen', 'blau', '👖', 110, 'zu klein'],
    ['Wollsocken', 'socken', 'grau', '🧦', 140, 'Loch'],
    ['Strickpullover', 'pullover', 'dunkelblau', '🧶', 200, 'verschenkt'],
  ];
  for (const [name, kat, farbe, emoji, vorTagen, grund] of alt) {
    const bild = await beispielFoto(emoji, farbe);
    const e = erzeugeTeile(
      { name, kategorieId: kategorien.has(kat) ? kat : 'sonstiges', farbe, zustand: 'abgetragen', standortId: s1, status: 'schrank', beispiel: true, ...bild },
      1,
      { jetzt: jetzt - (vorTagen + 300) * tag, id: neueId },
    );
    sammle(e);
    const a = aussortiereTeile(e.teile, grund, { jetzt: jetzt - vorTagen * tag, id: neueId });
    gesamt.teile = gesamt.teile.map((t) => a.teile.find((x) => x.id === t.id) ?? t);
    gesamt.verlauf.push(...a.verlauf);
  }

  await db.transaction('rw', db.teile, db.verlauf, async () => {
    await db.teile.bulkAdd(gesamt.teile);
    await db.verlauf.bulkAdd(gesamt.verlauf);
  });
  return gesamt.teile.length;
}

/** Entfernt alle Beispielteile samt ihren Verlaufseinträgen. */
export async function beispieldatenEntfernen(): Promise<number> {
  return db.transaction('rw', db.teile, db.verlauf, async () => {
    const ids = (await db.teile.filter((t) => !!t.beispiel).primaryKeys()) as string[];
    await db.teile.bulkDelete(ids);
    await db.verlauf.where('teilId').anyOf(ids).delete();
    return ids.length;
  });
}
