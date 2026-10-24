import { describe, expect, it } from 'vitest';
import { base64ZuBlob, blobZuBase64, erstelleExport, exportFaellig, pruefeImport } from './export';
import { teil } from './testdaten';

describe('Base64-Konvertierung', () => {
  it('ist verlustfrei', async () => {
    const bytes = new Uint8Array(70000).map((_, i) => i % 256);
    const blob = new Blob([bytes], { type: 'image/jpeg' });
    const url = await blobZuBase64(blob);
    expect(url.startsWith('data:image/jpeg;base64,')).toBe(true);
    const zurueck = base64ZuBlob(url);
    expect(zurueck.type).toBe('image/jpeg');
    expect(new Uint8Array(await zurueck.arrayBuffer())).toEqual(bytes);
  });
});

describe('Export/Import', () => {
  const daten = {
    standorte: [{ id: 'standort-1', name: 'Zuhause', reihenfolge: 1 }],
    kategorien: [{ id: 'tshirts', name: 'T-Shirts', emoji: '👕', reihenfolge: 1 }],
    teile: [teil({ id: 'a', foto: new Blob(['foto'], { type: 'image/jpeg' }) }), teil({ id: 'b', aussortiert: true })],
    verlauf: [{ id: 'v1', datum: 1, teilId: 'a', teilName: 'T-Shirt', kategorieId: 'tshirts', aktion: 'hinzugefügt' as const }],
  };

  it('übersteht eine Runde durch JSON', async () => {
    const exp = await erstelleExport(daten, new Date('2026-01-01T00:00:00Z'));
    expect(typeof exp.teile[0].foto).toBe('string');
    const ergebnis = pruefeImport(JSON.parse(JSON.stringify(exp)));
    expect(ergebnis.ok).toBe(true);
    if (!ergebnis.ok) return;
    expect(ergebnis.daten.standorte).toEqual(daten.standorte);
    expect(ergebnis.daten.teile).toHaveLength(2);
    expect(await ergebnis.daten.teile[0].foto!.text()).toBe('foto');
    expect(ergebnis.daten.teile[0].thumb).toBeDefined(); // Fallback: Foto als Vorschaubild
    expect(ergebnis.daten.teile[1].aussortiert).toBe(true);
    expect(ergebnis.daten.verlauf).toEqual(daten.verlauf);
  });

  it.each([
    [null, 'keine Exportdatei'],
    [{ format: 'anders' }, 'keine Exportdatei'],
    [{ format: 'kleiderschrank-export', version: 99 }, 'neueren'],
    [{ format: 'kleiderschrank-export', version: 1, teile: [] }, 'unvollständig'],
    [{ format: 'kleiderschrank-export', version: 1, standorte: [], kategorien: [], teile: [{ id: 1 }], verlauf: [] }, 'Kleidungsstücke'],
  ])('lehnt ungültige Dateien ab (%#)', (json, text) => {
    const e = pruefeImport(json);
    expect(e.ok).toBe(false);
    if (!e.ok) expect(e.fehler).toContain(text);
  });
});

describe('exportFaellig', () => {
  const tag = 86400000;
  it('erinnert ohne Export oder nach mehr als 30 Tagen', () => {
    expect(exportFaellig(undefined, 100 * tag)).toBe(true);
    expect(exportFaellig(60 * tag, 100 * tag)).toBe(true);
    expect(exportFaellig(80 * tag, 100 * tag)).toBe(false);
  });
});
