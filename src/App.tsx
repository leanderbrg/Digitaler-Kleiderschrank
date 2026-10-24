import { Route, Routes } from 'react-router-dom';
import BottomNav from './components/BottomNav';
import ErsterStartHinweis from './components/ErsterStartHinweis';
import { useFarbschema } from './hooks/useFarbschema';
import GruppePage from './pages/GruppePage';
import ListePage from './pages/ListePage';
import VerschiebenPage from './pages/VerschiebenPage';
import Platzhalter from './pages/Platzhalter';
import TeilFormPage from './pages/TeilFormPage';
import UebersichtPage from './pages/UebersichtPage';
import WaeschePage from './pages/WaeschePage';

export default function App() {
  useFarbschema(); // wendet gespeichertes Farbschema an
  return (
    <>
      <main>
        <Routes>
          <Route path="/" element={<UebersichtPage />} />
          <Route path="/liste" element={<ListePage />} />
          <Route path="/neu" element={<TeilFormPage />} />
          <Route path="/teil/:id" element={<TeilFormPage />} />
          <Route path="/gruppe/:schluessel" element={<GruppePage />} />
          <Route path="/verschieben" element={<VerschiebenPage />} />
          <Route path="/waesche" element={<WaeschePage />} />
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
