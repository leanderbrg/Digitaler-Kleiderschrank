import { useImSichtbereich, useObjectUrl } from '../hooks/useObjectUrl';

interface Props {
  blob?: Blob;
  alt: string;
  /** Platzhalter, wenn kein Foto vorhanden ist */
  emoji?: string;
  className?: string;
}

/**
 * Foto mit Lazy Loading: Die Object-URL wird erst erzeugt, wenn das Bild in die
 * Nähe des sichtbaren Bereichs kommt, und beim Unmount wieder freigegeben.
 */
export default function TeilFoto({ blob, alt, emoji = '👕', className = 'h-16 w-16' }: Props) {
  const [ref, sichtbar] = useImSichtbereich<HTMLDivElement>();
  const url = useObjectUrl(sichtbar ? blob : undefined);
  return (
    <div
      ref={ref}
      className={`flex shrink-0 items-center justify-center overflow-hidden rounded-xl bg-slate-100 dark:bg-slate-800 ${className}`}
    >
      {blob ? (
        url && <img src={url} alt={alt} loading="lazy" decoding="async" className="h-full w-full object-cover" />
      ) : (
        <span aria-hidden="true" className="text-[2em] opacity-70">
          {emoji}
        </span>
      )}
    </div>
  );
}
