import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

function AuraLogo({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} fill="none">
      <circle cx="16" cy="16" r="4" stroke="currentColor" fill="none">
        <animate attributeName="r" from="4" to="32" dur="2.8s" begin="0s" repeatCount="indefinite" />
        <animate attributeName="opacity" from="0.9" to="0" dur="2.8s" begin="0s" repeatCount="indefinite" />
        <animate attributeName="stroke-width" from="2" to="0" dur="2.8s" begin="0s" repeatCount="indefinite" />
      </circle>
      <circle cx="16" cy="16" r="4" stroke="currentColor" fill="none">
        <animate attributeName="r" from="4" to="32" dur="2.8s" begin="0.9s" repeatCount="indefinite" />
        <animate attributeName="opacity" from="0.9" to="0" dur="2.8s" begin="0.9s" repeatCount="indefinite" />
        <animate attributeName="stroke-width" from="2" to="0" dur="2.8s" begin="0.9s" repeatCount="indefinite" />
      </circle>
      <circle cx="16" cy="16" r="4" stroke="currentColor" fill="none">
        <animate attributeName="r" from="4" to="32" dur="2.8s" begin="1.8s" repeatCount="indefinite" />
        <animate attributeName="opacity" from="0.9" to="0" dur="2.8s" begin="1.8s" repeatCount="indefinite" />
        <animate attributeName="stroke-width" from="2" to="0" dur="2.8s" begin="1.8s" repeatCount="indefinite" />
      </circle>
      <circle cx="16" cy="16" r="14" stroke="currentColor" strokeWidth="1.5" opacity="0.3" />
      <circle cx="16" cy="16" r="9" stroke="currentColor" strokeWidth="1.5" opacity="0.6" />
      <circle cx="16" cy="16" r="4" fill="currentColor" />
    </svg>
  );
}

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Error al iniciar sesion');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grain-overlay bg-aura-950 text-white font-body min-h-screen flex items-center justify-center px-4 overflow-hidden" style={{ isolation: 'isolate' }}>

      {/* Ambient background */}
      <div className="absolute inset-0 pointer-events-none" aria-hidden>
        <div className="absolute top-[-20%] left-1/2 -translate-x-1/2 w-[900px] h-[900px] rounded-full bg-amber-glow/[0.07] blur-[140px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[600px] h-[600px] rounded-full bg-aura-600/40 blur-[120px]" />
      </div>

      <div className="relative z-10 w-full max-w-md">

        {/* Logo */}
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-2.5 group">
            <AuraLogo className="h-9 w-9 text-amber-glow transition-transform duration-500 group-hover:rotate-90" />
            <span className="text-2xl font-display text-white tracking-wide">Aliax.io</span>
          </Link>
        </div>

        {/* Card */}
        <div className="bg-white/[0.03] border border-white/10 rounded-2xl backdrop-blur-sm p-8">
          <h2 className="text-xl font-semibold text-white mb-6">Iniciar sesión</h2>

          {error && (
            <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 text-red-400 text-sm rounded-lg">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-white/70 mb-1">Email</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-400 focus:border-amber-400 outline-none bg-white text-slate-900"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-white/70 mb-1">Contraseña</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  className="w-full px-3 py-2 pr-10 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-400 focus:border-amber-400 outline-none bg-white text-slate-900 text-base"
                />
                <button
                  type="button"
                  tabIndex={-1}
                  onClick={() => setShowPassword(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 bg-amber-glow hover:opacity-90 text-white font-medium rounded-lg transition-opacity disabled:opacity-50"
            >
              {loading ? 'Ingresando...' : 'Ingresar'}
            </button>
          </form>

          <p className="mt-4 text-center text-sm text-white/40">
            ¿No tienes cuenta?{' '}
            <Link to="/register" className="text-amber-glow hover:text-amber-soft transition-colors">
              Registrarse
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
