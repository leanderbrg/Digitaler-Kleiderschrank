import { describe, expect, it } from 'vitest';
import { filterTeile } from './filter';
import { teil } from './testdaten';

const teile = [
  teil({ id: 'a', name: 'Jeans', kategorieId: 'hosen', farbe: 'blau', groesse: '32/32' }),
  teil({ id: 'b', name: 'Chino', kategorieId: 'hosen', standortId: 'standort-2', status: 'waesche' }),
  teil({ id: 'c', name: 'Basic Shirt', kategorieId: 'tshirts', farbe: 'weiß', notiz: 'Lieblingsteil' }),
  teil({ id: 'd', name: 'Alt', kategorieId: 'tshirts', aussortiert: true }),
];
const ids = (ts: { id: string }[]) => ts.map((t) => t.id);

describe('filterTeile', () => {
  it('blendet aussortierte Teile immer aus', () => {
    expect(ids(filterTeile(teile, {}))).toEqual(['a', 'b', 'c']);
  });
  it('filtert nach Standort, Kategorie und Status kombiniert', () => {
    expect(ids(filterTeile(teile, { kategorieId: 'hosen' }))).toEqual(['a', 'b']);
    expect(ids(filterTeile(teile, { standortId: 'standort-2' }))).toEqual(['b']);
    expect(ids(filterTeile(teile, { status: 'schrank', kategorieId: 'hosen' }))).toEqual(['a']);
  });
  it('sucht in Name, Farbe, Größe, Notiz und Kategoriename', () => {
    expect(ids(filterTeile(teile, { suche: 'BLAU' }))).toEqual(['a']);
    expect(ids(filterTeile(teile, { suche: '32/32' }))).toEqual(['a']);
    expect(ids(filterTeile(teile, { suche: 'liebling' }))).toEqual(['c']);
    expect(ids(filterTeile(teile, { suche: 'hose' }, (id) => (id === 'hosen' ? 'Hosen' : '')))).toEqual(['a', 'b']);
    expect(ids(filterTeile(teile, { suche: 'shirt weiß' }))).toEqual(['c']);
    expect(ids(filterTeile(teile, { suche: 'shirt blau' }))).toEqual([]);
  });
});
