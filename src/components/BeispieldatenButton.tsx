import { useLiveQuery } from 'dexie-react-hooks';
import { useState } from 'react';
import { beispieldatenEntfernen, beispieldatenLaden } from '../db/beispieldaten';
import { db } from '../db/db';
import { useToast } from './Toast';

/** Lädt bzw. entfernt Beispieldaten – je nachdem, ob schon welche vorhanden sind. */
export default function BeispieldatenButton() {
  const anzahl = useLiveQuery(() => db.teile.filter((t) => !!t.beispiel).count(), []);
  const [laeuft, setLaeuft] = useState(false);
  const toast = useToast();
  if (anzahl === undefined) return null;

  async function klick() {
    setLaeuft(true);
    try {
      if (anzahl) {
        const n = await beispieldatenEntfernen();
        toast.zeige(`${n} Beispielteile entfernt`);
      } else {
        const n = await beispieldatenLaden();
        toast.zeige(`${n} Beispielteile geladen`);
      }
    } finally {
      setLaeuft(false);
    }
  }

  return (
    <button type="button" className="btn-sekundaer" onClick={klick} disabled={laeuft}>
      {anzahl ? `🧹 Beispieldaten entfernen (${anzahl})` : '✨ Beispieldaten laden'}
    </button>
  );
}
