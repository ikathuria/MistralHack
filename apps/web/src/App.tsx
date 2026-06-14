import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import { useAuthStore } from './store/authStore';
import Globe from './components/Globe';
import CountryPanel from './components/CountryPanel';
import WorldDashboard from './pages/WorldDashboard';
import GamePage from './pages/GamePage';

function GlobeHUD() {
  return (
    <div style={{
      position: 'absolute', top: 0, left: 0, right: 0, zIndex: 20,
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '16px 20px',
      pointerEvents: 'none',
    }}>
      {/* Logo */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10,
        pointerEvents: 'auto',
      }}>
        <div style={{
          width: 32, height: 32, borderRadius: 8,
          background: 'linear-gradient(135deg, #6366f1 0%, #a78bfa 100%)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 16, boxShadow: '0 0 16px rgba(99,102,241,0.5)',
        }}>
          🌍
        </div>
        <div>
          <div style={{ fontSize: 15, fontWeight: 800, letterSpacing: -0.4, color: '#f1f5f9' }}>
            RealityShift
          </div>
          <div style={{ fontSize: 10, color: '#6b7280', letterSpacing: 0.5, textTransform: 'uppercase' }}>
            Alternate History Simulator
          </div>
        </div>
      </div>

      {/* Nav links */}
      <div style={{
        display: 'flex', gap: 8, alignItems: 'center',
        pointerEvents: 'auto',
      }}>
        <Link
          to="/world"
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            padding: '7px 14px', borderRadius: 8,
            background: 'rgba(10,10,25,0.75)', backdropFilter: 'blur(10px)',
            border: '1px solid rgba(255,255,255,0.12)',
            color: '#d1d5db', fontSize: 12, fontWeight: 600,
            textDecoration: 'none',
            transition: 'border-color 0.2s, color 0.2s',
          }}
          onMouseEnter={e => {
            (e.currentTarget as HTMLAnchorElement).style.borderColor = 'rgba(255,255,255,0.25)';
            (e.currentTarget as HTMLAnchorElement).style.color = '#fff';
          }}
          onMouseLeave={e => {
            (e.currentTarget as HTMLAnchorElement).style.borderColor = 'rgba(255,255,255,0.12)';
            (e.currentTarget as HTMLAnchorElement).style.color = '#d1d5db';
          }}
        >
          <span style={{ opacity: 0.7 }}>📊</span> World Dashboard
        </Link>
      </div>
    </div>
  );
}

function GlobePage() {
  return (
    <div style={{ position: 'relative', width: '100%', height: '100vh' }}>
      <Globe />
      <GlobeHUD />
      <CountryPanel />
    </div>
  );
}

export default function App() {
  const { init } = useAuthStore();

  useEffect(() => {
    const unsubscribe = init();
    return unsubscribe;
  }, []);

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<GlobePage />} />
        <Route path="/world" element={<WorldDashboard />} />
        <Route path="/play/:worldId" element={<GamePage />} />
      </Routes>
    </BrowserRouter>
  );
}
