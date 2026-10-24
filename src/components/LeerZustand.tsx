import type { ReactNode } from 'react';

export default function LeerZustand({ emoji = '👕', titel, children }: { emoji?: string; titel: string; children?: ReactNode }) {
  return (
    <div className="karte flex flex-col items-center gap-2 px-6 py-10 text-center">
      <span aria-hidden="true" className="text-5xl">
        {emoji}
      </span>
      <p className="text-lg font-semibold">{titel}</p>
      {children && <div className="text-sm text-slate-600 dark:text-slate-400">{children}</div>}
    </div>
  );
}
