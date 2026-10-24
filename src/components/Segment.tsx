import { useId } from 'react';

interface Option<T extends string> {
  wert: T;
  label: string;
}

interface Props<T extends string> {
  label: string;
  optionen: Option<T>[];
  wert: T | undefined;
  onChange: (w: T) => void;
  fehler?: string;
}

/** Segmentierte Auswahl als Radio-Gruppe (große Touch-Ziele, tastaturbedienbar). */
export default function Segment<T extends string>({ label, optionen, wert, onChange, fehler }: Props<T>) {
  const name = useId();
  return (
    <fieldset>
      <legend className="label">{label}</legend>
      <div className="flex flex-wrap gap-2">
        {optionen.map((o) => (
          <label key={o.wert} className="relative">
            <input
              type="radio"
              name={name}
              value={o.wert}
              checked={wert === o.wert}
              onChange={() => onChange(o.wert)}
              className="peer sr-only"
            />
            <span className="flex min-h-[44px] cursor-pointer items-center rounded-xl border border-slate-300 bg-white px-4 text-sm font-medium text-slate-700 peer-checked:border-marke-700 peer-checked:bg-marke-700 peer-checked:text-white peer-focus-visible:ring-2 peer-focus-visible:ring-marke-500 peer-focus-visible:ring-offset-2 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200">
              {o.label}
            </span>
          </label>
        ))}
      </div>
      {fehler && <p className="mt-1 text-sm text-red-700 dark:text-red-400">{fehler}</p>}
    </fieldset>
  );
}
