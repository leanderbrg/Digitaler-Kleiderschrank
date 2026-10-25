import { useId } from 'react';
import { STATUS_INFO, STATUS_LABEL, STATUS_WERTE, type Status } from '../types';

/** Farben je Status – immer zusammen mit Icon und Text verwendet */
const FARBE: Record<Status, { badge: string; aktiv: string }> = {
  schrank: {
    badge: 'bg-emerald-100 text-emerald-900 dark:bg-emerald-900/40 dark:text-emerald-200',
    aktiv: 'border-emerald-700 bg-emerald-700 text-white dark:border-emerald-500 dark:bg-emerald-600',
  },
  getragen: {
    badge: 'bg-amber-100 text-amber-900 dark:bg-amber-900/40 dark:text-amber-200',
    aktiv: 'border-amber-600 bg-amber-500 text-amber-950 dark:border-amber-400 dark:bg-amber-400',
  },
  waesche: {
    badge: 'bg-sky-100 text-sky-900 dark:bg-sky-900/50 dark:text-sky-200',
    aktiv: 'border-sky-700 bg-sky-700 text-white dark:border-sky-500 dark:bg-sky-600',
  },
};

export function StatusBadge({ status }: { status: Status }) {
  return (
    <span className={`rounded-full px-2 py-0.5 font-medium ${FARBE[status].badge}`}>
      {STATUS_INFO[status].icon} {STATUS_LABEL[status]}
    </span>
  );
}

interface Props {
  wert: Status | undefined;
  /** `undefined` nur bei "Unverändert" (mitUnveraendert) */
  onChange: (s: Status | undefined) => void;
  /** Sichtbare Überschrift; ohne Überschrift wird `ariaLabel` verwendet */
  label?: string;
  ariaLabel?: string;
  /** Zusätzliche Option "Unverändert" (z. B. beim Verschieben) */
  mitUnveraendert?: boolean;
  kompakt?: boolean;
}

/** 3-teiliges Segment-Control Schrank | Getragen | Wäsche (Radio-Gruppe, große Touch-Ziele). */
export function StatusWahl({ wert, onChange, label, ariaLabel, mitUnveraendert, kompakt }: Props) {
  const name = useId();
  const optionen: (Status | 'gleich')[] = mitUnveraendert ? ['gleich', ...STATUS_WERTE] : STATUS_WERTE;
  return (
    <fieldset>
      {label ? <legend className="label">{label}</legend> : <legend className="sr-only">{ariaLabel ?? 'Status'}</legend>}
      <div className={`grid gap-1 ${optionen.length === 4 ? 'grid-cols-2 sm:grid-cols-4' : 'grid-cols-3'}`}>
        {optionen.map((o) => {
          const aktiv = o === 'gleich' ? wert === undefined : wert === o;
          return (
            <label key={o}>
              <input
                type="radio"
                name={name}
                checked={aktiv}
                onChange={() => onChange(o === 'gleich' ? undefined : o)}
                className="peer sr-only"
              />
              <span
                className={`flex cursor-pointer items-center justify-center gap-1 rounded-xl border text-sm font-medium peer-focus-visible:ring-2 peer-focus-visible:ring-marke-500 peer-focus-visible:ring-offset-2 ${
                  kompakt ? 'min-h-[44px] px-1' : 'min-h-[48px] px-2'
                } ${
                  aktiv
                    ? o === 'gleich'
                      ? 'border-marke-700 bg-marke-700 text-white'
                      : FARBE[o].aktiv
                    : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800'
                }`}
              >
                {o === 'gleich' ? (
                  'Unverändert'
                ) : (
                  <>
                    <span aria-hidden="true">{STATUS_INFO[o].icon}</span>
                    {STATUS_INFO[o].kurz}
                  </>
                )}
              </span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
