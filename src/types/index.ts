export type Status = 'schrank' | 'getragen' | 'waesche';
export type Zustand = 'gut' | 'abgetragen';
/** "wäsche" stammt aus Version 1 und wird bei Migration/Import zu "status" umgeschrieben. */
export type Aktion =
  | 'hinzugefügt'
  | 'aussortiert'
  | 'verschoben'
  | 'status'
  | 'wäsche'
  | 'bearbeitet'
  | 'wiederhergestellt';

export interface Standort {
  id: string;
  name: string;
  reihenfolge: number;
}

export interface Kategorie {
  id: string;
  name: string;
  emoji: string;
  reihenfolge: number;
}

export interface Teil {
  id: string;
  name: string;
  kategorieId: string;
  standortId: string;
  status: Status;
  /** Foto, max. 800 px Kantenlänge, JPEG */
  foto?: Blob;
  /** Kleines Vorschaubild (max. 240 px) für Listen */
  thumb?: Blob;
  groesse?: string;
  farbe?: string;
  zustand: Zustand;
  notiz?: string;
  erstelltAm: number;
  geaendertAm: number;
  aussortiert: boolean;
  aussortiertAm?: number;
  aussortierGrund?: string;
  /** Markiert Beispieldaten, damit sie gezielt entfernt werden können */
  beispiel?: boolean;
}

export interface VerlaufDetails {
  grund?: string;
  vonStandortId?: string;
  nachStandortId?: string;
  vonStatus?: Status;
  nachStatus?: Status;
  text?: string;
}

export interface Verlaufseintrag {
  id: string;
  datum: number;
  teilId: string;
  teilName: string;
  kategorieId: string;
  aktion: Aktion;
  details?: VerlaufDetails;
}

export interface Einstellung {
  key: string;
  value: unknown;
}

export const AUSSORTIER_GRUENDE = ['Loch', 'zu klein', 'verschlissen', 'verschenkt', 'Sonstiges'] as const;

export const STATUS_WERTE: Status[] = ['schrank', 'getragen', 'waesche'];

export const STATUS_LABEL: Record<Status, string> = {
  schrank: 'im Schrank',
  getragen: 'getragen',
  waesche: 'in der Wäsche',
};

/** Kurzlabel + Icon für Segment-Controls und Badges (nie nur Farbe als Unterscheidung) */
export const STATUS_INFO: Record<Status, { kurz: string; icon: string }> = {
  schrank: { kurz: 'Schrank', icon: '🗄️' },
  getragen: { kurz: 'Getragen', icon: '🪑' },
  waesche: { kurz: 'Wäsche', icon: '🧺' },
};

export const ZUSTAND_LABEL: Record<Zustand, string> = {
  gut: 'gut',
  abgetragen: 'abgetragen',
};
