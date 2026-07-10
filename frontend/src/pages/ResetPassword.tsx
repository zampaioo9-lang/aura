import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import LandingHeader from '../components/landing/LandingHeader';
import SiteFooter from '../components/landing/SiteFooter';

const inp: React.CSSProperties = {
  width: '100%', padding: '11px 14px',
  background: 'rgba(255,255,255,0.05)',
  border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: 10, color: '#fff',
  fontSize: 14, fontFamily: 'inherit', outline: 'none',
  transition: 'border-color 0.2s',
};

export default function ResetPassword() {
  const { resetPassword } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') ?? '';

  const [newPassword, setNewPassword]         = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPwd, setShowPwd]                 = useState(false);
  const [error, setError]                     = useState('');
  const [invalidToken, setInvalidToken]        = useState(false);
  const [loading, setLoading]                  = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setInvalidToken(false);

    if (!token) {
      setError('Este enlace no es válido. Solicita uno nuevo.');
      setInvalidToken(true);
      return;
    }
    if (newPassword.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Las contraseñas no coinciden.');
      return;
    }

    setLoading(true);
    try {
      await resetPassword(token, newPassword);
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.error || 'No se pudo restablecer la contraseña.');
      setInvalidToken(err.response?.data?.code === 'INVALID_RESET_TOKEN');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh', background: 'linear-gradient(135deg, #1a1040 0%, #0e2633 50%, #0a1a1a 100%)', color: '#fff',
      fontFamily: "'Inter', system-ui, sans-serif",
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '24px 16px', position: 'relative', overflow: 'hidden',
    }}>
      <LandingHeader />
      <div style={{
        position: 'absolute', top: '-15%', left: '50%', transform: 'translateX(-50%)',
        width: 600, height: 500,
        background: 'radial-gradient(ellipse, rgba(45,212,191,0.10) 0%, transparent 65%)',
        pointerEvents: 'none',
      }} />

      <div style={{ position: 'relative', zIndex: 10, width: '100%', maxWidth: 420 }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <Link to="/" style={{ display: 'inline-flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
            <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#9b87f5', boxShadow: '0 0 10px rgba(155,135,245,0.9)' }} />
            <span style={{ fontSize: 20, fontWeight: 700, color: '#fff', letterSpacing: '-0.02em' }}>Aliax</span>
          </Link>
        </div>

        <div style={{
          background: 'rgba(255,255,255,0.03)',
          border: '1px solid rgba(45,212,191,0.15)',
          borderRadius: 20, padding: '36px 32px',
          backdropFilter: 'blur(20px)',
          boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.06)',
        }}>
          <h2 style={{ fontSize: 20, fontWeight: 700, margin: '0 0 6px' }}>Elige tu nueva contraseña</h2>
          <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', margin: '0 0 28px' }}>
            Escribe y confirma tu nueva contraseña
          </p>

          {error && (
            <div style={{
              marginBottom: 20, padding: '10px 14px',
              background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)',
              borderRadius: 10, fontSize: 13, color: 'rgba(248,113,113,0.9)',
            }}>
              {error}
              {invalidToken && (
                <>
                  {' '}
                  <Link to="/forgot-password" style={{ color: '#2dd4bf', fontWeight: 600 }}>
                    Solicitar un enlace nuevo
                  </Link>
                </>
              )}
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: 'rgba(255,255,255,0.6)', marginBottom: 6 }}>
                Nueva contraseña
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPwd ? 'text' : 'password'} value={newPassword}
                  onChange={e => setNewPassword(e.target.value)} required minLength={6}
                  style={{ ...inp, paddingRight: 40 }}
                  onFocus={e => (e.currentTarget.style.borderColor = 'rgba(45,212,191,0.5)')}
                  onBlur={e => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)')}
                />
                <button type="button" tabIndex={-1} onClick={() => setShowPwd(v => !v)}
                  style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', padding: 0, display: 'flex' }}>
                  {showPwd ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: 'rgba(255,255,255,0.6)', marginBottom: 6 }}>
                Confirmar contraseña
              </label>
              <input
                type={showPwd ? 'text' : 'password'} value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)} required minLength={6}
                style={inp}
                onFocus={e => (e.currentTarget.style.borderColor = 'rgba(45,212,191,0.5)')}
                onBlur={e => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)')}
              />
            </div>

            <button type="submit" disabled={loading} style={{
              marginTop: 4, width: '100%', padding: '13px',
              background: 'linear-gradient(135deg, #2dd4bf, #0d9488)',
              color: '#fff', fontSize: 14, fontWeight: 600,
              border: 'none', borderRadius: 10, cursor: 'pointer',
              fontFamily: 'inherit', opacity: loading ? 0.6 : 1,
            }}>
              {loading ? 'Guardando...' : 'Restablecer contraseña'}
            </button>
          </form>
        </div>
      </div>

      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0 }}>
        <SiteFooter />
      </div>
    </div>
  );
}
