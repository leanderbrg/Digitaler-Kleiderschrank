import { describe, expect, it } from 'vitest';
import type { Verlaufseintrag } from '../types';
import { pruefeImport } from './export';
import { normalisiereStatus, normalisiereTeil, normalisiereVerlauf } from './migration';

describe('normalisiere*', () => {
  it('lässt gültige Status unverändert und fängt Unbekanntes ab', () => {
    expect(['schrank', 'getragen', 'waesche'].map(normalisiereStatus)).toEqual(['schrank', 'getragen', 'waesche']);
    expect(normalisiereStatus(undefined)).toBe('schrank');
    expect(normalisiereStatus('kaputt')).toBe('schrank');
  });
  it('ergänzt fehlende Pflichtfelder', () => {
    expect(normalisiereTeil({ id: 'a' })).toMatchObject({ status: 'schrank', zustand: 'gut', aussortiert: false });
  });
  it('schreibt die alte Verlaufsaktion "wäsche" zu "status" um', () => {
    const alt: Verlaufseintrag = {
      id: 'v',
      datum: 1,
      teilId: 't',
      teilName: 'X',
      kategorieId: 'k',
      aktion: 'wäsche',
      details: { vonStatus: 'schrank', nachStatus: 'waesche' },
    };
    expect(normalisiereVerlauf(alt)).toEqual({ ...alt, aktion: 'status' });
    const neu = { ...alt, aktion: 'verschoben' as const };
    expect(normalisiereVerlauf(neu)).toBe(neu);
  });
});

describe('Import eines Exports aus Version 1', () => {
  // So sah eine Exportdatei vor Einführung von "getragen" aus
  const v1 = {
    format: 'kleiderschrank-export',
    version: 1,
    exportiertAm: '2026-10-01T10:00:00.000Z',
    standorte: [{ id: 'standort-1', name: 'Standort 1', reihenfolge: 1 }],
    kategorien: [{ id: 'hosen', name: 'Hosen', emoji: '👖', reihenfolge: 1 }],
    teile: [
      { id: 'a', name: 'Jeans', kategorieId: 'hosen', standortId: 'standort-1', status: 'waesche', zustand: 'gut', erstelltAm: 1, geaendertAm: 1, aussortiert: false },
      { id: 'b', name: 'Chino', kategorieId: 'hosen', standortId: 'standort-1', status: 'schrank', zustand: 'gut', erstelltAm: 2, geaendertAm: 2, aussortiert: false },
    ],
    verlauf: [
      { id: 'v1', datum: 3, teilId: 'a', teilName: 'Jeans', kategorieId: 'hosen', aktion: 'wäsche', details: { vonStatus: 'schrank', nachStatus: 'waesche' } },
    ],
  };

  it('wird akzeptiert und migriert', () => {
    const e = pruefeImport(v1);
    expect(e.ok).toBe(true);
    if (!e.ok) return;
    expect(e.daten.teile.map((t) => t.status)).toEqual(['waesche', 'schrank']);
    expect(e.daten.verlauf[0].aktion).toBe('status');
    expect(e.daten.verlauf[0].details).toEqual({ vonStatus: 'schrank', nachStatus: 'waesche' });
  });

  it('lehnt Dateien aus einer zukünftigen Version ab', () => {
    const e = pruefeImport({ ...v1, version: 3 });
    expect(e.ok).toBe(false);
  });
});
