export const ANZAHL_MIN = 1;
export const ANZAHL_MAX = 50;
export const NAME_MAX = 80;

export interface TeilEingabe {
  name: string;
  kategorieId: string;
  standortId: string;
  anzahl: number | string;
}

export type Fehler = Partial<Record<keyof TeilEingabe, string>>;

/** Prüft die Pflichtfelder des Teil-Formulars. Leeres Objekt = gültig. */
export function validiereTeil(e: TeilEingabe, mitAnzahl = true): Fehler {
  const fehler: Fehler = {};
  const name = e.name.trim();
  if (!name) fehler.name = 'Bitte gib einen Namen ein.';
  else if (name.length > NAME_MAX) fehler.name = `Der Name darf höchstens ${NAME_MAX} Zeichen haben.`;
  if (!e.kategorieId) fehler.kategorieId = 'Bitte wähle eine Kategorie.';
  if (!e.standortId) fehler.standortId = 'Bitte wähle einen Standort.';
  if (mitAnzahl) {
    const n = typeof e.anzahl === 'number' ? e.anzahl : Number(String(e.anzahl).trim());
    if (String(e.anzahl).trim() === '' || !Number.isInteger(n) || n < ANZAHL_MIN || n > ANZAHL_MAX) {
      fehler.anzahl = `Anzahl muss eine ganze Zahl von ${ANZAHL_MIN} bis ${ANZAHL_MAX} sein.`;
    }
  }
  return fehler;
}

export function istGueltig(f: Fehler): boolean {
  return Object.keys(f).length === 0;
}
