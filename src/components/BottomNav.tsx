import { NavLink } from 'react-router-dom';

const EINTRAEGE = [
  { to: '/', label: 'Übersicht', icon: '🏠', end: true },
  { to: '/liste', label: 'Liste', icon: '📋' },
  null, // Platz für den "+"-Button
  { to: '/waesche', label: 'Wäsche', icon: '🧺' },
  { to: '/verlauf', label: 'Verlauf', icon: '📈' },
  { to: '/einstellungen', label: 'Einstellungen', icon: '⚙️' },
];

export default function BottomNav() {
  return (
    <nav
      aria-label="Hauptnavigation"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur dark:border-slate-800 dark:bg-slate-900/95"
    >
      <ul className="mx-auto flex max-w-3xl items-end justify-around px-1">
        {EINTRAEGE.map((e, i) =>
          e === null ? (
            <li key="plus" className="-mt-6">
              <NavLink
                to="/neu"
                aria-label="Teil hinzufügen"
                className="flex h-16 w-16 items-center justify-center rounded-full bg-marke-700 text-4xl font-light text-white shadow-lg ring-4 ring-slate-50 hover:bg-marke-800 dark:ring-slate-950"
              >
                <span aria-hidden="true" className="-mt-1">+</span>
              </NavLink>
            </li>
          ) : (
            <li key={i} className="flex-1">
              <NavLink
                to={e.to}
                end={e.end}
                className={({ isActive }) =>
                  `flex min-h-[56px] flex-col items-center justify-center gap-0.5 rounded-lg text-[11px] font-medium ${
                    isActive
                      ? 'text-marke-700 dark:text-teal-400'
                      : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100'
                  }`
                }
              >
                <span aria-hidden="true" className="text-xl leading-none">
                  {e.icon}
                </span>
                <span className="max-w-full truncate px-0.5">{e.label}</span>
              </NavLink>
            </li>
          ),
        )}
      </ul>
    </nav>
  );
}
