import type { Status, Teil } from '../types';
import { normalisiere } from './gruppierung';

export interface TeilFilter {
  standortId?: string;
  kategorieId?: string;
  status?: Status;
  suche?: string;
}

/**
 * Filtert aktive Teile. Die Textsuche durchsucht Name, Farbe, Größe, Notiz und
 * (optional) den Kategorienamen; mehrere Wörter müssen alle vorkommen.
 */
export function filterTeile(
  teile: Teil[],
  f: TeilFilter,
  kategorieName: (id: string) => string = () => '',
): Teil[] {
  const woerter = normalisiere(f.suche).split(' ').filter(Boolean);
  return teile.filter((t) => {
    if (t.aussortiert) return false;
    if (f.standortId && t.standortId !== f.standortId) return false;
    if (f.kategorieId && t.kategorieId !== f.kategorieId) return false;
    if (f.status && t.status !== f.status) return false;
    if (woerter.length) {
      const text = normalisiere([t.name, t.farbe, t.groesse, t.notiz, kategorieName(t.kategorieId)].join(' '));
      if (!woerter.every((w) => text.includes(w))) return false;
    }
    return true;
  });
}
