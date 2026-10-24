import { describe, expect, it } from 'vitest';
import { formatAufschluesselung, gruppenSchluessel, gruppiere, normalisiere } from './gruppierung';
import { teil } from './testdaten';

const namen: Record<string, string> = { 'standort-1': 'Standort 1', 'standort-2': 'Standort 2' };

describe('normalisiere', () => {
  it('trimmt, macht lowercase und fasst Leerzeichen zusammen', () => {
    expect(normalisiere('  Blaue   Jeans ')).toBe('blaue jeans');
    expect(normalisiere(undefined)).toBe('');
  });
});

describe('gruppenSchluessel', () => {
  it('ignoriert Groß-/Kleinschreibung und Leerzeichen in Name und Farbe', () => {
    expect(gruppenSchluessel({ kategorieId: 'hosen', name: ' Jeans', farbe: 'Blau ' })).toBe(
      gruppenSchluessel({ kategorieId: 'hosen', name: 'jeans', farbe: 'blau' }),
    );
  });
  it('unterscheidet Kategorie und Farbe', () => {
    const a = gruppenSchluessel({ kategorieId: 'hosen', name: 'Jeans', farbe: 'blau' });
    expect(gruppenSchluessel({ kategorieId: 'sonstiges', name: 'Jeans', farbe: 'blau' })).not.toBe(a);
    expect(gruppenSchluessel({ kategorieId: 'hosen', name: 'Jeans', farbe: 'schwarz' })).not.toBe(a);
    expect(gruppenSchluessel({ kategorieId: 'hosen', name: 'Jeans' })).not.toBe(a);
  });
});

describe('gruppiere', () => {
  it('fasst gleiche Teile zusammen und zählt pro Standort inkl. Wäsche', () => {
    const teile = [
      teil({ name: 'Socke', kategorieId: 'socken', farbe: 'schwarz' }),
      teil({ name: 'socke ', kategorieId: 'socken', farbe: 'Schwarz', status: 'waesche' }),
      teil({ name: 'Socke', kategorieId: 'socken', farbe: 'schwarz', standortId: 'standort-2' }),
      teil({ name: 'Socke', kategorieId: 'socken', farbe: 'schwarz' }),
      teil({ name: 'Socke', kategorieId: 'socken', farbe: 'weiß' }),
    ];
    const gruppen = gruppiere(teile, { standortReihenfolge: ['standort-1', 'standort-2'] });
    expect(gruppen).toHaveLength(2);
    const schwarz = gruppen.find((g) => g.farbe === 'schwarz')!;
    expect(schwarz.anzahl).toBe(4);
    expect(schwarz.waesche).toBe(1);
    expect(schwarz.teile[0]).toBe(teile[0]);
    expect(schwarz.proStandort).toEqual([
      { standortId: 'standort-1', anzahl: 3, waesche: 1 },
      { standortId: 'standort-2', anzahl: 1, waesche: 0 },
    ]);
    expect(formatAufschluesselung(schwarz, (id) => namen[id])).toBe(
      '4 Stück: Standort 1: 3 (1 in der Wäsche), Standort 2: 1',
    );
  });

  it('ignoriert aussortierte Teile', () => {
    const gruppen = gruppiere([teil(), teil({ aussortiert: true }), teil({ name: 'Weg', aussortiert: true })]);
    expect(gruppen).toHaveLength(1);
    expect(gruppen[0].anzahl).toBe(1);
  });

  it('sortiert nach Kategorie-Reihenfolge, dann Name', () => {
    const gruppen = gruppiere(
      [
        teil({ name: 'Zebra', kategorieId: 'tshirts' }),
        teil({ name: 'Jeans', kategorieId: 'hosen' }),
        teil({ name: 'Anker', kategorieId: 'tshirts' }),
      ],
      { kategorieReihenfolge: ['hosen', 'tshirts'] },
    );
    expect(gruppen.map((g) => g.name)).toEqual(['Jeans', 'Anker', 'Zebra']);
  });

  it('liefert leere Liste ohne Teile', () => {
    expect(gruppiere([])).toEqual([]);
  });
});
