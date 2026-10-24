import { useCallback, useMemo, useState } from 'react';

/** Mehrfachauswahl per ID. Nicht mehr vorhandene IDs werden automatisch ignoriert. */
export function useAuswahl(verfuegbar: string[]) {
  const [roh, setRoh] = useState<Set<string>>(new Set());

  const gewaehlt = useMemo(() => {
    const v = new Set(verfuegbar);
    return new Set([...roh].filter((id) => v.has(id)));
  }, [roh, verfuegbar]);

  const umschalten = useCallback((id: string) => {
    setRoh((alt) => {
      const neu = new Set(alt);
      if (neu.has(id)) neu.delete(id);
      else neu.add(id);
      return neu;
    });
  }, []);

  const setze = useCallback((ids: string[]) => setRoh(new Set(ids)), []);
  const leeren = useCallback(() => setRoh(new Set()), []);

  return {
    gewaehlt,
    ids: [...gewaehlt],
    anzahl: gewaehlt.size,
    alleGewaehlt: verfuegbar.length > 0 && gewaehlt.size === verfuegbar.length,
    umschalten,
    setze,
    leeren,
    alle: () => setRoh(new Set(verfuegbar)),
  };
}
