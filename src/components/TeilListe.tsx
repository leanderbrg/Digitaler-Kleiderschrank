import { useMemo, useState } from 'react';
import { statusSetzen } from '../db/repo';
import { useAuswahl } from '../hooks/useAuswahl';
import { STATUS_INFO, STATUS_LABEL, STATUS_WERTE, type Status, type Teil } from '../types';
import AussortierenDialog from './AussortierenDialog';
import TeilKarte from './TeilKarte';
import { useToast } from './Toast';
import VerschiebenDialog from './VerschiebenDialog';

interface Props {
  teile: Teil[];
  gross?: boolean;
}

type Dialogziel = { art: 'aussortieren' | 'verschieben'; ids: string[] } | null;

/** Liste von Einzelteilen mit Schnellaktionen und Mehrfachauswahl. */
export default function TeilListe({ teile, gross }: Props) {
  const ids = useMemo(() => teile.map((t) => t.id), [teile]);
  const auswahl = useAuswahl(ids);
  const [auswahlModus, setAuswahlModus] = useState(false);
  const [dialog, setDialog] = useState<Dialogziel>(null);
  const toast = useToast();

  const beenden = () => {
    setAuswahlModus(false);
    auswahl.leeren();
  };

  async function statusFuerAuswahl(status: Status) {
    const e = await statusSetzen(auswahl.ids, status);
    toast.zeige(`${e.anzahl} ${e.anzahl === 1 ? 'Teil' : 'Teile'}: ${STATUS_LABEL[status]}`, e.anzahl ? e.rueckgaengig : undefined);
    beenden();
  }

  const dialogTeile = dialog ? teile.filter((t) => dialog.ids.includes(t.id)) : [];
  const gemeinsamerStandort =
    dialogTeile.length && dialogTeile.every((t) => t.standortId === dialogTeile[0].standortId)
      ? dialogTeile[0].standortId
      : undefined;

  return (
    <>
      <div className="mb-2 flex items-center justify-end gap-2">
        {auswahlModus ? (
          <>
            <button type="button" className="btn-klein text-marke-700 hover:bg-slate-200 dark:text-teal-400 dark:hover:bg-slate-800" onClick={auswahl.alleGewaehlt ? auswahl.leeren : auswahl.alle}>
              {auswahl.alleGewaehlt ? 'Keine' : 'Alle'} auswählen
            </button>
            <button type="button" className="btn-klein hover:bg-slate-200 dark:hover:bg-slate-800" onClick={beenden}>
              Fertig
            </button>
          </>
        ) : (
          <button
            type="button"
            className="btn-klein text-marke-700 hover:bg-slate-200 dark:text-teal-400 dark:hover:bg-slate-800"
            onClick={() => setAuswahlModus(true)}
          >
            ☑️ Mehrere auswählen
          </button>
        )}
      </div>

      <ul className="space-y-2">
        {teile.map((t) => (
          <li key={t.id}>
            <TeilKarte
              teil={t}
              gross={gross}
              auswahlModus={auswahlModus}
              gewaehlt={auswahl.gewaehlt.has(t.id)}
              onUmschalten={() => auswahl.umschalten(t.id)}
              onVerschieben={() => setDialog({ art: 'verschieben', ids: [t.id] })}
              onAussortieren={() => setDialog({ art: 'aussortieren', ids: [t.id] })}
            />
          </li>
        ))}
      </ul>

      {auswahlModus && (
        <div className="fixed inset-x-0 bottom-[88px] z-30 px-4">
          <div className="karte mx-auto flex max-w-3xl flex-wrap items-center gap-2 p-2 shadow-lg">
            <span className="px-2 text-sm font-medium" aria-live="polite">
              {auswahl.anzahl} ausgewählt
            </span>
            <div className="ml-auto flex flex-wrap gap-1">
              {STATUS_WERTE.map((s) => (
                <button key={s} type="button" className="btn-sekundaer px-3" disabled={!auswahl.anzahl} onClick={() => statusFuerAuswahl(s)}>
                  <span aria-hidden="true">{STATUS_INFO[s].icon}</span> {STATUS_INFO[s].kurz}
                </button>
              ))}
              <button
                type="button"
                className="btn-sekundaer px-3"
                disabled={!auswahl.anzahl}
                onClick={() => setDialog({ art: 'verschieben', ids: auswahl.ids })}
              >
                🔀 Verschieben
              </button>
              <button
                type="button"
                className="btn-gefahr px-3"
                disabled={!auswahl.anzahl}
                onClick={() => setDialog({ art: 'aussortieren', ids: auswahl.ids })}
              >
                🗑️ Aussortieren
              </button>
            </div>
          </div>
        </div>
      )}

      <AussortierenDialog
        ids={dialog?.ids ?? []}
        offen={dialog?.art === 'aussortieren'}
        onSchliessen={() => setDialog(null)}
        onFertig={beenden}
      />
      <VerschiebenDialog
        ids={dialog?.ids ?? []}
        vonStandortId={gemeinsamerStandort}
        offen={dialog?.art === 'verschieben'}
        onSchliessen={() => setDialog(null)}
        onFertig={beenden}
      />
    </>
  );
}
