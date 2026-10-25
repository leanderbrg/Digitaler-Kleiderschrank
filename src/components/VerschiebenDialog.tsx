import { useEffect, useState } from 'react';
import { verschieben } from '../db/repo';
import { useNachschlagen } from '../hooks/useNachschlagen';
import type { Status } from '../types';
import Dialog from './Dialog';
import Segment from './Segment';
import { StatusWahl } from './Status';
import { useToast } from './Toast';

interface Props {
  ids: string[];
  /** Aktueller Standort (wenn alle Teile am selben Ort sind) – wird als Ziel vorausgewählt übersprungen */
  vonStandortId?: string;
  offen: boolean;
  onSchliessen: () => void;
  onFertig?: () => void;
}

export default function VerschiebenDialog({ ids, vonStandortId, offen, onSchliessen, onFertig }: Props) {
  const { standorte, standortName } = useNachschlagen();
  const [ziel, setZiel] = useState('');
  const [status, setStatus] = useState<Status | undefined>();
  const toast = useToast();

  useEffect(() => {
    if (!offen) return;
    setZiel(standorte.find((s) => s.id !== vonStandortId)?.id ?? standorte[0]?.id ?? '');
    setStatus(undefined);
  }, [offen, standorte, vonStandortId]);

  async function bestaetigen() {
    const e = await verschieben(ids, ziel, status);
    onSchliessen();
    onFertig?.();
    toast.zeige(
      e.anzahl === 0
        ? 'Keine Änderung – Teile sind bereits dort.'
        : `${e.anzahl === 1 ? '1 Teil' : `${e.anzahl} Teile`} nach ${standortName(ziel)} verschoben`,
      e.anzahl ? e.rueckgaengig : undefined,
    );
  }

  return (
    <Dialog
      offen={offen}
      titel={ids.length === 1 ? 'Teil verschieben' : `${ids.length} Teile verschieben`}
      onSchliessen={onSchliessen}
      fuss={
        <>
          <button type="button" className="btn-sekundaer" onClick={onSchliessen}>
            Abbrechen
          </button>
          <button type="button" className="btn-primaer" onClick={bestaetigen} disabled={!ziel}>
            Verschieben
          </button>
        </>
      }
    >
      <div className="space-y-4">
        <Segment
          label="Nach"
          optionen={standorte.map((s) => ({ wert: s.id, label: s.name + (s.id === vonStandortId ? ' (aktuell)' : '') }))}
          wert={ziel}
          onChange={setZiel}
        />
        <StatusWahl label="Status dabei setzen" wert={status} onChange={setStatus} mitUnveraendert />
      </div>
    </Dialog>
  );
}
