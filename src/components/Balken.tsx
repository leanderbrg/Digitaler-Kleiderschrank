/** Schlichte Balkendiagramme ohne Chart-Bibliothek (eine Datenreihe, Werte als Text). */

export interface BalkenWert {
  label: string;
  wert: number;
  icon?: string;
}

/** Horizontale Balken – Label links, Wert rechts, gut lesbar auf schmalen Bildschirmen. */
export function BalkenHorizontal({ daten, einheit = 'Teile' }: { daten: BalkenWert[]; einheit?: string }) {
  const max = Math.max(1, ...daten.map((d) => d.wert));
  return (
    <ul className="space-y-2">
      {daten.map((d) => (
        <li key={d.label} title={`${d.label}: ${d.wert} ${einheit}`} className="grid grid-cols-[7.5rem_1fr_2.5rem] items-center gap-2 text-sm">
          <span className="truncate text-slate-700 dark:text-slate-300">
            {d.icon && <span aria-hidden="true">{d.icon} </span>}
            {d.label}
          </span>
          <span className="h-3 rounded-r bg-slate-100 dark:bg-slate-800" aria-hidden="true">
            <span
              className="block h-full rounded-r bg-marke-700 dark:bg-teal-400"
              style={{ width: `${(d.wert / max) * 100}%`, minWidth: d.wert > 0 ? 4 : 0 }}
            />
          </span>
          <span className="text-right font-semibold tabular-nums">{d.wert}</span>
        </li>
      ))}
    </ul>
  );
}

/** Vertikale Säulen (z. B. pro Monat). Werte stehen über den Säulen. */
export function BalkenVertikal({ daten, einheit = 'Teile' }: { daten: BalkenWert[]; einheit?: string }) {
  const max = Math.max(1, ...daten.map((d) => d.wert));
  return (
    <div>
      <div className="flex h-40 items-end gap-1 border-b border-slate-300 dark:border-slate-700" aria-hidden="true">
        {daten.map((d) => (
          <div key={d.label} title={`${d.label}: ${d.wert} ${einheit}`} className="flex h-full flex-1 flex-col items-center justify-end gap-1">
            <span className="text-xs font-semibold tabular-nums text-slate-700 dark:text-slate-300">{d.wert > 0 ? d.wert : ''}</span>
            <span
              className="block w-full max-w-[28px] rounded-t bg-marke-700 dark:bg-teal-400"
              style={{ height: `${(d.wert / max) * 80}%`, minHeight: d.wert > 0 ? 4 : 0 }}
            />
          </div>
        ))}
      </div>
      <div className="mt-1 flex gap-1" aria-hidden="true">
        {daten.map((d) => (
          <span key={d.label} className="flex-1 text-center text-[10px] text-slate-500 dark:text-slate-400">
            {d.label}
          </span>
        ))}
      </div>
      {/* Tabellarische Alternative für Screenreader */}
      <table className="sr-only">
        <tbody>
          {daten.map((d) => (
            <tr key={d.label}>
              <th scope="row">{d.label}</th>
              <td>
                {d.wert} {einheit}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
