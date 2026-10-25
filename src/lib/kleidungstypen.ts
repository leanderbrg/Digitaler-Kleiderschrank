import type { Farbname, Helligkeit } from './farbe';
import { normalisiere } from './gruppierung';
import type { Kategorie } from '../types';

/** Genus für die Deklination: der (m), die (f), das (n), die – Plural (pl) */
export type Genus = 'm' | 'f' | 'n' | 'pl';

export interface Kleidungstyp {
  id: string;
  /** Deutscher Anzeigename, z. B. "T-Shirt" */
  name: string;
  genus: Genus;
  /** Name der Standardkategorie (Zuordnung über den Kategorienamen) */
  kategorie: string;
  /** Englischer Prompt für die Zero-Shot-Klassifikation */
  prompt: string;
  /** Bei Blau-/Grautönen zählt die Helligkeit statt der Farbe ("Helle Jeans") */
  helligkeitStattFarbe?: boolean;
  /** Platzhalter-Typ ohne eigenen Namen */
  sonstiges?: boolean;
}

export const KLEIDUNGSTYPEN: Kleidungstyp[] = [
  { id: 'jeans', name: 'Jeans', genus: 'f', kategorie: 'Hosen', prompt: 'a photo of jeans', helligkeitStattFarbe: true },
  { id: 'hose', name: 'Hose', genus: 'f', kategorie: 'Hosen', prompt: 'a photo of trousers', helligkeitStattFarbe: true },
  { id: 'jogginghose', name: 'Jogginghose', genus: 'f', kategorie: 'Hosen', prompt: 'a photo of sweatpants' },
  { id: 'shorts', name: 'Shorts', genus: 'pl', kategorie: 'Hosen', prompt: 'a photo of shorts' },
  { id: 'tshirt', name: 'T-Shirt', genus: 'n', kategorie: 'T-Shirts', prompt: 'a photo of a t-shirt' },
  { id: 'langarmshirt', name: 'Langarmshirt', genus: 'n', kategorie: 'T-Shirts', prompt: 'a photo of a long sleeve shirt' },
  { id: 'hemd', name: 'Hemd', genus: 'n', kategorie: 'Hemden', prompt: 'a photo of a button-up shirt' },
  { id: 'pullover', name: 'Pullover', genus: 'm', kategorie: 'Pullover', prompt: 'a photo of a sweater' },
  { id: 'hoodie', name: 'Hoodie', genus: 'm', kategorie: 'Pullover', prompt: 'a photo of a hoodie' },
  { id: 'strickjacke', name: 'Strickjacke', genus: 'f', kategorie: 'Pullover', prompt: 'a photo of a cardigan' },
  { id: 'jacke', name: 'Jacke', genus: 'f', kategorie: 'Jacken', prompt: 'a photo of a jacket' },
  { id: 'mantel', name: 'Mantel', genus: 'm', kategorie: 'Jacken', prompt: 'a photo of a coat' },
  { id: 'socken', name: 'Socken', genus: 'pl', kategorie: 'Socken', prompt: 'a photo of socks' },
  { id: 'unterhose', name: 'Unterhose', genus: 'f', kategorie: 'Unterhosen', prompt: 'a photo of underwear' },
  { id: 'schuhe', name: 'Schuhe', genus: 'pl', kategorie: 'Schuhe', prompt: 'a photo of shoes' },
  { id: 'muetze', name: 'Mütze', genus: 'f', kategorie: 'Sonstiges', prompt: 'a photo of a beanie hat' },
  { id: 'schal', name: 'Schal', genus: 'm', kategorie: 'Sonstiges', prompt: 'a photo of a scarf' },
  { id: 'kleid', name: 'Kleid', genus: 'n', kategorie: 'Sonstiges', prompt: 'a photo of a dress' },
  { id: 'rock', name: 'Rock', genus: 'm', kategorie: 'Sonstiges', prompt: 'a photo of a skirt' },
  { id: 'sonstiges', name: 'Sonstiges', genus: 'n', kategorie: 'Sonstiges', prompt: 'a photo of an object', sonstiges: true },
];

export function typNachId(id: string): Kleidungstyp | undefined {
  return KLEIDUNGSTYPEN.find((t) => t.id === id);
}

/** Starke Adjektivendung im Nominativ ohne Artikel: blauer Pullover, blaue Jeans, blaues Hemd, blaue Socken */
const ENDUNG: Record<Genus, string> = { m: 'er', f: 'e', n: 'es', pl: 'e' };

/** Farben, die im Standarddeutsch nicht dekliniert werden ("eine beige Hose", "lila Pullover") */
const UNVERAENDERLICH = new Set<Farbname>(['beige', 'orange', 'lila', 'rosa']);

/** Dekliniertes Adjektiv: "weiß" + n → "weißes", "dunkel" + f → "dunkle" */
export function dekliniere(adjektiv: string, genus: Genus): string {
  if (UNVERAENDERLICH.has(adjektiv as Farbname)) return adjektiv;
  // "dunkel" verliert das unbetonte e vor der Endung: dunkle, dunkler, dunkles
  const stamm = adjektiv.endsWith('el') ? adjektiv.slice(0, -2) + 'l' : adjektiv;
  return stamm + ENDUNG[genus];
}

const gross = (s: string) => s.charAt(0).toLocaleUpperCase('de-DE') + s.slice(1);

/**
 * Bildet den Namensvorschlag, z. B. "Helle Jeans", "Dunkle Jeans", "Weißes T-Shirt",
 * "Schwarze Socken", "Beige Hose". Ohne Farbe nur der Typname; bei "Sonstiges" kein Name.
 */
export function baueName(typ: Kleidungstyp, farbe?: Farbname, hell?: Helligkeit): string | undefined {
  if (typ.sonstiges) return undefined;
  if (typ.helligkeitStattFarbe && (farbe === 'blau' || farbe === 'grau') && hell && hell !== 'neutral') {
    return `${gross(dekliniere(hell, typ.genus))} ${typ.name}`;
  }
  if (!farbe) return typ.name;
  return `${gross(dekliniere(farbe, typ.genus))} ${typ.name}`;
}

/**
 * Ordnet einen Typ einer vorhandenen Kategorie über deren Namen zu (ohne Groß-/Kleinschreibung).
 * Fehlt die Kategorie (gelöscht/umbenannt), wird "Sonstiges" genommen, sonst nichts –
 * es wird nie eine neue Kategorie angelegt.
 */
export function kategorieFuerTyp(typ: Kleidungstyp, kategorien: Pick<Kategorie, 'id' | 'name'>[]): string | undefined {
  const finde = (name: string) => kategorien.find((k) => normalisiere(k.name) === normalisiere(name))?.id;
  return finde(typ.kategorie) ?? finde('Sonstiges');
}
