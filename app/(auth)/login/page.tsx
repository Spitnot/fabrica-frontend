'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff } from 'lucide-react';
import { supabaseClient } from '@/lib/supabase/client';

export default function LoginPage() {
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [showPwd, setShowPwd]   = useState(false);
  const [error, setError]       = useState('');
  const [loading, setLoading]   = useState(false);
  const router = useRouter();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('error') === 'invalid_link') {
      setError('This setup link has expired. Ask an admin to generate a new one.');
    }
  }, []);

  async function handleLogin() {
    setError(''); setLoading(true);
    const { data, error: authError } = await supabaseClient.auth.signInWithPassword({ email, password });
    if (authError || !data.user) {
      setError('Incorrect credentials. Please check your email and password.');
      setLoading(false); return;
    }
    const role = data.user.user_metadata?.role as string | undefined;
    if (!role) { setError('This user has no role assigned. Contact the administrator.'); setLoading(false); return; }
    if (role === 'admin' || role === 'manager' || role === 'viewer') router.push('/dashboard');
    else if (role === 'customer') router.push('/portal');
    else { setError(`Unknown role: ${role}. Contact the administrator.`); setLoading(false); return; }
    router.refresh();
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', background: '#D93A35' }}>
      {/* LEFT — brand panel */}
      <div style={{ width: '50%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 48 }}
           className="fr-login-left">
        <img src="/FR_ICON_W.svg" alt="Firma Rollers" style={{ width: 96, height: 'auto', marginBottom: 24 }} />
        <div style={{ color: '#fff', fontFamily: 'var(--font-sans)', fontSize: 11, fontWeight: 900, letterSpacing: '0.4em', textTransform: 'uppercase', opacity: 0.8, marginBottom: 4 }}>
          FIRMA ROLLERS
        </div>
        <div style={{ color: '#fff', fontFamily: 'var(--font-sans)', fontWeight: 900, fontSize: 48, letterSpacing: '0.2em' }}>B2B</div>
        <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: 11, letterSpacing: '0.2em', textTransform: 'uppercase', marginTop: 16 }}>Management Platform</div>
      </div>

      {/* RIGHT — form */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#fff', padding: 32 }}>
        <div style={{ width: '100%', maxWidth: 360 }}>
          <div className="fr-login-mobile" style={{ display: 'none', textAlign: 'center', marginBottom: 32 }}>
            <img src="/FR_ICON_B.svg" alt="Firma Rollers" style={{ width: 64, height: 'auto', margin: '0 auto 12px' }} />
            <div style={{ fontFamily: 'var(--font-sans)', fontWeight: 900, fontSize: 24, letterSpacing: '0.2em' }}>B2B</div>
          </div>
          <style>{`@media(max-width:767px){.fr-login-left{display:none!important}.fr-login-mobile{display:block!important}}`}</style>

          <h2 style={{ fontFamily: 'var(--font-sans)', fontWeight: 900, fontSize: 24, letterSpacing: '0.05em', color: '#111', marginBottom: 4 }}>Sign In</h2>
          <p style={{ fontSize: 13, color: '#111', marginBottom: 32 }}>Internal panel · Administrators only</p>

          {error && (
            <div style={{ marginBottom: 20, padding: '10px 14px', border: '1px solid #D93A35', fontFamily: 'var(--font-mono)', fontSize: 11, color: '#D93A35' }}>
              {error}
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label className="fr-label">Email</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleLogin()}
                placeholder="admin@firmarollers.com" />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label className="fr-label">Password</label>
              <div style={{ position: 'relative' }}>
                <input type={showPwd ? 'text' : 'password'} value={password}
                  onChange={e => setPassword(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleLogin()}
                  placeholder="••••••••" style={{ paddingRight: 40 }} />
                <button type="button" onClick={() => setShowPwd(v => !v)}
                  style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'transparent', border: 'none', boxShadow: 'none', padding: 4, color: '#111', minHeight: 'auto' }}
                  aria-label={showPwd ? 'Hide password' : 'Show password'}>
                  {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <a href="/forgot-password" className="fr-label" style={{ color: '#111', textDecoration: 'none' }}>Forgot password?</a>
            </div>

            <button onClick={handleLogin} disabled={loading || !email || !password} className="btn-primary"
              style={{ width: '100%', justifyContent: 'center', padding: '12px 16px' }}>
              {loading ? 'Signing in…' : 'Sign In'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
