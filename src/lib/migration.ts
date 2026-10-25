import type { Status, Teil, Verlaufseintrag } from '../types';
import { STATUS_WERTE } from '../types';

/** Unbekannte/fehlende Statuswerte werden zu "schrank" (sicherer Standard). */
export function normalisiereStatus(s: unknown): Status {
  return STATUS_WERTE.includes(s as Status) ? (s as Status) : 'schrank';
}

/** Bringt ein Teil aus einer älteren Version (DB oder Export) auf den aktuellen Stand. */
export function normalisiereTeil<T extends Partial<Teil>>(t: T): T & Pick<Teil, 'status' | 'zustand' | 'aussortiert'> {
  return {
    ...t,
    status: normalisiereStatus(t.status),
    zustand: t.zustand === 'abgetragen' ? 'abgetragen' : 'gut',
    aussortiert: !!t.aussortiert,
  };
}

/** Version 1 kannte nur die Aktion "wäsche" (Schrank ⇄ Wäsche); ab Version 2 heißt sie "status". */
export function normalisiereVerlauf(v: Verlaufseintrag): Verlaufseintrag {
  if (v.aktion !== 'wäsche') return v;
  return { ...v, aktion: 'status' };
}
