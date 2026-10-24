import type { Teil } from '../types';

let zaehler = 0;

/** Baut ein Teil für Tests; nur abweichende Felder angeben. */
export function teil(t: Partial<Teil> = {}): Teil {
  zaehler++;
  return {
    id: `t${zaehler}`,
    name: 'T-Shirt',
    kategorieId: 'tshirts',
    standortId: 'standort-1',
    status: 'schrank',
    zustand: 'gut',
    erstelltAm: 1000 + zaehler,
    geaendertAm: 1000 + zaehler,
    aussortiert: false,
    ...t,
  };
}

/** Deterministischer ID-Generator für Tests */
export function idFolge(prefix = 'id'): () => string {
  let i = 0;
  return () => `${prefix}${++i}`;
}
