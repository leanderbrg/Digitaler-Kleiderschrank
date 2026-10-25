import { STATUS_LABEL, type Aktion, type Verlaufseintrag } from '../types';

export const AKTION_INFO: Record<Aktion, { emoji: string; label: string }> = {
  hinzugefügt: { emoji: '➕', label: 'Hinzugefügt' },
  aussortiert: { emoji: '🗑️', label: 'Aussortiert' },
  verschoben: { emoji: '🔀', label: 'Verschoben' },
  status: { emoji: '🔄', label: 'Status' },
  wäsche: { emoji: '🔄', label: 'Status' }, // Altbestand aus Version 1
  bearbeitet: { emoji: '✏️', label: 'Bearbeitet' },
  wiederhergestellt: { emoji: '♻️', label: 'Wiederhergestellt' },
};

/** Aktionen, die im Verlauf als Filter angeboten werden ("wäsche" ist in "status" enthalten) */
export const FILTER_AKTIONEN: Aktion[] = ['hinzugefügt', 'status', 'verschoben', 'bearbeitet', 'aussortiert', 'wiederhergestellt'];

export function passtZuAktion(v: Verlaufseintrag, filter: Aktion | ''): boolean {
  if (!filter) return true;
  if (filter === 'status') return v.aktion === 'status' || v.aktion === 'wäsche';
  return v.aktion === filter;
}

/** Menschlich lesbare Beschreibung der Details eines Verlaufseintrags. */
export function verlaufDetails(v: Verlaufseintrag, standortName: (id: string) => string): string {
  const d = v.details;
  switch (v.aktion) {
    case 'verschoben':
      return d?.vonStandortId && d.nachStandortId ? `${standortName(d.vonStandortId)} → ${standortName(d.nachStandortId)}` : '';
    case 'status':
    case 'wäsche':
      return d?.vonStatus && d.nachStatus
        ? `${STATUS_LABEL[d.vonStatus] ?? d.vonStatus} → ${STATUS_LABEL[d.nachStatus] ?? d.nachStatus}`
        : '';
    case 'aussortiert':
      return d?.grund ? `Grund: ${d.grund}` : '';
    case 'bearbeitet':
      return d?.text ? `Geändert: ${d.text}` : '';
    default:
      return '';
  }
}

/** Datumsüberschrift: "Heute", "Gestern" oder "Mo., 3. März 2026" */
export function tagesLabel(datum: number, jetzt: number): string {
  const tag = (x: number) => {
    const d = new Date(x);
    return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  };
  const diff = Math.round((tag(jetzt) - tag(datum)) / 86400000);
  if (diff === 0) return 'Heute';
  if (diff === 1) return 'Gestern';
  return new Date(datum).toLocaleDateString('de-DE', { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric' });
}
