import { describe, expect, it } from 'vitest';
import type { Verlaufseintrag } from '../types';
import {
  aussortierEreignisse,
  aussortiertProMonat,
  bestandMatrix,
  bestandNachStatus,
  bestandProKategorie,
  haeufigsteGruende,
  standortSummen,
} from './statistik';
import { teil } from './testdaten';

const S = ['standort-1', 'standort-2'];
const teile = [
  teil({ kategorieId: 'hosen' }),
  teil({ kategorieId: 'hosen', standortId: 'standort-2', status: 'waesche' }),
  teil({ kategorieId: 'socken', status: 'waesche' }),
  teil({ kategorieId: 'socken' }),
  teil({ kategorieId: 'socken' }),
  teil({ kategorieId: 'socken', aussortiert: true }),
];

function v(teilId: string, aktion: Verlaufseintrag['aktion'], datum: number, grund?: string): Verlaufseintrag {
  return { id: `${teilId}-${datum}`, teilId, teilName: 'x', kategorieId: 'k', aktion, datum, details: grund ? { grund } : undefined };
}

describe('standortSummen', () => {
  it('zählt aktive, getragene und Wäsche-Teile je Standort', () => {
    expect(standortSummen([...teile, teil({ status: 'getragen' })], S)).toEqual([
      { standortId: 'standort-1', gesamt: 5, getragen: 1, waesche: 1 },
      { standortId: 'standort-2', gesamt: 1, getragen: 0, waesche: 1 },
    ]);
  });
});

describe('bestandNachStatus', () => {
  it('liefert immer alle drei Status', () => {
    expect(bestandNachStatus([...teile, teil({ status: 'getragen' })])).toEqual([
      { status: 'schrank', anzahl: 3 },
      { status: 'getragen', anzahl: 1 },
      { status: 'waesche', anzahl: 2 },
    ]);
  });
});

describe('bestandMatrix', () => {
  it('liefert Zeilen, Spalten- und Gesamtsummen ohne leere Kategorien', () => {
    const m = bestandMatrix(teile, ['hosen', 'tshirts', 'socken'], S);
    expect(m.zeilen).toEqual([
      { kategorieId: 'hosen', werte: [1, 1], summe: 2 },
      { kategorieId: 'socken', werte: [3, 0], summe: 3 },
    ]);
    expect(m.spaltenSummen).toEqual([4, 1]);
    expect(m.gesamt).toBe(5);
  });
  it('zeigt leere Kategorien auf Wunsch', () => {
    expect(bestandMatrix(teile, ['hosen', 'tshirts'], S, true).zeilen).toHaveLength(2);
  });
});

describe('bestandProKategorie', () => {
  it('sortiert absteigend und ignoriert Aussortiertes', () => {
    expect(bestandProKategorie(teile, ['hosen', 'socken', 'jacken'])).toEqual([
      { kategorieId: 'socken', anzahl: 3 },
      { kategorieId: 'hosen', anzahl: 2 },
    ]);
  });
});

describe('Aussortier-Statistik', () => {
  const jan = new Date(2026, 0, 15).getTime();
  const feb = new Date(2026, 1, 3).getTime();
  const maerz = new Date(2026, 2, 20).getTime();
  const verlauf = [
    v('a', 'hinzugefügt', jan - 1),
    v('a', 'aussortiert', jan, 'Loch'),
    v('b', 'aussortiert', feb, 'zu klein'),
    v('b', 'wiederhergestellt', feb + 1),
    v('c', 'aussortiert', maerz, 'Loch'),
    v('d', 'aussortiert', maerz, 'verschenkt'),
    v('e', 'aussortiert', jan, 'Loch'),
    v('e', 'wiederhergestellt', jan + 1),
    v('e', 'aussortiert', feb, 'verschlissen'),
  ];

  it('berücksichtigt Wiederherstellungen', () => {
    const ev = aussortierEreignisse(verlauf);
    expect(ev.map((e) => e.teilId).sort()).toEqual(['a', 'c', 'd', 'e']);
    expect(ev.find((e) => e.teilId === 'e')?.grund).toBe('verschlissen');
  });

  it('zählt pro Monat inkl. leerer Monate', () => {
    const ev = aussortierEreignisse(verlauf);
    expect(aussortiertProMonat(ev, new Date(2026, 3, 1).getTime(), 4)).toEqual([
      { monat: '2026-01', anzahl: 1 },
      { monat: '2026-02', anzahl: 1 },
      { monat: '2026-03', anzahl: 2 },
      { monat: '2026-04', anzahl: 0 },
    ]);
  });

  it('funktioniert über den Jahreswechsel', () => {
    const r = aussortiertProMonat([], new Date(2026, 1, 1).getTime(), 3);
    expect(r.map((x) => x.monat)).toEqual(['2025-12', '2026-01', '2026-02']);
  });

  it('sortiert Gründe nach Häufigkeit', () => {
    expect(haeufigsteGruende(aussortierEreignisse(verlauf))).toEqual([
      { grund: 'Loch', anzahl: 2 },
      { grund: 'verschenkt', anzahl: 1 },
      { grund: 'verschlissen', anzahl: 1 },
    ]);
  });
});
