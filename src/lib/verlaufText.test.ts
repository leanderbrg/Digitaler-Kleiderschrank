import { describe, expect, it } from 'vitest';
import type { Verlaufseintrag } from '../types';
import { tagesLabel, verlaufDetails } from './verlaufText';

const basis: Verlaufseintrag = { id: '1', datum: 0, teilId: 't', teilName: 'X', kategorieId: 'k', aktion: 'hinzugefügt' };
const name = (id: string) => ({ a: 'Zuhause', b: 'Ferienwohnung' })[id] ?? id;

describe('verlaufDetails', () => {
  it('beschreibt alle Aktionen', () => {
    expect(verlaufDetails({ ...basis, aktion: 'verschoben', details: { vonStandortId: 'a', nachStandortId: 'b' } }, name)).toBe(
      'Zuhause → Ferienwohnung',
    );
    expect(verlaufDetails({ ...basis, aktion: 'wäsche', details: { vonStatus: 'schrank', nachStatus: 'waesche' } }, name)).toBe(
      'im Schrank → in der Wäsche',
    );
    expect(verlaufDetails({ ...basis, aktion: 'aussortiert', details: { grund: 'Loch' } }, name)).toBe('Grund: Loch');
    expect(verlaufDetails({ ...basis, aktion: 'bearbeitet', details: { text: 'Farbe' } }, name)).toBe('Geändert: Farbe');
    expect(verlaufDetails(basis, name)).toBe('');
  });
});

describe('tagesLabel', () => {
  it('nennt Heute und Gestern', () => {
    const jetzt = new Date(2026, 4, 10, 9).getTime();
    expect(tagesLabel(new Date(2026, 4, 10, 1).getTime(), jetzt)).toBe('Heute');
    expect(tagesLabel(new Date(2026, 4, 9, 23).getTime(), jetzt)).toBe('Gestern');
    expect(tagesLabel(new Date(2026, 4, 1).getTime(), jetzt)).toContain('2026');
  });
});
