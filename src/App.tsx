import { Route, Routes } from 'react-router-dom';
import BottomNav from './components/BottomNav';
import ErsterStartHinweis from './components/ErsterStartHinweis';
import LeerZustand from './components/LeerZustand';
import Seite from './components/Seite';
import { useFarbschema } from './hooks/useFarbschema';
import EinstellungenPage from './pages/EinstellungenPage';
import GruppePage from './pages/GruppePage';
import ListePage from './pages/ListePage';
import TeilFormPage from './pages/TeilFormPage';
import UebersichtPage from './pages/UebersichtPage';
import VerlaufPage from './pages/VerlaufPage';
import VerschiebenPage from './pages/VerschiebenPage';
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
          <Route path="/verlauf" element={<VerlaufPage />} />
          <Route path="/einstellungen" element={<EinstellungenPage />} />
          <Route
            path="*"
            element={
              <Seite titel="Nicht gefunden">
                <LeerZustand emoji="🧭" titel="Diese Seite gibt es nicht" />
              </Seite>
            }
          />
        </Routes>
      </main>
      <BottomNav />
      <ErsterStartHinweis />
    </>
  );
}
