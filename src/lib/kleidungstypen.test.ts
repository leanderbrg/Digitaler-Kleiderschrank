import { describe, expect, it } from 'vitest';
import type { Farbname, Helligkeit } from './farbe';
import { baueName, dekliniere, kategorieFuerTyp, KLEIDUNGSTYPEN, typNachId } from './kleidungstypen';

const typ = (id: string) => typNachId(id)!;

describe('Label-Tabelle', () => {
  it('deckt alle geforderten Typen ab', () => {
    const namen = KLEIDUNGSTYPEN.map((t) => t.name);
    for (const n of ['Jeans', 'Hose', 'Jogginghose', 'Shorts', 'T-Shirt', 'Langarmshirt', 'Hemd', 'Pullover', 'Hoodie',
      'Strickjacke', 'Jacke', 'Mantel', 'Socken', 'Unterhose', 'Schuhe', 'Mütze', 'Schal', 'Kleid', 'Rock', 'Sonstiges']) {
      expect(namen).toContain(n);
    }
  });
  it('hat eindeutige IDs und Prompts', () => {
    expect(new Set(KLEIDUNGSTYPEN.map((t) => t.id)).size).toBe(KLEIDUNGSTYPEN.length);
    expect(new Set(KLEIDUNGSTYPEN.map((t) => t.prompt)).size).toBe(KLEIDUNGSTYPEN.length);
  });
});

describe('dekliniere', () => {
  it.each([
    ['blau', 'm', 'blauer'],
    ['blau', 'f', 'blaue'],
    ['blau', 'n', 'blaues'],
    ['blau', 'pl', 'blaue'],
    ['weiß', 'n', 'weißes'],
    ['dunkel', 'f', 'dunkle'],
    ['dunkel', 'm', 'dunkler'],
    ['dunkel', 'n', 'dunkles'],
    ['hell', 'pl', 'helle'],
    ['beige', 'f', 'beige'],
    ['lila', 'm', 'lila'],
    ['rosa', 'n', 'rosa'],
    ['orange', 'pl', 'orange'],
  ] as const)('%s + %s → %s', (adj, genus, erwartet) => {
    expect(dekliniere(adj, genus)).toBe(erwartet);
  });
});

describe('baueName', () => {
  it.each<[string, Farbname | undefined, Helligkeit | undefined, string | undefined]>([
    ['jeans', 'blau', 'hell', 'Helle Jeans'],
    ['jeans', 'blau', 'dunkel', 'Dunkle Jeans'],
    ['jeans', 'grau', 'dunkel', 'Dunkle Jeans'],
    ['jeans', 'blau', 'neutral', 'Blaue Jeans'],
    ['jeans', 'schwarz', 'dunkel', 'Schwarze Jeans'],
    ['hose', 'grau', 'hell', 'Helle Hose'],
    ['hose', 'beige', 'hell', 'Beige Hose'],
    ['tshirt', 'weiß', 'hell', 'Weißes T-Shirt'],
    ['socken', 'schwarz', 'dunkel', 'Schwarze Socken'],
    ['pullover', 'grün', 'neutral', 'Grüner Pullover'],
    ['pullover', 'blau', 'dunkel', 'Blauer Pullover'], // Helligkeit nur bei Jeans/Hosen
    ['mantel', 'braun', 'dunkel', 'Brauner Mantel'],
    ['kleid', 'rot', 'neutral', 'Rotes Kleid'],
    ['schuhe', 'weiß', 'hell', 'Weiße Schuhe'],
    ['mantel', undefined, undefined, 'Mantel'],
    ['sonstiges', 'rot', 'neutral', undefined],
  ])('%s, %s, %s → %s', (id, farbe, hell, erwartet) => {
    expect(baueName(typ(id), farbe, hell)).toBe(erwartet);
  });
});

describe('kategorieFuerTyp', () => {
  const standard = [
    { id: 'hosen', name: 'Hosen' },
    { id: 'tshirts', name: 'T-Shirts' },
    { id: 'sonstiges', name: 'Sonstiges' },
  ];

  it('ordnet über den Kategorienamen zu (unabhängig von Schreibweise und ID)', () => {
    expect(kategorieFuerTyp(typ('jeans'), standard)).toBe('hosen');
    expect(kategorieFuerTyp(typ('tshirt'), [{ id: 'xyz', name: ' t-shirts ' }])).toBe('xyz');
  });

  it('nimmt "Sonstiges", wenn die Kategorie fehlt (gelöscht oder umbenannt)', () => {
    expect(kategorieFuerTyp(typ('socken'), standard)).toBe('sonstiges');
    expect(kategorieFuerTyp(typ('jeans'), [{ id: 'b', name: 'Beinkleider' }, { id: 's', name: 'Sonstiges' }])).toBe('s');
  });

  it('lässt das Feld leer, wenn es auch "Sonstiges" nicht gibt', () => {
    expect(kategorieFuerTyp(typ('socken'), [{ id: 'hosen', name: 'Hosen' }])).toBeUndefined();
  });
});
