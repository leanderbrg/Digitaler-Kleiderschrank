import { describe, expect, it } from 'vitest';
import {
  aussortiereTeile,
  bearbeiteTeil,
  erzeugeTeile,
  setzeStatus,
  stelleWiederHer,
  verschiebeTeile,
  type Kontext,
} from './aktionen';
import { idFolge, teil } from './testdaten';

const k = (): Kontext => ({ jetzt: 5000, id: idFolge('x') });

describe('erzeugeTeile', () => {
  it('erzeugt N einzelne Teile mit gleichen Daten und je einem Verlaufseintrag', () => {
    const foto = new Blob(['bild']);
    const a = erzeugeTeile(
      { name: ' Socke ', kategorieId: 'socken', standortId: 'standort-1', status: 'schrank', zustand: 'gut', farbe: ' ', foto },
      3,
      k(),
    );
    expect(a.teile).toHaveLength(3);
    expect(new Set(a.teile.map((t) => t.id)).size).toBe(3);
    expect(a.teile.every((t) => t.name === 'Socke' && t.foto === foto && !t.aussortiert)).toBe(true);
    expect(a.teile[0].farbe).toBeUndefined();
    expect(a.verlauf.map((v) => v.aktion)).toEqual(['hinzugefügt', 'hinzugefügt', 'hinzugefügt']);
    expect(a.verlauf[0].teilId).toBe(a.teile[0].id);
  });
});

describe('bearbeiteTeil', () => {
  it('protokolliert Standort-, Status- und Feldänderungen getrennt', () => {
    const alt = teil({ farbe: 'blau' });
    const a = bearbeiteTeil(alt, { standortId: 'standort-2', status: 'waesche', farbe: 'rot', name: alt.name }, k());
    expect(a.teile[0]).toMatchObject({ standortId: 'standort-2', status: 'waesche', farbe: 'rot', geaendertAm: 5000 });
    expect(a.verlauf.map((v) => v.aktion)).toEqual(['verschoben', 'status', 'bearbeitet']);
    expect(a.verlauf[0].details).toEqual({ vonStandortId: 'standort-1', nachStandortId: 'standort-2' });
    expect(a.verlauf[2].details?.text).toBe('Farbe');
  });
  it('liefert nichts, wenn sich nichts ändert', () => {
    const alt = teil({ farbe: 'blau' });
    expect(bearbeiteTeil(alt, { farbe: 'blau ', name: alt.name }, k())).toEqual({ teile: [], verlauf: [] });
  });
  it('ändert das Original nicht', () => {
    const alt = teil();
    bearbeiteTeil(alt, { name: 'Neu' }, k());
    expect(alt.name).toBe('T-Shirt');
  });
});

describe('verschiebeTeile', () => {
  it('verschiebt nur Teile, die nicht schon am Ziel sind, und setzt optional den Status', () => {
    const teile = [teil({ id: 'a' }), teil({ id: 'b', standortId: 'standort-2' }), teil({ id: 'c', aussortiert: true })];
    const a = verschiebeTeile(teile, 'standort-2', undefined, k());
    expect(a.teile.map((t) => t.id)).toEqual(['a']);
    expect(a.verlauf.map((v) => v.aktion)).toEqual(['verschoben']);

    const b = verschiebeTeile(teile, 'standort-2', 'waesche', k());
    expect(b.teile.map((t) => [t.id, t.standortId, t.status])).toEqual([
      ['a', 'standort-2', 'waesche'],
      ['b', 'standort-2', 'waesche'],
    ]);
    expect(b.verlauf.map((v) => v.aktion)).toEqual(['verschoben', 'status', 'status']);

    const c = verschiebeTeile([teil({ id: 'd' })], 'standort-2', 'getragen', k());
    expect(c.teile[0]).toMatchObject({ standortId: 'standort-2', status: 'getragen' });
    expect(c.verlauf[1].details).toEqual({ vonStatus: 'schrank', nachStatus: 'getragen' });
  });
});

describe('setzeStatus', () => {
  it('ändert nur Teile mit anderem Status', () => {
    const a = setzeStatus([teil({ id: 'a', status: 'waesche' }), teil({ id: 'b' })], 'schrank', k());
    expect(a.teile.map((t) => [t.id, t.status])).toEqual([['a', 'schrank']]);
    expect(a.verlauf[0].details).toEqual({ vonStatus: 'waesche', nachStatus: 'schrank' });
  });
});

describe('aussortiereTeile / stelleWiederHer', () => {
  it('setzt Soft-Delete-Felder mit Grund und kann sie zurücknehmen', () => {
    const a = aussortiereTeile([teil({ id: 'a' }), teil({ id: 'b', aussortiert: true })], 'Loch', k());
    expect(a.teile).toHaveLength(1);
    expect(a.teile[0]).toMatchObject({ aussortiert: true, aussortiertAm: 5000, aussortierGrund: 'Loch' });
    expect(a.verlauf[0]).toMatchObject({ aktion: 'aussortiert', details: { grund: 'Loch' } });

    const w = stelleWiederHer(a.teile, k());
    expect(w.teile[0].aussortiert).toBe(false);
    expect(w.teile[0].aussortierGrund).toBeUndefined();
    expect(w.verlauf[0].aktion).toBe('wiederhergestellt');
  });
});
