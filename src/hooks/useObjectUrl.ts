import { useEffect, useRef, useState } from 'react';

/** Erzeugt eine Object-URL für einen Blob und gibt sie beim Wechsel/Unmount wieder frei. */
export function useObjectUrl(blob: Blob | undefined | null): string | undefined {
  const [url, setUrl] = useState<string>();
  useEffect(() => {
    if (!blob) {
      setUrl(undefined);
      return;
    }
    const u = URL.createObjectURL(blob);
    setUrl(u);
    return () => URL.revokeObjectURL(u);
  }, [blob]);
  return url;
}

/** true, sobald das Element (fast) im sichtbaren Bereich ist – bleibt danach true. */
export function useImSichtbereich<T extends Element>(): [React.RefObject<T>, boolean] {
  const ref = useRef<T>(null);
  const [sichtbar, setSichtbar] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || sichtbar) return;
    if (typeof IntersectionObserver === 'undefined') {
      setSichtbar(true);
      return;
    }
    const io = new IntersectionObserver(
      (eintraege) => {
        if (eintraege.some((e) => e.isIntersecting)) {
          setSichtbar(true);
          io.disconnect();
        }
      },
      { rootMargin: '200px' },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [sichtbar]);
  return [ref, sichtbar];
}
