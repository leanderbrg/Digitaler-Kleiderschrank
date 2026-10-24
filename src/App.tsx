import { Route, Routes } from 'react-router-dom';
import BottomNav from './components/BottomNav';
import ErsterStartHinweis from './components/ErsterStartHinweis';
import { useFarbschema } from './hooks/useFarbschema';
import ListePage from './pages/ListePage';
import Platzhalter from './pages/Platzhalter';
import TeilFormPage from './pages/TeilFormPage';

export default function App() {
  useFarbschema(); // wendet gespeichertes Farbschema an
  return (
    <>
      <main>
        <Routes>
          <Route path="/" element={<Platzhalter titel="Übersicht" />} />
          <Route path="/liste" element={<ListePage />} />
          <Route path="/neu" element={<TeilFormPage />} />
          <Route path="/teil/:id" element={<TeilFormPage />} />
          <Route path="/gruppe/:schluessel" element={<Platzhalter titel="Gruppe" />} />
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
