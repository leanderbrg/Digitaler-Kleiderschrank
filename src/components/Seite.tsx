import type { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';

interface Props {
  titel: string;
  zurueck?: boolean;
  aktionen?: ReactNode;
  children: ReactNode;
}

/** Gemeinsamer Seitenrahmen mit Titelzeile. */
export default function Seite({ titel, zurueck, aktionen, children }: Props) {
  const navigate = useNavigate();
  return (
    <div className="mx-auto max-w-3xl px-4 pb-32 pt-4">
      <header className="mb-4 flex min-h-[44px] items-center gap-2">
        {zurueck && (
          <button
            type="button"
            onClick={() => navigate(-1)}
            aria-label="Zurück"
            className="btn-klein -ml-2 text-xl text-slate-600 hover:bg-slate-200 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            ←
          </button>
        )}
        <h1 className="flex-1 truncate text-2xl font-bold tracking-tight">{titel}</h1>
        {aktionen}
      </header>
      {children}
    </div>
  );
}
