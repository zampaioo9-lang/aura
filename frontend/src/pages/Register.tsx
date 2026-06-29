import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Eye, EyeOff } from 'lucide-react';
import PhoneInput from '../components/PhoneInput';
import CustomSelect from '../components/CustomSelect';
import SiteFooter from '../components/landing/SiteFooter';

const PROFESSIONS = [
  'Psicólogo/a',
  'Psicoterapeuta',
  'Terapeuta de pareja',
  'Terapeuta familiar',
  'Psiquiatra',
  'Neuropsicólogo/a',
  'Trabajador/a Social',
];

const PROFESSION_OPTIONS = PROFESSIONS.map(p => ({ value: p, label: p }));

const inp: React.CSSProperties = {
  width: '100%', padding: '11px 14px',
  background: 'rgba(255,255,255,0.05)',
  border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: 10, color: '#fff',
  fontSize: 14, fontFamily: 'inherit', outline: 'none',
  transition: 'border-color 0.2s',
};

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [name, setName]         = useState('');
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone]       = useState('');
  const [profession, setProfession] = useState('');
  const [cedula, setCedula]     = useState('');
  const [error, setError]       = useState('');
  const [loading, setLoading]   = useState(false);
  const [showPwd, setShowPwd]   = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (phone.replace(/\D/g, '').length < 8) {
      setError('El número de WhatsApp es obligatorio');
      return;
    }
    setLoading(true);
    try {
      await register(name, email, password, phone);
      // Pre-fill ProfileCreate with data collected here
      localStorage.setItem('aliax_register_prefill', JSON.stringify({ profession, cedula }));
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Error al registrarse');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh', background: 'linear-gradient(135deg, #1a1040 0%, #0e2633 50%, #0a1a1a 100%)', color: '#fff',
      fontFamily: "'Inter', system-ui, sans-serif",
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '32px 16px', position: 'relative', overflow: 'hidden',
    }}>
      {/* Teal glow orb */}
      <div style={{
        position: 'absolute', top: '-15%', left: '50%', transform: 'translateX(-50%)',
        width: 700, height: 600,
        background: 'radial-gradient(ellipse, rgba(45,212,191,0.10) 0%, transparent 65%)',
        pointerEvents: 'none',
      }} />

      <div style={{ position: 'relative', zIndex: 10, width: '100%', maxWidth: 440 }}>

        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <Link to="/" style={{ display: 'inline-flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
            <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#9b87f5', boxShadow: '0 0 10px rgba(155,135,245,0.9)' }} />
            <span style={{ fontSize: 20, fontWeight: 700, color: '#fff', letterSpacing: '-0.02em' }}>Aliax</span>
          </Link>
        </div>

        {/* Card */}
        <div style={{
          background: 'rgba(255,255,255,0.03)',
          border: '1px solid rgba(45,212,191,0.15)',
          borderRadius: 20, padding: '36px 32px',
          backdropFilter: 'blur(20px)',
          boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.06)',
        }}>
          {/* Header */}
          <div style={{ marginBottom: 28 }}>
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              background: 'rgba(45,212,191,0.08)', border: '1px solid rgba(45,212,191,0.2)',
              borderRadius: 999, padding: '4px 12px', marginBottom: 12,
            }}>
              <div style={{ width: 5, height: 5, borderRadius: '50%', background: '#2dd4bf' }} />
              <span style={{ fontSize: 11, fontWeight: 600, color: '#2dd4bf' }}>
                Gratis · Sin tarjeta
              </span>
            </div>
            <h2 style={{ fontSize: 20, fontWeight: 700, margin: '0 0 4px' }}>Crea tu perfil gratis</h2>
            <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', margin: 0 }}>
              Aparece en búsquedas de Google desde hoy
            </p>
          </div>

          {error && (
            <div style={{
              marginBottom: 20, padding: '10px 14px',
              background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)',
              borderRadius: 10, fontSize: 13, color: 'rgba(248,113,113,0.9)',
            }}>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: 'rgba(255,255,255,0.6)', marginBottom: 6 }}>
                Nombre completo <span style={{ color: '#f87171' }}>*</span>
              </label>
              <input
                type="text" value={name} onChange={e => setName(e.target.value)} required
                placeholder="Ej. Dra. Laura Mendoza"
                style={inp}
                onFocus={e => (e.currentTarget.style.borderColor = 'rgba(45,212,191,0.5)')}
                onBlur={e => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)')}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: 'rgba(255,255,255,0.6)', marginBottom: 6 }}>
                Profesión
              </label>
              <CustomSelect
                value={profession}
                onChange={setProfession}
                options={PROFESSION_OPTIONS}
                placeholder="Selecciona tu profesión"
                dark
                accent="rgb(45,212,191)"
                triggerStyle={{
                  width: '100%',
                  padding: '11px 14px',
                  background: 'rgba(255,255,255,0.05)',
                  border: `1px solid ${profession ? 'rgba(45,212,191,0.4)' : 'rgba(255,255,255,0.1)'}`,
                  borderRadius: 10,
                  color: profession ? '#fff' : 'rgba(255,255,255,0.3)',
                  fontSize: 14,
                  fontFamily: 'inherit',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  cursor: 'pointer',
                  boxSizing: 'border-box' as const,
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: 'rgba(255,255,255,0.6)', marginBottom: 6 }}>
                Cédula profesional
                <span style={{ marginLeft: 6, fontSize: 11, color: 'rgba(255,255,255,0.25)', fontWeight: 400 }}>opcional</span>
              </label>
              <input
                type="text" value={cedula} onChange={e => setCedula(e.target.value)}
                placeholder="Ej. 8734521"
                style={inp}
                onFocus={e => (e.currentTarget.style.borderColor = 'rgba(45,212,191,0.5)')}
                onBlur={e => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)')}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: 'rgba(255,255,255,0.6)', marginBottom: 6 }}>
                Email <span style={{ color: '#f87171' }}>*</span>
              </label>
              <input
                type="email" value={email} onChange={e => setEmail(e.target.value)} required
                style={inp}
                onFocus={e => (e.currentTarget.style.borderColor = 'rgba(45,212,191,0.5)')}
                onBlur={e => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)')}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: 'rgba(255,255,255,0.6)', marginBottom: 6 }}>
                Contraseña <span style={{ color: '#f87171' }}>*</span>
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPwd ? 'text' : 'password'} value={password}
                  onChange={e => setPassword(e.target.value)} required minLength={6}
                  placeholder="Mínimo 6 caracteres"
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
              <PhoneInput
                label="WhatsApp / Teléfono"
                required
                value={phone}
                onChange={setPhone}
                isDark
              />
            </div>

            <button type="submit" disabled={loading} style={{
              marginTop: 4, width: '100%', padding: '13px',
              background: 'linear-gradient(135deg, #2dd4bf, #0d9488)',
              color: '#fff', fontSize: 14, fontWeight: 600,
              border: 'none', borderRadius: 10, cursor: 'pointer',
              fontFamily: 'inherit', opacity: loading ? 0.6 : 1,
              transition: 'filter 0.2s',
            }}
              onMouseEnter={e => { if (!loading) (e.currentTarget as HTMLButtonElement).style.filter = 'brightness(1.1)'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.filter = 'brightness(1)'; }}
            >
              {loading ? 'Creando cuenta...' : 'Crear mi perfil gratis'}
            </button>
          </form>

          <p style={{ marginTop: 8, textAlign: 'center', fontSize: 11, color: 'rgba(255,255,255,0.2)' }}>
            Al registrarte aceptas nuestros{' '}
            <Link to="/terminos" style={{ color: 'rgba(45,212,191,0.5)', textDecoration: 'none' }}>Términos</Link>
            {' '}y{' '}
            <Link to="/privacidad" style={{ color: 'rgba(45,212,191,0.5)', textDecoration: 'none' }}>Privacidad</Link>
          </p>

          <p style={{ marginTop: 16, textAlign: 'center', fontSize: 13, color: 'rgba(255,255,255,0.35)' }}>
            ¿Ya tienes cuenta?{' '}
            <Link to="/login" style={{ color: '#2dd4bf', textDecoration: 'none', fontWeight: 500 }}>
              Iniciar sesión
            </Link>
          </p>
        </div>
      </div>

      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0 }}>
        <SiteFooter />
      </div>
    </div>
  );
}
