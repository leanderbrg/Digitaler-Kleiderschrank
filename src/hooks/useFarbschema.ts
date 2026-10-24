import { useCallback, useEffect, useState } from 'react';

export type Farbschema = 'system' | 'hell' | 'dunkel';
const KEY = 'farbschema';

function lesen(): Farbschema {
  try {
    const v = localStorage.getItem(KEY);
    if (v === 'hell' || v === 'dunkel' || v === 'system') return v;
  } catch {
    /* Speicher nicht verfügbar */
  }
  return 'system';
}

function anwenden(schema: Farbschema) {
  const dunkel =
    schema === 'dunkel' || (schema === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
  document.documentElement.classList.toggle('dark', dunkel);
}

/** Dark-Mode-Einstellung; gespeichert in localStorage, damit sie vor dem ersten Rendern greift. */
export function useFarbschema(): [Farbschema, (s: Farbschema) => void] {
  const [schema, setSchema] = useState<Farbschema>(lesen);

  useEffect(() => {
    anwenden(schema);
    if (schema !== 'system') return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = () => anwenden('system');
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, [schema]);

  const setzen = useCallback((s: Farbschema) => {
    try {
      localStorage.setItem(KEY, s);
    } catch {
      /* ignorieren */
    }
    setSchema(s);
  }, []);

  return [schema, setzen];
}
