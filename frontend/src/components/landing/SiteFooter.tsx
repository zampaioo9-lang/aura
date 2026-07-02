import { Link } from 'react-router-dom';

const LINKS = [
  { label: 'Explorar', to: '/explorar' },
  { label: 'Precios', to: '/pricing' },
  { label: 'Iniciar sesión', to: '/login' },
  { label: 'Registrarse', to: '/register' },
  { label: 'Privacidad', to: '/privacidad' },
];

export default function SiteFooter() {
  return (
    <footer style={{ position: 'relative', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
      <div style={{
        maxWidth: 1100,
        margin: '0 auto',
        padding: '32px 24px',
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 24,
      }}>
        <span style={{ fontFamily: 'Michroma, sans-serif', fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>
          ALIAX
        </span>
        <nav style={{ display: 'flex', flexWrap: 'wrap', gap: 24 }}>
          {LINKS.map(l => (
            <Link
              key={l.to}
              to={l.to}
              style={{ fontFamily: 'Manrope, sans-serif', fontSize: 12, color: 'rgba(255,255,255,0.4)', textDecoration: 'none' }}
            >
              {l.label}
            </Link>
          ))}
        </nav>
        <span style={{ fontFamily: 'Manrope, sans-serif', fontSize: 11, color: 'rgba(255,255,255,0.25)' }}>
          &copy; {new Date().getFullYear()} Aliax.io. Todos los derechos reservados.
        </span>
      </div>
    </footer>
  );
}
