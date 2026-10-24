import { setzeEinstellung, useEinstellung } from '../hooks/useDaten';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/db';
import Dialog from './Dialog';

/** Einmaliger Hinweis beim ersten Start: Daten liegen nur lokal. */
export default function ErsterStartHinweis() {
  const gesehen = useEinstellung<boolean>('hinweisGesehen');
  // Erst entscheiden, wenn die DB geantwortet hat (sonst blitzt der Dialog kurz auf)
  const geladen = useLiveQuery(() => db.einstellungen.count().then(() => true), []);
  const offen = geladen === true && !gesehen;

  const schliessen = () => {
    // Browser bitten, die Daten nicht bei Speicherknappheit automatisch zu löschen
    navigator.storage?.persist?.().catch(() => {});
    return setzeEinstellung('hinweisGesehen', true);
  };

  return (
    <Dialog
      offen={offen}
      titel="Willkommen! 👋"
      onSchliessen={schliessen}
      fuss={
        <button type="button" className="btn-primaer" onClick={schliessen}>
          Verstanden
        </button>
      }
    >
      <div className="space-y-3 text-sm leading-relaxed">
        <p>
          Deine Kleidungsstücke und Fotos werden <strong>nur lokal auf diesem Gerät</strong> im Browser gespeichert. Es
          gibt keinen Server und kein Konto.
        </p>
        <p>
          Wenn du Browserdaten löschst oder das Gerät wechselst, sind die Daten weg. Erstelle deshalb regelmäßig unter{' '}
          <strong>Einstellungen → Export</strong> eine Sicherung.
        </p>
        <p>Tipp: Über „Zum Startbildschirm hinzufügen“ installierst du die App und nutzt sie auch offline.</p>
      </div>
    </Dialog>
  );
}
