import { useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { useAuthStore } from './store/authStore';
import Globe from './components/Globe';
import CountryPanel from './components/CountryPanel';
import AppHeader from './components/AppHeader';
import WorldDashboard from './pages/WorldDashboard';
import GamePage from './pages/GamePage';

function GlobePage() {
  return (
    <div style={{ position: 'relative', width: '100%', height: '100vh' }}>
      <Globe />
      <AppHeader />
      <CountryPanel />
    </div>
  );
}

export default function App() {
  const { init } = useAuthStore();

  // Subscribe to Supabase auth state once on mount
  useEffect(() => {
    const unsubscribe = init();
    return unsubscribe;
  }, []);

  return (
    // basename tracks Vite's base so routes resolve both at '/' in dev and
    // under the '/RealityShift/' subpath GitHub Pages serves from.
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <Routes>
        <Route path="/" element={<GlobePage />} />
        <Route path="/world" element={<WorldDashboard />} />
        <Route path="/play/:worldId" element={<GamePage />} />
      </Routes>
    </BrowserRouter>
  );
}
