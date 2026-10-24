import { Route, Routes } from 'react-router-dom';
import BottomNav from './components/BottomNav';
import ErsterStartHinweis from './components/ErsterStartHinweis';
import { useFarbschema } from './hooks/useFarbschema';
import Platzhalter from './pages/Platzhalter';

export default function App() {
  useFarbschema(); // wendet gespeichertes Farbschema an
  return (
    <>
      <main>
        <Routes>
          <Route path="/" element={<Platzhalter titel="Übersicht" />} />
          <Route path="/liste" element={<Platzhalter titel="Liste" />} />
          <Route path="/neu" element={<Platzhalter titel="Teil hinzufügen" />} />
          <Route path="/waesche" element={<Platzhalter titel="Wäsche" />} />
          <Route path="/verlauf" element={<Platzhalter titel="Verlauf" />} />
          <Route path="/einstellungen" element={<Platzhalter titel="Einstellungen" />} />
          <Route path="*" element={<Platzhalter titel="Seite nicht gefunden" />} />
        </Routes>
      </main>
      <BottomNav />
      <ErsterStartHinweis />
    </>
  );
}
