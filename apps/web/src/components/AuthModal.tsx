import { useState } from 'react';
import { useAuthStore } from '../store/authStore';

interface Props {
  onSuccess: () => void;
  onClose: () => void;
}

export default function AuthModal({ onSuccess, onClose }: Props) {
  const { signIn, signUp } = useAuthStore();
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [signupDone, setSignupDone] = useState(false);

  const submit = async () => {
    if (!email || !password) { setError('Email and password required'); return; }
    setLoading(true);
    setError(null);
    const err = mode === 'signin'
      ? await signIn(email, password)
      : await signUp(email, password);
    setLoading(false);
    if (err) { setError(err); return; }
    if (mode === 'signup') { setSignupDone(true); return; }
    onSuccess();
  };

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(4px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}
      className="fade-in"
    >
      <div
        onClick={e => e.stopPropagation()}
        className="fade-up"
        style={{
          width: 380, background: 'rgba(12,12,28,0.97)',
          border: '1px solid rgba(255,255,255,0.12)',
          borderRadius: 16, padding: 30, color: '#fff',
          boxShadow: '0 24px 80px rgba(0,0,0,0.6), 0 0 0 1px rgba(99,102,241,0.1)',
          position: 'relative', overflow: 'hidden',
        }}
      >
        {/* Subtle top accent */}
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, height: 2,
          background: 'linear-gradient(90deg, #6366f1, #a78bfa, transparent)',
        }} />

        {/* Logo mark */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
          <div style={{
            width: 36, height: 36, borderRadius: 9,
            background: 'linear-gradient(135deg, #6366f1, #a78bfa)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 18, boxShadow: '0 0 16px rgba(99,102,241,0.4)',
          }}>🌍</div>
          <div>
            <div style={{ fontSize: 15, fontWeight: 800, letterSpacing: -0.3 }}>RealityShift</div>
            <div style={{ fontSize: 11, color: '#4b5563' }}>Alternate History Simulator</div>
          </div>
        </div>

        <div style={{ fontSize: 20, fontWeight: 800, marginBottom: 4 }}>
          {mode === 'signin' ? 'Welcome back' : 'Create account'}
        </div>
        <div style={{ color: '#6b7280', fontSize: 13, marginBottom: 22 }}>
          {mode === 'signin'
            ? 'Sign in to take over a country and fork the simulation.'
            : 'Create an account to start your own parallel universe.'}
        </div>

        {signupDone ? (
          <div style={{ textAlign: 'center', padding: '20px 0' }} className="fade-up">
            <div style={{ fontSize: 36, marginBottom: 12 }}>📧</div>
            <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 8 }}>Check your email</div>
            <div style={{ color: '#9ca3af', fontSize: 13, lineHeight: 1.6 }}>
              Confirmation link sent to <strong style={{ color: '#e5e7eb' }}>{email}</strong>.
              Confirm it then sign in.
            </div>
            <button
              onClick={() => { setSignupDone(false); setMode('signin'); }}
              className="btn-secondary"
              style={{ marginTop: 20, width: 'auto', padding: '8px 24px' }}
            >
              Back to Sign In
            </button>
          </div>
        ) : (
          <>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 16 }}>
              <input
                type="email"
                placeholder="email@example.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && submit()}
                style={{
                  width: '100%', padding: '11px 14px', borderRadius: 9,
                  border: '1px solid rgba(255,255,255,0.12)',
                  background: 'rgba(255,255,255,0.05)', color: '#fff',
                  fontSize: 14, boxSizing: 'border-box',
                }}
              />
              <input
                type="password"
                placeholder="Password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && submit()}
                style={{
                  width: '100%', padding: '11px 14px', borderRadius: 9,
                  border: '1px solid rgba(255,255,255,0.12)',
                  background: 'rgba(255,255,255,0.05)', color: '#fff',
                  fontSize: 14, boxSizing: 'border-box',
                }}
              />
            </div>

            {error && (
              <div style={{
                color: '#f87171', fontSize: 12, marginBottom: 14,
                background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.2)',
                padding: '9px 12px', borderRadius: 7,
              }} className="fade-up">
                {error}
              </div>
            )}

            <button
              onClick={submit}
              disabled={loading}
              style={{
                width: '100%', padding: '13px 0', borderRadius: 10, border: 'none',
                background: loading
                  ? 'rgba(255,255,255,0.08)'
                  : 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                color: '#fff', fontSize: 14, fontWeight: 700,
                cursor: loading ? 'default' : 'pointer',
                letterSpacing: 0.2,
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                transition: 'filter 0.2s, box-shadow 0.2s',
                boxShadow: loading ? 'none' : '0 4px 16px rgba(99,102,241,0.35)',
              }}
              onMouseEnter={e => { if (!loading) (e.currentTarget as HTMLButtonElement).style.filter = 'brightness(1.12)'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.filter = 'none'; }}
            >
              {loading ? (
                <><span className="spin">⟳</span> Please wait…</>
              ) : (
                mode === 'signin' ? 'Sign In' : 'Create Account'
              )}
            </button>

            <div style={{ textAlign: 'center', marginTop: 16, fontSize: 13, color: '#6b7280' }}>
              {mode === 'signin' ? (
                <>No account?{' '}
                  <button
                    onClick={() => { setMode('signup'); setError(null); }}
                    style={{
                      background: 'none', border: 'none', color: '#a78bfa',
                      cursor: 'pointer', fontSize: 13, fontWeight: 600,
                    }}
                  >
                    Sign up
                  </button>
                </>
              ) : (
                <>Already have one?{' '}
                  <button
                    onClick={() => { setMode('signin'); setError(null); }}
                    style={{
                      background: 'none', border: 'none', color: '#a78bfa',
                      cursor: 'pointer', fontSize: 13, fontWeight: 600,
                    }}
                  >
                    Sign in
                  </button>
                </>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
