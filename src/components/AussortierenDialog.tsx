import { useEffect, useState } from 'react';
import { aussortieren } from '../db/repo';
import { AUSSORTIER_GRUENDE } from '../types';
import Dialog from './Dialog';
import { useToast } from './Toast';

interface Props {
  ids: string[];
  offen: boolean;
  onSchliessen: () => void;
  onFertig?: () => void;
}

export default function AussortierenDialog({ ids, offen, onSchliessen, onFertig }: Props) {
  const [grund, setGrund] = useState<string>(AUSSORTIER_GRUENDE[0]);
  const toast = useToast();

  useEffect(() => {
    if (offen) setGrund(AUSSORTIER_GRUENDE[0]);
  }, [offen]);

  async function bestaetigen() {
    const e = await aussortieren(ids, grund);
    onSchliessen();
    onFertig?.();
    toast.zeige(e.anzahl === 1 ? 'Teil aussortiert' : `${e.anzahl} Teile aussortiert`, e.rueckgaengig);
  }

  return (
    <Dialog
      offen={offen}
      titel={ids.length === 1 ? 'Teil aussortieren' : `${ids.length} Teile aussortieren`}
      onSchliessen={onSchliessen}
      fuss={
        <>
          <button type="button" className="btn-sekundaer" onClick={onSchliessen}>
            Abbrechen
          </button>
          <button type="button" className="btn-gefahr" onClick={bestaetigen}>
            Aussortieren
          </button>
        </>
      }
    >
      <fieldset>
        <legend className="label">Grund</legend>
        <div className="space-y-2">
          {AUSSORTIER_GRUENDE.map((g) => (
            <label
              key={g}
              className="flex min-h-[44px] cursor-pointer items-center gap-3 rounded-xl border border-slate-200 px-3 has-[:checked]:border-marke-700 has-[:checked]:bg-marke-50 dark:border-slate-700 dark:has-[:checked]:bg-teal-900/30"
            >
              <input
                type="radio"
                name="grund"
                value={g}
                checked={grund === g}
                onChange={() => setGrund(g)}
                className="h-5 w-5 accent-marke-700"
              />
              <span>{g}</span>
            </label>
          ))}
        </div>
      </fieldset>
      <p className="mt-3 text-sm text-slate-600 dark:text-slate-400">
        Aussortierte Teile zählen nicht mehr zum Bestand. Du findest sie im Verlauf unter „Papierkorb“ und kannst sie
        dort wiederherstellen.
      </p>
    </Dialog>
  );
}
