import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Verlaufseintrag } from '../types';
import {
  entwurfOhneBlobs,
  erzeugeAutoSpeicher,
  fasseVerlaufZusammen,
  vereinigeFelder,
  type SpeicherStatus,
} from './autoSpeichern';
import { validiereTeil } from './validierung';

/** Promise, das sich von außen auflösen lässt (simuliert langsames Speichern) */
function offen() {
  let resolve!: () => void;
  let reject!: (e: unknown) => void;
  const promise = new Promise<void>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

describe('erzeugeAutoSpeicher', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('entprellt Texteingaben und speichert nur den letzten Stand', async () => {
    const gespeichert: string[] = [];
    const s = erzeugeAutoSpeicher<string>({ speichern: async (x) => void gespeichert.push(x), verzoegerung: 600 });
    s.aendern('J');
    s.aendern('Je');
    await vi.advanceTimersByTimeAsync(500);
    s.aendern('Jeans');
    await vi.advanceTimersByTimeAsync(599);
    expect(gespeichert).toEqual([]);
    await vi.advanceTimersByTimeAsync(1);
    expect(gespeichert).toEqual(['Jeans']);
    expect(s.status()).toBe('gespeichert');
  });

  it('speichert Auswahlfelder sofort', async () => {
    const gespeichert: string[] = [];
    const s = erzeugeAutoSpeicher<string>({ speichern: async (x) => void gespeichert.push(x) });
    s.aendern('hosen', true);
    await vi.advanceTimersByTimeAsync(0);
    expect(gespeichert).toEqual(['hosen']);
  });

  it('flush speichert ausstehende Eingaben sofort (onBlur / Seite verlassen)', async () => {
    const gespeichert: string[] = [];
    const s = erzeugeAutoSpeicher<string>({ speichern: async (x) => void gespeichert.push(x) });
    s.aendern('Notiz');
    await s.flush();
    expect(gespeichert).toEqual(['Notiz']);
    await vi.advanceTimersByTimeAsync(1000);
    expect(gespeichert).toEqual(['Notiz']); // Timer wurde gestoppt, kein zweites Speichern
  });

  it('serialisiert: nie zwei Speichervorgänge gleichzeitig, danach nur der neueste Stand', async () => {
    const laeufe: { stand: string; p: ReturnType<typeof offen> }[] = [];
    let gleichzeitig = 0;
    let maxGleichzeitig = 0;
    const s = erzeugeAutoSpeicher<string>({
      speichern: async (stand) => {
        gleichzeitig++;
        maxGleichzeitig = Math.max(maxGleichzeitig, gleichzeitig);
        const p = offen();
        laeufe.push({ stand, p });
        await p.promise;
        gleichzeitig--;
      },
    });
    s.aendern('A', true);
    await vi.advanceTimersByTimeAsync(0);
    s.aendern('B', true);
    s.aendern('C', true);
    s.aendern('D', true);
    await vi.advanceTimersByTimeAsync(0);
    expect(laeufe.map((l) => l.stand)).toEqual(['A']);
    laeufe[0].p.resolve();
    await vi.advanceTimersByTimeAsync(0);
    expect(laeufe.map((l) => l.stand)).toEqual(['A', 'D']);
    laeufe[1].p.resolve();
    await s.flush();
    expect(maxGleichzeitig).toBe(1);
    expect(s.status()).toBe('gespeichert');
  });

  it('meldet Fehler und kann erneut versuchen', async () => {
    const status: SpeicherStatus[] = [];
    let versuch = 0;
    const gespeichert: string[] = [];
    const s = erzeugeAutoSpeicher<string>({
      speichern: async (x) => {
        if (versuch++ === 0) throw new Error('DB voll');
        gespeichert.push(x);
      },
      onStatus: (x) => status.push(x),
    });
    s.aendern('Hemd', true);
    await vi.advanceTimersByTimeAsync(0);
    expect(s.status()).toBe('fehler');
    await s.erneutVersuchen();
    expect(gespeichert).toEqual(['Hemd']);
    expect(status).toEqual(['speichert', 'fehler', 'speichert', 'gespeichert']);
  });

  it('kennt den offenen Stand für den Notfall-Entwurf beim Entladen der Seite', async () => {
    const p = offen();
    const s = erzeugeAutoSpeicher<string>({ speichern: () => p.promise });
    expect(s.offenerStand()).toBeNull();
    s.aendern('A'); // noch im Debounce
    expect(s.offenerStand()).toBe('A');
    void s.flush(); // läuft, noch nicht bestätigt
    expect(s.offenerStand()).toBe('A');
    p.resolve();
    await s.flush();
    expect(s.offenerStand()).toBeNull();
  });

  it('verwerfen verhindert das Speichern eines vorgemerkten Stands', async () => {
    const gespeichert: string[] = [];
    const s = erzeugeAutoSpeicher<string>({ speichern: async (x) => void gespeichert.push(x) });
    s.aendern('x');
    s.verwerfen();
    await vi.advanceTimersByTimeAsync(1000);
    await s.flush();
    expect(gespeichert).toEqual([]);
  });
});

describe('entwurfOhneBlobs', () => {
  it('entfernt Fotos, behält Textfelder', () => {
    expect(entwurfOhneBlobs({ name: 'Jeans', notiz: '', foto: new Blob(['x']), thumb: undefined })).toEqual({
      name: 'Jeans',
      notiz: '',
      thumb: undefined,
    });
  });
});

describe('Validierung beim Auto-Speichern', () => {
  it('ein leerer Name ist ungültig und darf nicht gespeichert werden', () => {
    const f = validiereTeil({ name: '  ', kategorieId: 'hosen', standortId: 's1', anzahl: 1 }, false);
    expect(f.name).toBeDefined();
  });
});

describe('Verlaufs-Zusammenfassung', () => {
  const basis = (x: Partial<Verlaufseintrag>): Verlaufseintrag => ({
    id: 'id',
    datum: 0,
    teilId: 't1',
    teilName: 'Jeans',
    kategorieId: 'hosen',
    aktion: 'bearbeitet',
    ...x,
  });

  it('vereinigt Feldlisten ohne Duplikate', () => {
    expect(vereinigeFelder('Name, Farbe', 'Farbe, Notiz')).toBe('Name, Farbe, Notiz');
    expect(vereinigeFelder(undefined, 'Größe')).toBe('Größe');
  });

  it('fasst Bearbeitungen innerhalb von 2 Minuten zu einem Eintrag zusammen', () => {
    const alt = basis({ id: 'alt', datum: 1000, details: { text: 'Name' } });
    const neu = basis({ id: 'neu', datum: 60_000, teilName: 'Helle Jeans', details: { text: 'Farbe' } });
    const r = fasseVerlaufZusammen([neu], alt, 60_000);
    expect(r.hinzufuegen).toEqual([]);
    expect(r.aktualisieren).toMatchObject({ id: 'alt', datum: 60_000, teilName: 'Helle Jeans', details: { text: 'Name, Farbe' } });
  });

  it('beginnt nach Ablauf des Fensters einen neuen Eintrag', () => {
    const alt = basis({ id: 'alt', datum: 0, details: { text: 'Name' } });
    const neu = basis({ id: 'neu', datum: 200_000, details: { text: 'Farbe' } });
    expect(fasseVerlaufZusammen([neu], alt, 200_000)).toEqual({ hinzufuegen: [neu] });
  });

  it('lässt Status- und Standortwechsel als eigene Einträge stehen', () => {
    const alt = basis({ id: 'alt', datum: 1000, details: { text: 'Name' } });
    const status = basis({ id: 's', aktion: 'status', details: { vonStatus: 'schrank', nachStatus: 'getragen' } });
    const bearbeitet = basis({ id: 'b', details: { text: 'Notiz' } });
    const r = fasseVerlaufZusammen([status, bearbeitet], alt, 5000);
    expect(r.hinzufuegen).toEqual([status]);
    expect(r.aktualisieren?.details?.text).toBe('Name, Notiz');
  });

  it('fasst nicht über verschiedene Teile hinweg zusammen', () => {
    const alt = basis({ id: 'alt', teilId: 'anderes', datum: 1000 });
    const neu = basis({ id: 'neu', details: { text: 'Farbe' } });
    expect(fasseVerlaufZusammen([neu], alt, 2000).hinzufuegen).toEqual([neu]);
  });
});
