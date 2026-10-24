import { useEffect, useId, useRef, type ReactNode } from 'react';

interface Props {
  offen: boolean;
  titel: string;
  onSchliessen: () => void;
  children: ReactNode;
  /** Buttons im Fußbereich */
  fuss?: ReactNode;
}

/** Modaler Dialog auf Basis des nativen <dialog>-Elements (Fokusfalle + Esc inklusive). */
export default function Dialog({ offen, titel, onSchliessen, children, fuss }: Props) {
  const ref = useRef<HTMLDialogElement>(null);
  const titelId = useId();

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (offen && !el.open) el.showModal();
    if (!offen && el.open) el.close();
  }, [offen]);

  return (
    <dialog
      ref={ref}
      aria-labelledby={titelId}
      onCancel={(e) => {
        e.preventDefault();
        onSchliessen();
      }}
      onClick={(e) => {
        // Klick auf den Hintergrund schließt
        if (e.target === ref.current) onSchliessen();
      }}
      className="m-auto w-[min(92vw,28rem)] rounded-2xl bg-white p-0 text-slate-900 shadow-xl backdrop:bg-slate-900/50 dark:bg-slate-900 dark:text-slate-100"
    >
      {offen && (
        <div className="flex max-h-[85vh] flex-col">
          <div className="flex items-center gap-2 border-b border-slate-200 px-4 py-3 dark:border-slate-800">
            <h2 id={titelId} className="flex-1 text-lg font-semibold">
              {titel}
            </h2>
            <button
              type="button"
              aria-label="Dialog schließen"
              onClick={onSchliessen}
              className="btn-klein text-lg hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              ✕
            </button>
          </div>
          <div className="overflow-y-auto px-4 py-4">{children}</div>
          {fuss && (
            <div className="flex flex-wrap justify-end gap-2 border-t border-slate-200 px-4 py-3 dark:border-slate-800">
              {fuss}
            </div>
          )}
        </div>
      )}
    </dialog>
  );
}
