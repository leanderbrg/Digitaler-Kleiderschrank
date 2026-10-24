import Seite from '../components/Seite';

export default function Platzhalter({ titel }: { titel: string }) {
  return (
    <Seite titel={titel}>
      <p className="text-slate-600 dark:text-slate-400">Kommt bald.</p>
    </Seite>
  );
}
