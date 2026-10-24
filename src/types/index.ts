export type Status = 'schrank' | 'waesche';
export type Zustand = 'gut' | 'abgetragen';
export type Aktion = 'hinzugefügt' | 'aussortiert' | 'verschoben' | 'wäsche' | 'bearbeitet' | 'wiederhergestellt';

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

export const STATUS_LABEL: Record<Status, string> = {
  schrank: 'im Schrank',
  waesche: 'in der Wäsche',
};

export const ZUSTAND_LABEL: Record<Zustand, string> = {
  gut: 'gut',
  abgetragen: 'abgetragen',
};
