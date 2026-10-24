import { describe, expect, it } from 'vitest';
import { istGueltig, validiereTeil } from './validierung';

const basis = { name: 'Jeans', kategorieId: 'hosen', standortId: 'standort-1', anzahl: 1 };

describe('validiereTeil', () => {
  it('akzeptiert gültige Eingaben', () => {
    expect(istGueltig(validiereTeil(basis))).toBe(true);
    expect(istGueltig(validiereTeil({ ...basis, anzahl: '50' }))).toBe(true);
  });
  it('verlangt einen Namen', () => {
    expect(validiereTeil({ ...basis, name: '   ' }).name).toBeDefined();
  });
  it('verlangt Kategorie und Standort', () => {
    const f = validiereTeil({ ...basis, kategorieId: '', standortId: '' });
    expect(f.kategorieId).toBeDefined();
    expect(f.standortId).toBeDefined();
  });
  it.each([0, 51, 2.5, '', 'abc', -1])('lehnt Anzahl %s ab', (anzahl) => {
    expect(validiereTeil({ ...basis, anzahl }).anzahl).toBeDefined();
  });
  it('ignoriert Anzahl beim Bearbeiten', () => {
    expect(istGueltig(validiereTeil({ ...basis, anzahl: 0 }, false))).toBe(true);
  });
});
