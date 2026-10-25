/** Kleines Badge an vorausgefüllten Feldern; verschwindet, sobald das Feld bearbeitet wird. */
export default function KiBadge({ sichtbar }: { sichtbar: boolean }) {
  if (!sichtbar) return null;
  return (
    <span className="ml-2 inline-flex items-center rounded-full bg-violet-100 px-2 py-0.5 text-xs font-medium text-violet-900 dark:bg-violet-900/50 dark:text-violet-200">
      ✨ Vorschlag der KI
    </span>
  );
}
