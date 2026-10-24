import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';

interface ToastDaten {
  id: number;
  text: string;
  rueckgaengig?: () => void | Promise<void>;
}

interface ToastApi {
  zeige: (text: string, rueckgaengig?: () => void | Promise<void>) => void;
}

const ToastContext = createContext<ToastApi>({ zeige: () => {} });

export function useToast(): ToastApi {
  return useContext(ToastContext);
}

const DAUER_MS = 6000;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<ToastDaten | null>(null);
  const timer = useRef<number>();

  const schliessen = useCallback(() => {
    window.clearTimeout(timer.current);
    setToast(null);
  }, []);

  const zeige = useCallback<ToastApi['zeige']>((text, rueckgaengig) => {
    window.clearTimeout(timer.current);
    setToast({ id: Date.now(), text, rueckgaengig });
    timer.current = window.setTimeout(() => setToast(null), DAUER_MS);
  }, []);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  return (
    <ToastContext.Provider value={{ zeige }}>
      {children}
      <div
        aria-live="polite"
        className="pointer-events-none fixed inset-x-0 bottom-24 z-50 flex justify-center px-4"
      >
        {toast && (
          <div
            key={toast.id}
            role="status"
            className="pointer-events-auto flex w-full max-w-md items-center gap-3 rounded-xl bg-slate-900 px-4 py-3 text-sm text-white shadow-lg dark:bg-slate-100 dark:text-slate-900"
          >
            <span className="flex-1">{toast.text}</span>
            {toast.rueckgaengig && (
              <button
                type="button"
                className="btn-klein font-semibold text-teal-300 hover:bg-white/10 dark:text-marke-700 dark:hover:bg-black/5"
                onClick={async () => {
                  const fn = toast.rueckgaengig;
                  schliessen();
                  await fn?.();
                }}
              >
                Rückgängig
              </button>
            )}
            <button
              type="button"
              aria-label="Hinweis schließen"
              className="btn-klein hover:bg-white/10 dark:hover:bg-black/5"
              onClick={schliessen}
            >
              ✕
            </button>
          </div>
        )}
      </div>
    </ToastContext.Provider>
  );
}
