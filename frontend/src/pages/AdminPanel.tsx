import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, Search, ChevronLeft, ChevronRight, CreditCard, Tag, Sun, Moon, Trash2, Mail, MailX, Send } from 'lucide-react';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/Toast';

interface Stats {
  users: { total: number; newThisMonth: number; inTrial: number; paid: number; withDiscount: number };
  profiles: { total: number };
  clients: { total: number };
  bookings: {
    total: number;
    pending: number;
    confirmed: number;
    cancelled: number;
    completed: number;
    noShow: number;
  };
  notifications: { sent: number };
}

interface UserRow {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  isAdmin: boolean;
  createdAt: string;
  trialEndsAt: string | null;
  plan: string | null;
  planInterval: string | null;
  planExpiresAt: string | null;
  stripeSubscriptionId: string | null;
  paypalSubscriptionId: string | null;
  stripeHasDiscount: boolean;
  welcomeEmailSentAt: string | null;
  blocked: boolean;
  featureOverrides: Record<string, boolean>;
  _count: { profiles: number; professionalBookings: number };
  profiles: {
    id: string;
    slug: string;
    title: string;
    published: boolean;
    _count: { bookings: number; services: number };
  }[];
}

const INTERVAL_LABEL: Record<string, string> = {
  MONTHLY: 'Mensual',
  YEARLY: 'Anual',
  LIFETIME: 'Lifetime',
};

function PlanBadge({ u }: { u: UserRow }) {
  if (u.plan === 'CLINICO') {
    return (
      <span style={{ padding: '2px 8px', background: 'rgba(168,85,247,0.18)', backdropFilter: 'blur(8px)', color: '#a855f7', fontSize: 11, borderRadius: 99, fontWeight: 600, border: '1px solid rgba(168,85,247,0.3)', whiteSpace: 'nowrap' }}>
        Clínico
      </span>
    );
  }

  if (u.plan === 'PRO') {
    const intervalLabel = INTERVAL_LABEL[u.planInterval ?? ''] ?? u.planInterval ?? '?';
    const payMethod = u.paypalSubscriptionId ? 'PayPal' : u.stripeSubscriptionId ? 'Stripe' : '';
    return (
      <div className="flex flex-col items-center gap-1">
        <span style={{ padding: '2px 8px', background: 'rgba(52,211,153,0.18)', backdropFilter: 'blur(8px)', color: '#34d399', fontSize: 11, borderRadius: 99, fontWeight: 600, border: '1px solid rgba(52,211,153,0.3)', whiteSpace: 'nowrap' }}>
          PRO · {intervalLabel}
        </span>
        {payMethod && (
          <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)', display: 'flex', alignItems: 'center', gap: 4 }}>
            <CreditCard className="w-3 h-3" /> {payMethod}
          </span>
        )}
        {u.stripeHasDiscount && (
          <span style={{ padding: '2px 6px', background: 'rgba(251,191,36,0.15)', backdropFilter: 'blur(8px)', color: '#fbbf24', fontSize: 11, borderRadius: 99, display: 'flex', alignItems: 'center', gap: 4, border: '1px solid rgba(251,191,36,0.25)' }}>
            <Tag className="w-3 h-3" /> Descuento
          </span>
        )}
      </div>
    );
  }

  if (u.trialEndsAt) {
    const daysLeft = Math.max(0, Math.ceil((new Date(u.trialEndsAt).getTime() - Date.now()) / 86400000));
    if (daysLeft === 0) {
      return <span style={{ padding: '2px 8px', background: 'rgba(239,68,68,0.15)', backdropFilter: 'blur(8px)', color: '#f87171', fontSize: 11, borderRadius: 99, fontWeight: 500, border: '1px solid rgba(239,68,68,0.25)' }}>Trial expirado</span>;
    }
    const dayOf = Math.max(1, 15 - daysLeft);
    return (
      <span style={{ padding: '2px 8px', background: 'rgba(251,191,36,0.15)', backdropFilter: 'blur(8px)', color: '#fbbf24', fontSize: 11, borderRadius: 99, fontWeight: 500, border: '1px solid rgba(251,191,36,0.25)', whiteSpace: 'nowrap' }}>
        Prueba · Día {dayOf}/14
      </span>
    );
  }

  return <span style={{ padding: '2px 8px', background: 'rgba(255,255,255,0.07)', backdropFilter: 'blur(8px)', color: 'rgba(255,255,255,0.4)', fontSize: 11, borderRadius: 99, border: '1px solid rgba(255,255,255,0.12)' }}>Sin plan</span>;
}

const ONBOARDING_TEMPLATES = [
  {
    id: 'o1',
    tag: 'Activación',
    tagColor: '#f59e0b',
    subject: 'Tu perfil en Aliax no está visible todavía — así lo publicas en 5 minutos',
    body: `Hola,

Bienvenida a Aliax. Noté que tu perfil aún no aparece en el directorio de profesionales.

La buena noticia: está a unos clics de estar listo.

Para que los pacientes puedan encontrarte:

1. Entra a tu cuenta en aliax.io
2. Ve a "Editar perfil" y completa tu información profesional (enfoques terapéuticos, problemáticas que atiendes, descripción)
3. Agrega al menos un servicio con precio en la sección "Mis servicios"
4. Activa tu perfil público con el switch "Publicar perfil"

Cuando hagas eso, tu nombre empieza a aparecer en búsquedas de pacientes.

Si algo no te queda claro, responde este correo y te ayudo.

— César
Aliax.io`,
  },
  {
    id: 'o2',
    tag: 'Onboarding',
    tagColor: '#0d9488',
    subject: 'El paso que más psicólogos olvidan en Aliax (y que más pacientes atrae)',
    body: `Hola,

Cuando alguien en Aliax busca terapeuta, puede filtrar por enfoque terapéutico y por la problemática que quiere trabajar.

El problema es que la mayoría de los profesionales completan su nombre, su foto y su presentación... pero dejan vacíos los enfoques y las problemáticas.

Ese vacío los hace invisibles para la búsqueda más importante.

Toma 10 minutos:

- Entra a Editar perfil
- Agrega tus enfoques terapéuticos (cognitivo-conductual, TBCS, sistémica, lo que aplique)
- Escribe las problemáticas que atiendes: ansiedad, duelo, relaciones de pareja, lo que describes en tu consulta

Eso es lo que conecta tu perfil con el paciente que te necesita.

— César
Aliax.io`,
  },
  {
    id: 'o3',
    tag: 'Educación',
    tagColor: '#0891b2',
    subject: 'Así busca un paciente a su psicólogo en Aliax (y cómo aparecer primero)',
    body: `Hola,

Te cuento cómo funciona Aliax desde el otro lado.

Un paciente entra, escribe "ansiedad" o elige "terapia de pareja" en el buscador. El sistema muestra los perfiles que coinciden — ordenados por completitud del perfil.

Lo que busca ese paciente antes de escribirte:

1. Una foto profesional — genera confianza antes de la primera palabra
2. Una descripción que hable de él, no de ti: "Si te sientes atrapado en los mismos patrones..." funciona mejor que "Soy terapeuta con 10 años de experiencia"
3. Precio visible — la incertidumbre del precio es la razón número uno por la que no contactan

Con esos tres elementos, tu perfil trabaja por ti incluso cuando no estás en línea.

— César
Aliax.io`,
  },
  {
    id: 'o4',
    tag: 'Conversión',
    tagColor: '#b45309',
    subject: 'Lo que incluye Aliax Pro — y por qué tiene sentido en este momento',
    body: `Hola,

Quiero ser directo con lo que hace diferente el plan Pro.

El plan Free te da presencia en el directorio. Pro agrega lo que convierte esa presencia en una práctica organizada:

Historia clínica digital — expediente de cada paciente con notas de sesión en formato SOAP, Diamante TBCS o Nota Centrada en Soluciones (NECS). Todo en la misma plataforma.

Agenda integrada — tus citas, disponibilidad y reservas en un solo lugar.

Analíticas — cuántas vistas tiene tu perfil, de dónde viene el tráfico, qué días funcionan mejor.

El precio es $9 USD al mes. Si eso equivale a una sesión, y el sistema te ahorra tiempo de administración cada semana, la cuenta es rápida.

Si quieres explorarlo, entra a tu cuenta y activa Pro desde la sección Suscripción.

— César
Aliax.io`,
  },
  {
    id: 'o5',
    tag: 'Match IA',
    tagColor: '#7c3aed',
    subject: 'Así te está recomendando la IA de Aliax a tus próximos pacientes',
    body: `Hola,

Quiero contarte sobre algo que cambia cómo los pacientes te encuentran en Aliax: el Match Ideal con IA.

En vez de solo escribir una palabra en un buscador, el paciente responde unas preguntas — qué lo motiva a buscar terapia, si prefiere online o presencial, si es para él, su pareja o su familia, qué enfoque le interesa. La IA analiza esas respuestas y le recomienda los perfiles más compatibles, no solo los que coinciden por palabra clave.

Esto es una gran oportunidad para ti, pero depende de un detalle: la IA solo puede recomendarte si tu perfil tiene la información completa. Si esos campos están vacíos, eres invisible para el match, aunque tu perfil se vea bien.

Para que aparezcas en más resultados:

1. Modalidad — define si atiendes online, presencial o ambas
2. Enfoques terapéuticos — cognitivo-conductual, sistémica, TBCS, lo que aplique en tu práctica
3. Poblaciones que atiendes — individual, pareja, familia, niños, lo que corresponda
4. Problemáticas — ansiedad, duelo, relaciones, y cualquier otra que trabajes en consulta

Mientras más completos estén estos campos, más preciso es el match — y más fácil que la IA te recomiende a la persona correcta.

Entra a Editar perfil y revisa que los cuatro estén llenos.

— César
Aliax.io`,
  },
  {
    id: 'o6',
    tag: 'Confianza',
    tagColor: '#db2777',
    subject: 'Tu perfil sin foto está perdiendo pacientes antes de que te escriban',
    body: `Hola,

Quiero hablarte de algo pequeño que tiene un impacto grande: tu foto de perfil.

Cuando alguien busca terapeuta, decide en segundos si va a contactarte — y esa decisión es, en gran parte, visual. Antes de leer tu descripción o tus enfoques, lo primero que ve es tu foto. Si no hay foto, lo primero que siente es desconfianza, no neutralidad.

Para quien busca ayuda psicológica esto pesa todavía más: está a punto de compartir algo vulnerable con un desconocido. Ver tu rostro — una mirada tranquila, una postura abierta — empieza a construir la sensación de seguridad antes de la primera sesión. Es la diferencia entre "un perfil más" y "una persona con la que podría sentirme escuchado".

No se trata de una foto perfecta ni de sesión profesional costosa. Basta con que sea:

- Tu rostro visible, de frente o ligeramente de lado
- Buena iluminación, fondo simple y sin distracciones
- Una expresión natural y cercana, no una pose forzada

Evita fotos grupales, recortadas de otra imagen, o sin tu cara claramente visible.

Sube tu foto desde Editar perfil — toma menos de 2 minutos y cambia la primera impresión que tienen de ti.

— César
Aliax.io`,
  },
];

const REACTIVATION_TEMPLATES = [
  {
    id: 1,
    tag: 'Reactivación',
    tagColor: '#7c3aed',
    subject: 'Algo importante cambió en Aliax — y fue pensando en ti',
    body: `Hola,

Hace tiempo te registraste en Aliax. Quiero contarte que desde entonces el proyecto evolucionó por completo.

Aliax ahora es un directorio especializado exclusivamente para psicólogos y psicoterapeutas. No generalistas, no coaches — solo profesionales de salud mental.

¿Por qué importa esto? Porque cuando un paciente busca ayuda, llega a Aliax y ve solo perfiles como el tuyo. Sin ruido. Sin competencia de otras áreas.

Tu perfil ya está creado. Solo falta que lo completes y lo hagas visible.

Entra a tu cuenta y cuéntame cómo te puedo ayudar.

— El equipo de Aliax
aliax.io`,
  },
  {
    id: 2,
    tag: 'Educación',
    tagColor: '#0891b2',
    subject: '¿Cómo te encuentra un paciente que no te conoce?',
    body: `Hola,

Piensa en esto: un paciente nuevo busca ayuda en Google. No conoce tu nombre, no tiene referido, no sabe por dónde empezar.

¿Cómo llega a ti?

En Aliax, los pacientes buscan por enfoque terapéutico, por problemática y por ciudad. Si tu perfil está completo, apareces exactamente cuando alguien necesita lo que tú ofreces.

Esta semana dedica 15 minutos a completar tu perfil:
- Agrega tus enfoques terapéuticos
- Describe las problemáticas que atiendes
- Publica al menos un servicio con precio

Tu próximo paciente ya está buscando.

— El equipo de Aliax
aliax.io`,
  },
  {
    id: 3,
    tag: 'Verificación',
    tagColor: '#0d9488',
    subject: 'Un detalle que genera confianza antes de que el paciente te conozca',
    body: `Hola,

Hay algo pequeño que marca una gran diferencia cuando un paciente está eligiendo terapeuta: saber que eres un profesional certificado.

En Aliax agregamos la insignia "Profesional Verificado". Aparece en tu perfil cuando registras tu número de cédula o licencia profesional.

No es un proceso complicado — solo agrega tu cédula en la sección de Editar Perfil. Aliax la muestra discretamente junto a tu nombre, con un sello visual que transmite seguridad.

Los pacientes que dudan entre dos terapeutas casi siempre eligen al que parece más confiable. Este detalle ayuda.

Entra y agrégala hoy.

— El equipo de Aliax
aliax.io`,
  },
  {
    id: 4,
    tag: 'Conversión',
    tagColor: '#b45309',
    subject: 'Eres uno de los primeros. Hay algo para ti.',
    body: `Hola,

Fuiste de las primeras personas en confiar en Aliax. Eso significa algo para nosotros.

Aliax Pro te da acceso a tu directorio completo, historial clínico de pacientes, agenda de citas, analíticas de perfil y más — todo en un solo lugar.

Como reconocimiento por estar desde el inicio, tenemos un cupón exclusivo para ti:

CONFIANZA20 — 20% de descuento en el primer año de Aliax Pro

Solo puedes usarlo tú, y tiene fecha límite.

Entra a tu cuenta → Suscripción → Ingresa el cupón al momento del pago.

Gracias por ser parte desde el principio.

— El equipo de Aliax
aliax.io`,
  },
];

export default function AdminPanel() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [dark, setDark] = useState(() => localStorage.getItem('aliax_theme') === 'dark');
  const [stats, setStats] = useState<Stats | null>(null);
  const [users, setUsers] = useState<UserRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [expandedUser, setExpandedUser] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [loadingStats, setLoadingStats] = useState(true);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [sendingWelcome, setSendingWelcome] = useState<string | null>(null);
  const [resettingPassword, setResettingPassword] = useState<string | null>(null);
  const [annSubject, setAnnSubject] = useState('');
  const [annBody, setAnnBody] = useState('');
  const [annAudience, setAnnAudience] = useState<'all' | 'pro' | 'free' | 'user'>('all');
  const [annUserId, setAnnUserId] = useState('');
  const [sendingAnn, setSendingAnn] = useState(false);
  const [annResult, setAnnResult] = useState<{ ok: boolean; sent?: number; failed?: number; error?: string; recipients?: { name: string; email: string; ok: boolean }[] } | null>(null);
  const [annLogs, setAnnLogs] = useState<{ id: string; subject: string; audience: string; sentCount: number; failCount: number; recipients: { name: string; email: string; ok: boolean; emailId?: string; opened: boolean }[]; sentAt: string }[]>([]);

  // Newsletter (Resend Broadcasts)
  const [nlSubject, setNlSubject] = useState('');
  const [nlHtml, setNlHtml] = useState('');
  const [nlName, setNlName] = useState('');
  const [sendingNl, setSendingNl] = useState(false);
  const [nlResult, setNlResult] = useState<{ ok: boolean; broadcastId?: string; error?: string } | null>(null);
  const [syncingAudience, setSyncingAudience] = useState(false);
  const [syncResult, setSyncResult] = useState<{ ok: boolean; added?: number; total?: number; error?: string } | null>(null);
  const [refreshingLogs, setRefreshingLogs] = useState(false);
  const [updatingPermissions, setUpdatingPermissions] = useState<string | null>(null);
  const [updatingBlock, setUpdatingBlock] = useState<string | null>(null);
  const [grantingPro, setGrantingPro] = useState<string | null>(null);
  const [activatingTrial, setActivatingTrial] = useState<string | null>(null);
  const [grantMonths, setGrantMonths] = useState(1);
  const [expiryDaysAhead, setExpiryDaysAhead] = useState(7);
  const [sendingExpiryNotif, setSendingExpiryNotif] = useState(false);
  const [expiryNotifResult, setExpiryNotifResult] = useState<{ ok: boolean; sent?: number; failed?: number; total?: number; results?: { name: string; email: string; whatsapp: boolean; email_sent: boolean }[]; error?: string } | null>(null);

  const FEATURE_LABELS: { key: string; label: string }[] = [
    { key: 'historia_clinica',  label: 'HC Individual' },
    { key: 'terapia_pareja',    label: 'HC de Pareja' },
    { key: 'pacientes',         label: 'Pacientes' },
    { key: 'analytics',         label: 'Analytics' },
    { key: 'agenda',            label: 'Agenda' },
    { key: 'templates_premium', label: 'Templates Premium' },
    { key: 'colores_premium',   label: 'Colores Premium' },
    { key: 'aiNotes',           label: 'Notas con IA' },
    { key: 'audio_notes',       label: 'Transcripción de audio' },
  ];

  const handleToggleFeature = async (userId: string, key: string, value: boolean) => {
    setUpdatingPermissions(userId);
    try {
      await api.patch(`/admin/users/${userId}/features`, { [key]: value });
      setUsers(prev => prev.map(u =>
        u.id === userId
          ? { ...u, featureOverrides: { ...u.featureOverrides, [key]: value } }
          : u
      ));
    } catch (err) {
      console.error('Error actualizando feature:', err);
    } finally {
      setUpdatingPermissions(null);
    }
  };

  const handleToggleBlock = async (userId: string, blocked: boolean) => {
    setUpdatingBlock(userId);
    try {
      await api.patch(`/admin/users/${userId}/block`, { blocked });
      setUsers(prev => prev.map(u =>
        u.id === userId ? { ...u, blocked } : u
      ));
    } catch (err) {
      console.error('Error bloqueando usuario:', err);
    } finally {
      setUpdatingBlock(null);
    }
  };

  const handleGrantAll = async (userId: string) => {
    const allTrue = Object.fromEntries(FEATURE_LABELS.map(f => [f.key, true]));
    setUpdatingPermissions(userId);
    try {
      await api.patch(`/admin/users/${userId}/features`, allTrue);
      setUsers(prev => prev.map(u =>
        u.id === userId ? { ...u, featureOverrides: allTrue } : u
      ));
    } catch (err) {
      console.error('Error:', err);
    } finally {
      setUpdatingPermissions(null);
    }
  };

  const handleSendExpiryNotif = async () => {
    setSendingExpiryNotif(true);
    setExpiryNotifResult(null);
    try {
      const res = await api.post('/admin/notify-expiring-pro', { daysAhead: expiryDaysAhead });
      setExpiryNotifResult({ ok: true, ...res.data });
    } catch (err: any) {
      setExpiryNotifResult({ ok: false, error: err.response?.data?.error || 'Error al enviar' });
    } finally {
      setSendingExpiryNotif(false);
    }
  };

  const handleGrantPro = async (userId: string) => {
    setGrantingPro(userId);
    try {
      await api.patch(`/admin/users/${userId}/grant-pro`, { months: grantMonths });
      const planExpiresAt = new Date(Date.now() + grantMonths * 30 * 24 * 60 * 60 * 1000).toISOString();
      setUsers(prev => prev.map(u =>
        u.id === userId
          ? { ...u, plan: 'PRO', planInterval: 'MONTHLY', planExpiresAt }
          : u
      ));
      const expiryStr = new Date(planExpiresAt).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' });
      toast(`Plan PRO activado — vence el ${expiryStr}`, 'success');
    } catch (err: any) {
      toast(err.response?.data?.error || 'Error al activar PRO', 'error');
    } finally {
      setGrantingPro(null);
    }
  };

  const handleActivateClinicoTrial = async (userId: string) => {
    setActivatingTrial(userId);
    try {
      const res = await api.patch(`/admin/users/${userId}/activate-clinico-trial`);
      const { planExpiresAt } = res.data;
      setUsers(prev => prev.map(u =>
        u.id === userId
          ? { ...u, plan: 'CLINICO', planExpiresAt }
          : u
      ));
      const expiryStr = new Date(planExpiresAt).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' });
      toast(`Trial Clínico activado — vence el ${expiryStr}`, 'success');
    } catch (err: any) {
      toast(err.response?.data?.error || 'Error al activar el trial', 'error');
    } finally {
      setActivatingTrial(null);
    }
  };

  const handleRevokeAll = async (userId: string) => {
    const allFalse = Object.fromEntries(FEATURE_LABELS.map(f => [f.key, false]));
    setUpdatingPermissions(userId);
    try {
      await api.patch(`/admin/users/${userId}/features`, allFalse);
      setUsers(prev => prev.map(u =>
        u.id === userId ? { ...u, featureOverrides: allFalse } : u
      ));
    } catch (err) {
      console.error('Error:', err);
    } finally {
      setUpdatingPermissions(null);
    }
  };

  const toggleDark = () => {
    const next = !dark;
    setDark(next);
    localStorage.setItem('aliax_theme', next ? 'dark' : 'light');
  };

  const C = dark
    ? {
        page: 'linear-gradient(160deg, #052e2a 0%, #071412 100%)',
        header: 'rgba(5,30,26,0.95)',
        headerBorder: 'rgba(45,212,191,0.14)',
        card: 'rgba(45,212,191,0.05)',
        cardBorder: 'rgba(45,212,191,0.16)',
        text: '#e8f0f0',
        textMuted: '#6aada8',
        textFaint: '#3d6663',
        tableHdr: 'rgba(45,212,191,0.07)',
        tableRow: 'rgba(45,212,191,0.025)',
        tableRowAlt: 'rgba(0,0,0,0.12)',
        tableRowHover: 'rgba(45,212,191,0.08)',
        expandedBg: 'rgba(45,212,191,0.04)',
        inputBg: 'rgba(255,255,255,0.06)',
        inputBorder: 'rgba(45,212,191,0.2)',
        subCard: 'rgba(0,0,0,0.18)',
        accent: '#2dd4bf',
        accentLight: 'rgba(45,212,191,0.12)',
      }
    : {
        page: 'linear-gradient(160deg, #e6faf8 0%, #f0fdfa 100%)',
        header: 'rgba(255,255,255,0.95)',
        headerBorder: 'rgba(13,148,136,0.15)',
        card: '#ffffff',
        cardBorder: 'rgba(13,148,136,0.18)',
        text: '#0a1f1e',
        textMuted: '#3d8a82',
        textFaint: '#94a3a1',
        tableHdr: '#f0fdfa',
        tableRow: '#ffffff',
        tableRowAlt: '#f7fffe',
        tableRowHover: 'rgba(45,212,191,0.06)',
        expandedBg: 'rgba(45,212,191,0.04)',
        inputBg: '#f7fffe',
        inputBorder: 'rgba(13,148,136,0.2)',
        subCard: '#f0fdfa',
        accent: '#0d9488',
        accentLight: 'rgba(13,148,136,0.1)',
      };

  useEffect(() => {
    if (!loading && (!user || !user.isAdmin)) {
      navigate('/dashboard');
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    api.get('/admin/stats')
      .then(res => setStats(res.data))
      .finally(() => setLoadingStats(false));
    api.get('/admin/announcement-logs')
      .then(res => setAnnLogs(res.data))
      .catch(() => {});
  }, []);

  useEffect(() => {
    setLoadingUsers(true);
    const params = new URLSearchParams({ page: String(page), limit: '15' });
    if (search) params.append('search', search);
    api.get(`/admin/users?${params}`)
      .then(res => {
        setUsers(res.data.users);
        setTotal(res.data.total);
        setTotalPages(res.data.totalPages);
      })
      .finally(() => setLoadingUsers(false));
  }, [page, search]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    setSearch(searchInput);
  };

  const handleDeleteUser = async (id: string) => {
    setDeletingId(id);
    try {
      await api.delete(`/admin/users/${id}`);
      setUsers(prev => prev.filter(u => u.id !== id));
      setTotal(prev => prev - 1);
      setExpandedUser(null);
      setConfirmDelete(null);
    } catch (err: any) {
      alert(err.response?.data?.error || 'Error al eliminar usuario');
    } finally {
      setDeletingId(null);
    }
  };

  const handleSendNewsletter = async () => {
    if (!nlSubject.trim() || !nlHtml.trim()) return;
    const confirmed = window.confirm(`¿Enviar este newsletter a TODA la audiencia en Resend?\n\nEsto es irreversible.`);
    if (!confirmed) return;
    setSendingNl(true);
    setNlResult(null);
    try {
      const res = await api.post('/admin/newsletter', { subject: nlSubject, html: nlHtml, name: nlName || undefined });
      setNlResult({ ok: true, broadcastId: res.data.broadcastId });
    } catch (err: any) {
      setNlResult({ ok: false, error: err.response?.data?.error || 'Error al enviar' });
    } finally {
      setSendingNl(false);
    }
  };

  const handleSyncAudience = async () => {
    const confirmed = window.confirm('¿Sincronizar todos los usuarios actuales con la audiencia de Resend?');
    if (!confirmed) return;
    setSyncingAudience(true);
    setSyncResult(null);
    try {
      const res = await api.post('/admin/newsletter/sync');
      setSyncResult({ ok: true, added: res.data.added, total: res.data.total });
    } catch (err: any) {
      setSyncResult({ ok: false, error: err.response?.data?.error || 'Error al sincronizar' });
    } finally {
      setSyncingAudience(false);
    }
  };

  const handleSendAnnouncement = async () => {
    if (!annSubject.trim() || !annBody.trim()) return;
    if (annAudience === 'user' && !annUserId) return;
    const audienceLabel =
      annAudience === 'all'  ? 'todos los usuarios' :
      annAudience === 'pro'  ? 'solo PRO' :
      annAudience === 'free' ? 'solo Free' :
      `usuario: ${users.find(u => u.id === annUserId)?.name ?? annUserId}`;
    const confirmed = window.confirm(`¿Enviar este anuncio a ${audienceLabel}?`);
    if (!confirmed) return;
    setSendingAnn(true);
    setAnnResult(null);
    try {
      const payload: Record<string, string> = { subject: annSubject, body: annBody, audience: annAudience };
      if (annAudience === 'user' && annUserId) payload.userId = annUserId;
      const res = await api.post('/admin/send-announcement', payload);
      setAnnResult({ ok: true, sent: res.data.sent, failed: res.data.failed, recipients: res.data.recipients });
      api.get('/admin/announcement-logs').then(r => setAnnLogs(r.data)).catch(() => {});
    } catch (err: any) {
      setAnnResult({ ok: false, error: err.response?.data?.error || 'Error al enviar' });
    } finally {
      setSendingAnn(false);
    }
  };

  const handleSendWelcome = async (userId: string) => {
    setSendingWelcome(userId);
    try {
      const res = await api.post(`/admin/users/${userId}/welcome-email`);
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, welcomeEmailSentAt: res.data.sentAt } : u));
    } catch (err: any) {
      alert(err.response?.data?.error || 'Error al enviar email de bienvenida');
    } finally {
      setSendingWelcome(null);
    }
  };

  const handleResetPassword = async (userId: string, userEmail: string) => {
    const confirmed = window.confirm(`¿Enviar un enlace de reseteo de contraseña a ${userEmail}?`);
    if (!confirmed) return;
    setResettingPassword(userId);
    try {
      const res = await api.post(`/admin/users/${userId}/reset-password`);
      if (res.data.success) {
        alert(`Enlace de reseteo enviado a ${userEmail}`);
      } else {
        alert(`No se pudo enviar el correo a ${userEmail}. Avísale por otro medio.`);
      }
    } catch (err: any) {
      alert(err.response?.data?.error || 'Error al enviar el enlace de reseteo');
    } finally {
      setResettingPassword(null);
    }
  };

  if (loading || !user?.isAdmin) return null;

  return (
    <div style={{ minHeight: '100vh', background: C.page }}>
      {/* Header */}
      <div style={{
        background: C.header,
        borderBottom: `1px solid ${C.headerBorder}`,
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        position: 'sticky', top: 0, zIndex: 50,
      }}
        className="px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div style={{
            width: 34, height: 34, borderRadius: 10,
            background: `linear-gradient(135deg, ${C.accent}, ${C.accent}99)`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: `0 0 12px ${C.accent}55`,
          }}>
            <Users className="w-4 h-4 text-white" />
          </div>
          <div>
            <h1 className="text-base font-bold" style={{ color: C.text, lineHeight: 1.2 }}>Panel de Administración</h1>
            <p className="text-xs" style={{ color: C.textMuted }}>Aliax.io — Control total</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={toggleDark}
            className="p-2 rounded-lg transition-colors"
            style={{ background: C.card, border: `1px solid ${C.cardBorder}`, color: C.textMuted }}
            title={dark ? 'Modo claro' : 'Modo oscuro'}
          >
            {dark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
          <button
            onClick={() => navigate('/dashboard')}
            className="text-sm font-medium px-3 py-1.5 rounded-lg transition-colors"
            style={{ background: C.accentLight, color: C.accent, border: `1px solid ${C.accent}44` }}
          >
            ← Dashboard
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-6 space-y-6">

        {/* ── Resumen compacto ── */}
        {loadingStats ? (
          <div className="rounded-2xl h-32 animate-pulse" style={{ background: C.card, border: `1px solid ${C.cardBorder}` }} />
        ) : stats && (
          <div className="rounded-2xl overflow-hidden" style={{ background: C.card, border: `1px solid ${C.cardBorder}` }}>

            {/* Header */}
            <div className="flex items-center justify-between px-5 py-3" style={{ borderBottom: `1px solid ${C.cardBorder}` }}>
              <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: C.textFaint }}>Resumen</span>
              <span className="text-xs" style={{ color: C.textFaint }}>
                {new Date().toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' })}
              </span>
            </div>

            {/* Métricas principales */}
            <div className="grid grid-cols-5 divide-x" style={{ borderBottom: `1px solid ${C.cardBorder}`, '--tw-divide-opacity': '1', borderColor: C.cardBorder } as React.CSSProperties}>
              {[
                {
                  value: stats.users.total,
                  label: 'Profesionales',
                  sub: stats.users.newThisMonth > 0 ? `+${stats.users.newThisMonth} este mes` : null,
                  color: C.accent,
                  large: true,
                },
                {
                  value: stats.users.paid,
                  label: 'Plan PRO',
                  sub: null,
                  color: '#34d399',
                  large: false,
                },
                {
                  value: stats.profiles.total,
                  label: 'Perfiles',
                  sub: null,
                  color: '#60a5fa',
                  large: false,
                },
                {
                  value: stats.clients.total,
                  label: 'Clientes únicos',
                  sub: null,
                  color: '#a78bfa',
                  large: false,
                },
                {
                  value: stats.bookings.total,
                  label: 'Reservas',
                  sub: `${stats.bookings.completed} completadas`,
                  color: '#fb923c',
                  large: false,
                },
              ].map((m, i) => (
                <div key={i} className="px-5 py-4" style={{ borderColor: C.cardBorder }}>
                  <p className="font-bold" style={{ fontSize: m.large ? 28 : 20, color: m.color, lineHeight: 1.1 }}>
                    {m.value}
                  </p>
                  <p className="text-xs mt-1 font-medium" style={{ color: C.textMuted }}>{m.label}</p>
                  {m.sub && <p className="text-xs mt-0.5" style={{ color: C.textFaint }}>{m.sub}</p>}
                </div>
              ))}
            </div>

            {/* Estado de reservas — fila compacta */}
            <div className="flex items-center gap-5 px-5 py-3 flex-wrap">
              <span className="text-xs font-semibold" style={{ color: C.textFaint }}>Reservas</span>
              {[
                { label: 'Pendientes', value: stats.bookings.pending, dot: '#f59e0b' },
                { label: 'Confirmadas', value: stats.bookings.confirmed, dot: '#22c55e' },
                { label: 'Completadas', value: stats.bookings.completed, dot: C.accent },
                { label: 'Canceladas', value: stats.bookings.cancelled, dot: '#ef4444' },
                { label: 'No show', value: stats.bookings.noShow, dot: C.textFaint },
              ].map(item => (
                <div key={item.label} className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: item.dot, opacity: item.value === 0 ? 0.3 : 1 }} />
                  <span className="text-xs font-semibold" style={{ color: item.value === 0 ? C.textFaint : C.text }}>{item.value}</span>
                  <span className="text-xs" style={{ color: C.textFaint }}>{item.label}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Newsletter — Resend Broadcasts */}
        <div className="rounded-xl p-5" style={{ background: C.card, border: `1px solid ${C.cardBorder}` }}>
          <h2 className="text-sm font-semibold mb-1 flex items-center gap-2" style={{ color: C.text }}>
            <Send className="w-4 h-4 text-teal-400" />
            Newsletter <span className="text-xs font-normal px-2 py-0.5 rounded-full bg-teal-500/10 text-teal-400">Resend Broadcasts</span>
          </h2>
          <p className="text-xs mb-4" style={{ color: C.textFaint }}>
            Envía a toda la audiencia con tracking de aperturas, clics y baja automática. Requiere <code>RESEND_AUDIENCE_ID</code> configurado.
          </p>

          {/* Sync */}
          <div className="flex items-center gap-3 mb-4 pb-4" style={{ borderBottom: `1px solid ${C.cardBorder}` }}>
            <button
              onClick={handleSyncAudience}
              disabled={syncingAudience}
              className="flex items-center gap-2 px-3 py-1.5 text-xs rounded-lg border disabled:opacity-50"
              style={{ border: `1px solid ${C.cardBorder}`, color: C.textMuted, background: C.inputBg }}
            >
              {syncingAudience ? 'Sincronizando...' : '↑ Sincronizar usuarios existentes'}
            </button>
            {syncResult && (
              <p className="text-xs" style={{ color: syncResult.ok ? '#16a34a' : '#dc2626' }}>
                {syncResult.ok ? `✓ ${syncResult.added} contactos sincronizados de ${syncResult.total}` : `✗ ${syncResult.error}`}
              </p>
            )}
          </div>

          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium block mb-1" style={{ color: C.textMuted }}>Nombre interno</label>
                <input
                  type="text"
                  placeholder="Ej: Newsletter Marzo 2026"
                  value={nlName}
                  onChange={e => setNlName(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-400"
                  style={{ background: C.inputBg, border: `1px solid ${C.inputBorder}`, color: C.text }}
                />
              </div>
              <div>
                <label className="text-xs font-medium block mb-1" style={{ color: C.textMuted }}>Asunto del correo</label>
                <input
                  type="text"
                  placeholder="Ej: Tu competencia ya usa IA. ¿Y tú?"
                  value={nlSubject}
                  onChange={e => { setNlSubject(e.target.value); setNlResult(null); }}
                  className="w-full px-3 py-2 text-sm rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-400"
                  style={{ background: C.inputBg, border: `1px solid ${C.inputBorder}`, color: C.text }}
                />
              </div>
            </div>
            <div>
              <label className="text-xs font-medium block mb-1" style={{ color: C.textMuted }}>HTML del newsletter</label>
              <textarea
                rows={8}
                placeholder={'<h1>Título</h1>\n<p>Contenido...</p>\n\nResend añade el enlace de baja automáticamente.'}
                value={nlHtml}
                onChange={e => { setNlHtml(e.target.value); setNlResult(null); }}
                className="w-full px-3 py-2 text-sm rounded-lg resize-y focus:outline-none focus:ring-2 focus:ring-teal-400 font-mono"
                style={{ background: C.inputBg, border: `1px solid ${C.inputBorder}`, color: C.text }}
              />
            </div>
            <div className="flex items-center gap-4">
              {nlResult && (
                <p className="text-sm" style={{ color: nlResult.ok ? '#16a34a' : '#dc2626' }}>
                  {nlResult.ok
                    ? `✓ Broadcast enviado — ID: ${nlResult.broadcastId}`
                    : `✗ ${nlResult.error}`}
                </p>
              )}
              <button
                onClick={handleSendNewsletter}
                disabled={sendingNl || !nlSubject.trim() || !nlHtml.trim()}
                className="ml-auto flex items-center gap-2 px-4 py-2 text-sm bg-teal-600 text-white rounded-lg hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Send className="w-3.5 h-3.5" />
                {sendingNl ? 'Enviando...' : 'Enviar Newsletter'}
              </button>
            </div>
          </div>
        </div>

        {/* Secuencia de Onboarding */}
        <div className="rounded-xl p-5" style={{ background: C.card, border: `1px solid ${C.cardBorder}` }}>
          <h2 className="text-sm font-semibold mb-1 flex items-center gap-2" style={{ color: C.text }}>
            <Mail className="w-4 h-4 text-teal-400" />
            Secuencia de Onboarding
            <span className="text-xs font-normal px-2 py-0.5 rounded-full" style={{ background: 'rgba(13,148,136,0.12)', color: '#0d9488' }}>6 correos · activación → conversión</span>
          </h2>
          <p className="text-xs mb-4" style={{ color: C.textFaint }}>
            Para usuarios nuevos que aún no han completado su perfil o activado su cuenta. Enviar en orden, con 3–4 días entre cada uno.
          </p>
          <div className="flex gap-3 overflow-x-auto pb-1" style={{ scrollSnapType: 'x proximity' }}>
            {ONBOARDING_TEMPLATES.map((tpl, idx) => (
              <div key={tpl.id} className="rounded-lg p-4 flex-shrink-0" style={{ width: 280, scrollSnapAlign: 'start', background: dark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)', border: `1px solid ${C.cardBorder}` }}>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-semibold" style={{ color: C.textFaint, opacity: 0.6 }}>#{idx + 1}</span>
                    <span className="text-xs font-medium px-2 py-0.5 rounded-full" style={{ background: `${tpl.tagColor}18`, color: tpl.tagColor, border: `1px solid ${tpl.tagColor}30` }}>{tpl.tag}</span>
                  </div>
                  <button
                    onClick={() => { setAnnSubject(tpl.subject); setAnnBody(tpl.body); setAnnResult(null); }}
                    className="text-xs px-3 py-1 rounded-lg flex-shrink-0"
                    style={{ background: 'rgba(45,212,191,0.12)', color: '#2dd4bf', border: '1px solid rgba(45,212,191,0.25)' }}
                  >
                    Usar →
                  </button>
                </div>
                <p className="text-xs font-medium leading-snug" style={{ color: C.text }}>{tpl.subject}</p>
                <p className="text-xs mt-1 line-clamp-2" style={{ color: C.textFaint }}>{tpl.body.split('\n\n')[1] ?? ''}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Plantillas de Reactivación */}
        <div className="rounded-xl p-5" style={{ background: C.card, border: `1px solid ${C.cardBorder}` }}>
          <h2 className="text-sm font-semibold mb-1 flex items-center gap-2" style={{ color: C.text }}>
            <Mail className="w-4 h-4 text-teal-400" />
            Plantillas de Reactivación
            <span className="text-xs font-normal px-2 py-0.5 rounded-full" style={{ background: 'rgba(124,58,237,0.12)', color: '#a78bfa' }}>4 correos estratégicos</span>
          </h2>
          <p className="text-xs mb-4" style={{ color: C.textFaint }}>
            Secuencia para re-enganchar a usuarios existentes tras el pivote a psicólogos. Haz clic en "Usar" para cargar el correo en el formulario de abajo.
          </p>
          <div className="grid grid-cols-1 gap-3" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))' }}>
            {REACTIVATION_TEMPLATES.map((tpl, idx) => (
              <div key={tpl.id} className="rounded-lg p-4" style={{ background: dark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)', border: `1px solid ${C.cardBorder}` }}>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-semibold" style={{ color: C.textFaint, opacity: 0.6 }}>#{idx + 1}</span>
                    <span className="text-xs font-medium px-2 py-0.5 rounded-full" style={{ background: `${tpl.tagColor}18`, color: tpl.tagColor, border: `1px solid ${tpl.tagColor}30` }}>{tpl.tag}</span>
                  </div>
                  <button
                    onClick={() => { setAnnSubject(tpl.subject); setAnnBody(tpl.body); setAnnResult(null); }}
                    className="text-xs px-3 py-1 rounded-lg flex-shrink-0"
                    style={{ background: 'rgba(45,212,191,0.12)', color: '#2dd4bf', border: '1px solid rgba(45,212,191,0.25)' }}
                  >
                    Usar →
                  </button>
                </div>
                <p className="text-xs font-medium leading-snug" style={{ color: C.text }}>{tpl.subject}</p>
                <p className="text-xs mt-1 line-clamp-2" style={{ color: C.textFaint }}>{tpl.body.split('\n\n')[1] ?? ''}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Announcement */}
        <div className="rounded-xl p-5" style={{ background: C.card, border: `1px solid ${C.cardBorder}` }}>
          <h2 className="text-sm font-semibold mb-1 flex items-center gap-2" style={{ color: C.text }}>
            <Send className="w-4 h-4 text-teal-400" />
            Enviar anuncio a usuarios
          </h2>
          <p className="text-xs mb-4" style={{ color: C.textFaint }}>
            Envía un correo informando sobre nuevas funciones o novedades.
          </p>
          <div className="space-y-3">
            <div className="flex gap-3 flex-wrap">
              <div className="w-44">
                <label className="text-xs font-medium block mb-1" style={{ color: C.textMuted }}>Audiencia</label>
                <select
                  value={annAudience}
                  onChange={e => { setAnnAudience(e.target.value as any); setAnnUserId(''); setAnnResult(null); }}
                  className="w-full px-3 py-2 text-sm rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-400"
                  style={{ background: C.inputBg, border: `1px solid ${C.inputBorder}`, color: C.text, colorScheme: dark ? 'dark' : 'light' }}
                >
                  <option value="all" style={{ background: dark ? '#0d2421' : '#fff', color: dark ? '#e8f0f0' : '#0a1f1e' }}>Todos</option>
                  <option value="pro" style={{ background: dark ? '#0d2421' : '#fff', color: dark ? '#e8f0f0' : '#0a1f1e' }}>Solo PRO</option>
                  <option value="free" style={{ background: dark ? '#0d2421' : '#fff', color: dark ? '#e8f0f0' : '#0a1f1e' }}>Solo Free</option>
                  <option value="user" style={{ background: dark ? '#0d2421' : '#fff', color: dark ? '#e8f0f0' : '#0a1f1e' }}>Seleccionar usuario</option>
                </select>
              </div>
              {annAudience === 'user' && (
                <div className="w-56">
                  <label className="text-xs font-medium block mb-1" style={{ color: C.textMuted }}>Usuario</label>
                  <select
                    value={annUserId}
                    onChange={e => { setAnnUserId(e.target.value); setAnnResult(null); }}
                    className="w-full px-3 py-2 text-sm rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-400"
                    style={{ background: C.inputBg, border: `1px solid ${C.inputBorder}`, color: annUserId ? C.text : C.textFaint, colorScheme: dark ? 'dark' : 'light' }}
                  >
                    <option value="" style={{ background: dark ? '#0d2421' : '#fff', color: dark ? '#6aada8' : '#94a3a1' }}>— Elige un usuario —</option>
                    {users.map(u => (
                      <option key={u.id} value={u.id} style={{ background: dark ? '#0d2421' : '#fff', color: dark ? '#e8f0f0' : '#0a1f1e' }}>
                        {u.name} ({u.email})
                      </option>
                    ))}
                  </select>
                </div>
              )}
              <div className="flex-1 min-w-48">
                <label className="text-xs font-medium block mb-1" style={{ color: C.textMuted }}>Asunto del correo</label>
                <input
                  type="text"
                  placeholder="Ej: Novedades en Aliax — Marzo 2026"
                  value={annSubject}
                  onChange={e => { setAnnSubject(e.target.value); setAnnResult(null); }}
                  className="w-full px-3 py-2 text-sm rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-400"
                  style={{ background: C.inputBg, border: `1px solid ${C.inputBorder}`, color: C.text }}
                />
              </div>
            </div>
            <div>
              <label className="text-xs font-medium block mb-1" style={{ color: C.textMuted }}>Mensaje</label>
              <textarea
                rows={4}
                placeholder="Escribe el mensaje del anuncio. Puedes usar saltos de línea."
                value={annBody}
                onChange={e => { setAnnBody(e.target.value); setAnnResult(null); }}
                className="w-full px-3 py-2 text-sm rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-teal-400"
                style={{ background: C.inputBg, border: `1px solid ${C.inputBorder}`, color: C.text }}
              />
            </div>
            <div className="flex items-center gap-4">
              {annResult && (
                <div className="flex-1">
                  <p className="text-sm font-medium" style={{ color: annResult.ok ? '#16a34a' : '#dc2626' }}>
                    {annResult.ok
                      ? `✓ Enviado a ${annResult.sent} usuario${annResult.sent !== 1 ? 's' : ''}${annResult.failed ? ` · ${annResult.failed} fallido${annResult.failed !== 1 ? 's' : ''}` : ''}`
                      : `✗ ${annResult.error}`}
                  </p>
                  {annResult.ok && annResult.recipients && annResult.recipients.length > 0 && (
                    <div className="mt-2 space-y-1">
                      {annResult.recipients.map((r, i) => (
                        <div key={i} className="flex items-center gap-2 text-xs">
                          <span style={{ color: r.ok ? '#16a34a' : '#dc2626' }}>{r.ok ? '✓' : '✗'}</span>
                          <span style={{ color: C.text }}>{r.name}</span>
                          <span style={{ color: C.textFaint }}>{r.email}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
              <button
                onClick={handleSendAnnouncement}
                disabled={sendingAnn || !annSubject.trim() || !annBody.trim() || (annAudience === 'user' && !annUserId)}
                className="ml-auto flex items-center gap-2 px-4 py-2 text-sm bg-teal-600 text-white rounded-lg hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Send className="w-4 h-4" />
                {sendingAnn ? 'Enviando...' : 'Enviar anuncio'}
              </button>
            </div>
          </div>
        </div>

        {/* Notificaciones de vencimiento PRO */}
        <div className="rounded-xl p-5" style={{ background: C.card, border: `1px solid ${C.cardBorder}` }}>
          <h2 className="text-sm font-semibold mb-1 flex items-center gap-2" style={{ color: C.text }}>
            <CreditCard className="w-4 h-4 text-teal-400" />
            Recordatorio de vencimiento PRO
          </h2>
          <p className="text-xs mb-4" style={{ color: C.textFaint }}>
            Envía WhatsApp + email a todos los usuarios PRO cuyo plan vence exactamente en N días. Úsalo cuando quieras, con los días de anticipación que prefieras.
          </p>

          <div className="flex items-end gap-4 flex-wrap">
            <div>
              <label className="text-xs font-medium block mb-1" style={{ color: C.textMuted }}>Días de anticipación</label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={1}
                  max={90}
                  value={expiryDaysAhead}
                  onChange={e => setExpiryDaysAhead(Math.max(1, Math.min(90, parseInt(e.target.value) || 1)))}
                  className="w-20 px-3 py-2 text-sm rounded-lg text-center focus:outline-none focus:ring-2 focus:ring-teal-400"
                  style={{ background: C.inputBg, border: `1px solid ${C.inputBorder}`, color: C.text }}
                />
                <span className="text-sm" style={{ color: C.textMuted }}>día{expiryDaysAhead !== 1 ? 's' : ''} antes del vencimiento</span>
              </div>
            </div>

            <div className="flex-1 min-w-64 rounded-lg px-4 py-3" style={{ background: C.subCard ?? C.inputBg, border: `1px solid ${C.cardBorder}` }}>
              <p className="text-xs font-semibold mb-1" style={{ color: C.textMuted }}>Vista previa del mensaje</p>
              <p className="text-xs leading-relaxed" style={{ color: C.textFaint }}>
                Hola [nombre] 👋 — Tu plan <strong style={{ color: C.text }}>Aliax Pro</strong> vence el [fecha] (en <strong style={{ color: C.text }}>{expiryDaysAhead} día{expiryDaysAhead !== 1 ? 's' : ''}</strong>). Para continuar disfrutando de todas las funciones, recuerda renovar tu plan antes de que venza.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4 mt-4">
            {expiryNotifResult && (
              <div className="flex-1">
                <p className="text-sm font-medium" style={{ color: expiryNotifResult.ok ? '#16a34a' : '#dc2626' }}>
                  {expiryNotifResult.ok
                    ? `✓ Notificados ${expiryNotifResult.sent} de ${expiryNotifResult.total} usuario${expiryNotifResult.total !== 1 ? 's' : ''}${expiryNotifResult.failed ? ` · ${expiryNotifResult.failed} sin contacto` : ''}`
                    : `✗ ${expiryNotifResult.error}`}
                </p>
                {expiryNotifResult.ok && expiryNotifResult.total === 0 && (
                  <p className="text-xs mt-0.5" style={{ color: C.textFaint }}>Ningún usuario PRO vence en exactamente {expiryDaysAhead} día{expiryDaysAhead !== 1 ? 's' : ''}.</p>
                )}
                {expiryNotifResult.results && expiryNotifResult.results.length > 0 && (
                  <div className="mt-2 space-y-1">
                    {expiryNotifResult.results.map((r, i) => (
                      <div key={i} className="flex items-center gap-3 text-xs">
                        <span style={{ color: C.text }}>{r.name}</span>
                        <span style={{ color: C.textFaint }}>{r.email}</span>
                        <span style={{ color: r.whatsapp ? '#16a34a' : C.textFaint }}>WA {r.whatsapp ? '✓' : '✗'}</span>
                        <span style={{ color: r.email_sent ? '#16a34a' : C.textFaint }}>Email {r.email_sent ? '✓' : '✗'}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
            <button
              onClick={handleSendExpiryNotif}
              disabled={sendingExpiryNotif}
              className="ml-auto flex items-center gap-2 px-4 py-2 text-sm bg-teal-600 text-white rounded-lg hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Send className="w-3.5 h-3.5" />
              {sendingExpiryNotif ? 'Enviando...' : `Notificar vencimientos en ${expiryDaysAhead}d`}
            </button>
          </div>
        </div>

        {/* Users table */}
        <div className="rounded-xl" style={{ background: C.card, border: `1px solid ${C.cardBorder}` }}>
          <div className="px-5 py-4 flex items-center justify-between flex-wrap gap-3"
            style={{ borderBottom: `1px solid ${C.cardBorder}` }}>
            <div>
              <h2 className="text-sm font-semibold" style={{ color: C.text }}>Usuarios</h2>
              <p className="text-xs" style={{ color: C.textFaint }}>{total} en total</p>
            </div>
            <form onSubmit={handleSearch} className="flex gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: C.textFaint }} />
                <input
                  type="text"
                  placeholder="Buscar por nombre o email..."
                  value={searchInput}
                  onChange={e => setSearchInput(e.target.value)}
                  className="pl-9 pr-3 py-2 text-sm rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-400 w-64"
                  style={{ background: C.inputBg, border: `1px solid ${C.inputBorder}`, color: C.text }}
                />
              </div>
              <button
                type="submit"
                className="px-3 py-2 text-sm bg-teal-600 text-white rounded-lg hover:bg-teal-700"
              >
                Buscar
              </button>
            </form>
          </div>

          {loadingUsers ? (
            <div className="p-8 text-center text-sm" style={{ color: C.textFaint }}>Cargando usuarios...</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ background: C.tableHdr, borderBottom: `1px solid ${C.cardBorder}` }}>
                    <th className="text-left px-5 py-3 font-medium text-xs" style={{ color: C.textMuted }}>Usuario</th>
                    <th className="text-left px-5 py-3 font-medium text-xs" style={{ color: C.textMuted }}>Registro</th>
                    <th className="text-center px-5 py-3 font-medium text-xs" style={{ color: C.textMuted }}>Plan</th>
                    <th className="text-center px-5 py-3 font-medium text-xs" style={{ color: C.textMuted }}>Tipo</th>
                    <th className="text-center px-5 py-3 font-medium text-xs" style={{ color: C.textMuted }}>Reservas</th>
                    <th className="text-center px-5 py-3 font-medium text-xs" style={{ color: C.textMuted }}>Bienvenida</th>
                    <th className="text-center px-5 py-3 font-medium text-xs" style={{ color: C.textMuted }}>Rol</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u, idx) => (
                    <React.Fragment key={u.id}>
                      <tr
                        style={{
                          background: expandedUser === u.id ? C.expandedBg : (idx % 2 === 0 ? C.tableRow : C.tableRowAlt),
                          borderBottom: `1px solid ${C.cardBorder}`,
                          cursor: 'pointer',
                        }}
                        onMouseEnter={e => (e.currentTarget.style.background = C.tableRowHover)}
                        onMouseLeave={e => (e.currentTarget.style.background = expandedUser === u.id ? C.expandedBg : (idx % 2 === 0 ? C.tableRow : C.tableRowAlt))}
                        onClick={() => setExpandedUser(expandedUser === u.id ? null : u.id)}
                      >
                        <td className="px-5 py-3">
                          <p className="font-medium" style={{ color: C.text }}>{u.name}</p>
                          <p className="text-xs" style={{ color: C.textFaint }}>{u.email}</p>
                          {u.phone && <p className="text-xs" style={{ color: C.textFaint }}>{u.phone}</p>}
                        </td>
                        <td className="px-5 py-3 text-xs" style={{ color: C.textFaint }}>
                          {new Date(u.createdAt).toLocaleDateString('es-ES')}
                        </td>
                        <td className="px-5 py-3 text-center">
                          <PlanBadge u={u} />
                        </td>
                        <td className="px-5 py-3 text-center">
                          {u._count.profiles > 0 ? (
                            <span style={{ padding: '2px 8px', background: 'rgba(45,212,191,0.15)', backdropFilter: 'blur(8px)', color: '#2dd4bf', fontSize: 11, borderRadius: 99, fontWeight: 500, border: '1px solid rgba(45,212,191,0.25)' }}>
                              Profesional ({u._count.profiles})
                            </span>
                          ) : (
                            <span style={{ padding: '2px 8px', background: 'rgba(255,255,255,0.07)', backdropFilter: 'blur(8px)', color: 'rgba(255,255,255,0.35)', fontSize: 11, borderRadius: 99, border: '1px solid rgba(255,255,255,0.1)' }}>
                              Sin perfil
                            </span>
                          )}
                        </td>
                        <td className="px-5 py-3 text-center">
                          <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 28, height: 28, borderRadius: '50%', background: 'rgba(52,211,153,0.15)', backdropFilter: 'blur(8px)', color: '#34d399', fontWeight: 600, fontSize: 12, border: '1px solid rgba(52,211,153,0.25)' }}>
                            {u._count.professionalBookings}
                          </span>
                        </td>
                        <td className="px-5 py-3 text-center">
                          {u.welcomeEmailSentAt ? (
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '2px 8px', background: 'rgba(52,211,153,0.15)', backdropFilter: 'blur(8px)', color: '#34d399', fontSize: 11, borderRadius: 99, fontWeight: 500, border: '1px solid rgba(52,211,153,0.25)' }} title={`Enviado: ${new Date(u.welcomeEmailSentAt).toLocaleString('es-ES')}`}>
                              <Mail className="w-3 h-3" /> Enviado
                            </span>
                          ) : (
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '2px 8px', background: 'rgba(239,68,68,0.12)', backdropFilter: 'blur(8px)', color: '#f87171', fontSize: 11, borderRadius: 99, fontWeight: 500, border: '1px solid rgba(239,68,68,0.22)' }}>
                              <MailX className="w-3 h-3" /> No enviado
                            </span>
                          )}
                        </td>
                        <td className="px-5 py-3 text-center">
                          {u.isAdmin ? (
                            <span style={{ padding: '2px 8px', background: 'rgba(45,212,191,0.18)', backdropFilter: 'blur(8px)', color: '#2dd4bf', fontSize: 11, borderRadius: 99, fontWeight: 600, border: '1px solid rgba(45,212,191,0.3)' }}>Admin</span>
                          ) : (
                            <span style={{ padding: '2px 8px', background: 'rgba(255,255,255,0.07)', backdropFilter: 'blur(8px)', color: 'rgba(255,255,255,0.4)', fontSize: 11, borderRadius: 99, border: '1px solid rgba(255,255,255,0.1)' }}>Usuario</span>
                          )}
                        </td>
                      </tr>
                      {expandedUser === u.id && (
                        <tr style={{ background: C.expandedBg }}>
                          <td colSpan={7} className="px-5 py-4">
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
                              {[
                                { label: 'Nombre', value: u.name },
                                { label: 'Email', value: u.email },
                                { label: 'Teléfono', value: u.phone || '—' },
                                { label: 'Miembro desde', value: new Date(u.createdAt).toLocaleDateString('es-ES') },
                              ].map(item => (
                                <div key={item.label} className="rounded-lg px-3 py-2"
                                  style={{ background: C.subCard, border: `1px solid ${C.cardBorder}` }}>
                                  <p className="text-xs" style={{ color: C.textFaint }}>{item.label}</p>
                                  <p className="text-sm font-medium truncate" style={{ color: C.text }}>{item.value}</p>
                                </div>
                              ))}
                            </div>

                            {/* Plan details */}
                            <div className="rounded-lg px-3 py-2 mb-3"
                              style={{ background: C.subCard, border: `1px solid ${C.cardBorder}` }}>
                              <p className="text-xs mb-1" style={{ color: C.textFaint }}>Plan</p>
                              {u.plan === 'PRO' ? (
                                <div className="flex flex-wrap gap-3 text-sm" style={{ color: C.text }}>
                                  <span>PRO · {INTERVAL_LABEL[u.planInterval ?? ''] ?? u.planInterval}</span>
                                  {u.planExpiresAt && (
                                    <span style={{ color: C.textMuted }}>
                                      Expira: {new Date(u.planExpiresAt).toLocaleDateString('es-ES')}
                                    </span>
                                  )}
                                  {u.stripeSubscriptionId && (
                                    <span style={{ color: C.textMuted }}>Stripe: {u.stripeSubscriptionId}</span>
                                  )}
                                  {u.paypalSubscriptionId && (
                                    <span style={{ color: C.textMuted }}>PayPal: {u.paypalSubscriptionId}</span>
                                  )}
                                  {u.stripeHasDiscount && (
                                    <span className="px-1.5 py-0.5 bg-amber-100 text-amber-700 text-xs rounded-full flex items-center gap-1">
                                      <Tag className="w-3 h-3" /> Pagó con código de descuento
                                    </span>
                                  )}
                                </div>
                              ) : u.plan === 'CLINICO' ? (
                                <div className="flex flex-wrap gap-3 text-sm" style={{ color: C.text }}>
                                  <span>Clínico</span>
                                  {u.planExpiresAt && (
                                    <span style={{ color: C.textMuted }}>
                                      Expira: {new Date(u.planExpiresAt).toLocaleDateString('es-ES')}
                                    </span>
                                  )}
                                </div>
                              ) : u.trialEndsAt ? (
                                <div style={{ color: C.text }} className="text-sm">
                                  Periodo de prueba · Termina: {new Date(u.trialEndsAt).toLocaleDateString('es-ES')}
                                </div>
                              ) : (
                                <p className="text-sm" style={{ color: C.textMuted }}>Sin plan activo</p>
                              )}
                            </div>

                            {u.profiles.length > 0 ? (
                              <>
                                <p className="text-xs font-semibold mb-2" style={{ color: C.textMuted }}>Perfiles</p>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                  {u.profiles.map(p => (
                                    <div key={p.id} className="rounded-lg px-4 py-2 flex items-center justify-between"
                                      style={{ background: C.subCard, border: `1px solid ${C.cardBorder}` }}>
                                      <div>
                                        <p className="text-sm font-medium" style={{ color: C.text }}>{p.title}</p>
                                        <p className="text-xs" style={{ color: C.textFaint }}>/{p.slug}</p>
                                      </div>
                                      <div className="flex items-center gap-3 text-xs" style={{ color: C.textMuted }}>
                                        <span>{p._count.services} servicios</span>
                                        <span>{p._count.bookings} reservas</span>
                                        <span style={{ color: p.published ? '#16a34a' : C.textFaint, fontWeight: p.published ? 500 : 400 }}>
                                          {p.published ? 'Publicado' : 'Borrador'}
                                        </span>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </>
                            ) : (
                              <p className="text-xs italic" style={{ color: C.textFaint }}>Este usuario aún no creó ningún perfil.</p>
                            )}

                            {/* Correos enviados a este usuario */}
                            {(() => {
                              const userLogs = annLogs.filter(log =>
                                (log.recipients as { email: string; ok: boolean; opened: boolean }[]).some(r => r.email === u.email)
                              );
                              if (userLogs.length === 0) return null;
                              return (
                                <div className="rounded-lg px-3 py-3 mt-3" style={{ background: C.subCard, border: `1px solid ${C.cardBorder}` }}>
                                  <div className="flex items-center justify-between mb-2">
                                    <p className="text-xs font-semibold flex items-center gap-1.5" style={{ color: C.textMuted }}>
                                      <Mail className="w-3.5 h-3.5" /> Correos enviados ({userLogs.length})
                                    </p>
                                    <button
                                      onClick={e => { e.stopPropagation(); setRefreshingLogs(true); api.get('/admin/announcement-logs').then(r => setAnnLogs(r.data)).finally(() => setRefreshingLogs(false)); }}
                                      disabled={refreshingLogs}
                                      className="text-xs px-2 py-0.5 rounded-md disabled:opacity-50"
                                      style={{ background: C.accentLight, color: C.accent, border: `1px solid ${C.cardBorder}` }}
                                    >
                                      {refreshingLogs ? '...' : '↻ Actualizar'}
                                    </button>
                                  </div>
                                  <div className="space-y-1.5">
                                    {userLogs.map(log => {
                                      const rec = (log.recipients as { email: string; ok: boolean; opened: boolean }[]).find(r => r.email === u.email);
                                      const dateStr = new Date(log.sentAt).toLocaleString('es-MX', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
                                      return (
                                        <div key={log.id} className="flex items-center gap-3 text-xs" style={{ borderBottom: `1px solid ${C.cardBorder}`, paddingBottom: 6 }}>
                                          <div className="flex-1 min-w-0">
                                            <p className="font-medium truncate" style={{ color: C.text }}>{log.subject}</p>
                                            <p style={{ color: C.textFaint }}>{dateStr}</p>
                                          </div>
                                          <span className="flex-shrink-0 px-2 py-0.5 rounded-full font-medium" style={{
                                            background: rec?.opened ? 'rgba(45,212,191,0.12)' : 'rgba(255,255,255,0.06)',
                                            color: rec?.opened ? '#2dd4bf' : C.textFaint,
                                          }}>
                                            {rec?.opened ? '👁 Abierto' : 'Sin abrir'}
                                          </span>
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>
                              );
                            })()}

                            {/* Welcome email status & send button */}
                            <div className="rounded-lg px-3 py-2 mt-3 flex items-center justify-between"
                              style={{ background: C.subCard, border: `1px solid ${C.cardBorder}` }}>
                              <div>
                                <p className="text-xs" style={{ color: C.textFaint }}>Email de bienvenida</p>
                                {u.welcomeEmailSentAt ? (
                                  <p className="text-sm flex items-center gap-1.5" style={{ color: '#16a34a' }}>
                                    <Mail className="w-3.5 h-3.5" />
                                    Enviado el {new Date(u.welcomeEmailSentAt).toLocaleDateString('es-ES')} a las {new Date(u.welcomeEmailSentAt).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                                  </p>
                                ) : (
                                  <p className="text-sm flex items-center gap-1.5" style={{ color: '#dc2626' }}>
                                    <MailX className="w-3.5 h-3.5" />
                                    No se ha enviado el correo de bienvenida
                                  </p>
                                )}
                              </div>
                              {!u.welcomeEmailSentAt && (
                                <button
                                  onClick={(e) => { e.stopPropagation(); handleSendWelcome(u.id); }}
                                  disabled={sendingWelcome === u.id}
                                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-teal-600 hover:bg-teal-700 text-white rounded-lg transition-colors disabled:opacity-50"
                                >
                                  <Send className="w-3.5 h-3.5" />
                                  {sendingWelcome === u.id ? 'Enviando...' : 'Enviar bienvenida'}
                                </button>
                              )}
                              {u.welcomeEmailSentAt && (
                                <button
                                  onClick={(e) => { e.stopPropagation(); handleSendWelcome(u.id); }}
                                  disabled={sendingWelcome === u.id}
                                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors disabled:opacity-50"
                                  style={{ border: `1px solid ${C.cardBorder}`, color: C.textMuted }}
                                >
                                  <Send className="w-3.5 h-3.5" />
                                  {sendingWelcome === u.id ? 'Reenviando...' : 'Reenviar'}
                                </button>
                              )}
                            </div>

                            {/* Reset password button */}
                            {!u.isAdmin && (
                              <div className="rounded-lg px-3 py-2 mt-3 flex items-center justify-between"
                                style={{ background: C.subCard, border: `1px solid ${C.cardBorder}` }}>
                                <div>
                                  <p className="text-xs" style={{ color: C.textFaint }}>Contraseña</p>
                                  <p className="text-sm" style={{ color: C.textMuted }}>
                                    Enviar enlace para que el usuario elija una nueva
                                  </p>
                                </div>
                                <button
                                  onClick={(e) => { e.stopPropagation(); handleResetPassword(u.id, u.email); }}
                                  disabled={resettingPassword === u.id}
                                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-teal-600 hover:bg-teal-700 text-white rounded-lg transition-colors disabled:opacity-50"
                                >
                                  <Send className="w-3.5 h-3.5" />
                                  {resettingPassword === u.id ? 'Enviando...' : 'Resetear contraseña'}
                                </button>
                              </div>
                            )}

                            {/* ── Control de Acceso ── */}
                            {!u.isAdmin && (
                              <div className="rounded-lg px-4 py-3 mt-3"
                                style={{ background: C.subCard, border: `1px solid ${C.cardBorder}` }}>
                                <p className="text-xs font-bold mb-3" style={{ color: C.text, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                                  Control de Acceso
                                </p>

                                {/* Blocked banner */}
                                {u.blocked && (
                                  <div className="flex items-center justify-between mb-3 px-3 py-2 rounded-lg"
                                    style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)' }}>
                                    <span className="text-xs font-semibold" style={{ color: '#f87171' }}>🔴 CUENTA BLOQUEADA</span>
                                    <button
                                      disabled={updatingBlock === u.id}
                                      onClick={() => handleToggleBlock(u.id, false)}
                                      className="px-3 py-1 text-xs font-semibold rounded-md transition-colors"
                                      style={{ background: '#22c55e', color: '#fff', border: 'none', cursor: 'pointer', opacity: updatingBlock === u.id ? 0.6 : 1 }}
                                    >
                                      {updatingBlock === u.id ? '...' : 'Desbloquear'}
                                    </button>
                                  </div>
                                )}

                                {/* Module checkboxes */}
                                <p className="text-xs mb-2" style={{ color: C.textFaint, fontWeight: 600, letterSpacing: '0.04em' }}>Módulos habilitados individualmente</p>
                                <div className="grid grid-cols-2 gap-1.5 mb-3">
                                  {FEATURE_LABELS.map(({ key, label }) => {
                                    const enabled = u.featureOverrides?.[key] === true;
                                    const busy = updatingPermissions === u.id;
                                    return (
                                      <label key={key} className="flex items-center gap-2 px-2 py-1.5 rounded-md cursor-pointer transition-all"
                                        style={{
                                          background: enabled ? 'rgba(34,197,94,0.08)' : C.inputBg,
                                          border: `1px solid ${enabled ? 'rgba(34,197,94,0.35)' : C.inputBorder}`,
                                          opacity: busy ? 0.6 : 1,
                                        }}>
                                        <input
                                          type="checkbox"
                                          checked={enabled}
                                          disabled={busy}
                                          onChange={e => handleToggleFeature(u.id, key, e.target.checked)}
                                          style={{ accentColor: '#22c55e', width: 13, height: 13, cursor: 'pointer' }}
                                        />
                                        <span className="text-xs" style={{ color: C.text }}>{label}</span>
                                      </label>
                                    );
                                  })}
                                </div>

                                {/* Quick actions */}
                                <div className="flex gap-2 flex-wrap">
                                  <button
                                    disabled={updatingPermissions === u.id}
                                    onClick={() => handleGrantAll(u.id)}
                                    className="px-3 py-1 text-xs font-semibold rounded-md transition-colors disabled:opacity-50"
                                    style={{ background: '#22c55e', color: '#fff', border: 'none', cursor: 'pointer' }}
                                  >
                                    Dar todo Pro
                                  </button>
                                  <button
                                    disabled={updatingPermissions === u.id}
                                    onClick={() => handleRevokeAll(u.id)}
                                    className="px-3 py-1 text-xs rounded-md transition-colors disabled:opacity-50"
                                    style={{ background: C.inputBg, color: C.textMuted, border: `1px solid ${C.inputBorder}`, cursor: 'pointer' }}
                                  >
                                    Quitar todo
                                  </button>
                                  {!u.blocked && (
                                    <button
                                      disabled={updatingBlock === u.id}
                                      onClick={() => handleToggleBlock(u.id, true)}
                                      className="px-3 py-1 text-xs rounded-md transition-colors disabled:opacity-50"
                                      style={{ background: 'rgba(239,68,68,0.1)', color: '#f87171', border: '1px solid rgba(239,68,68,0.25)', cursor: 'pointer' }}
                                    >
                                      {updatingBlock === u.id ? '...' : 'Bloquear cuenta'}
                                    </button>
                                  )}
                                </div>

                                {/* Activar PRO manual */}
                                <div className="mt-3 pt-3 flex items-center gap-2 flex-wrap" style={{ borderTop: `1px solid ${C.cardBorder}` }}>
                                  <span className="text-xs font-semibold" style={{ color: C.textMuted }}>Activar PRO manual:</span>
                                  <input
                                    type="number"
                                    min={1}
                                    max={24}
                                    value={grantMonths}
                                    onClick={e => e.stopPropagation()}
                                    onChange={e => setGrantMonths(Math.max(1, Math.min(24, parseInt(e.target.value) || 1)))}
                                    className="w-16 px-2 py-1 text-xs rounded-md text-center focus:outline-none focus:ring-1 focus:ring-teal-400"
                                    style={{ background: C.inputBg, border: `1px solid ${C.inputBorder}`, color: C.text }}
                                  />
                                  <span className="text-xs" style={{ color: C.textFaint }}>{grantMonths === 1 ? 'mes' : 'meses'}</span>
                                  <button
                                    disabled={grantingPro === u.id}
                                    onClick={e => { e.stopPropagation(); handleGrantPro(u.id); }}
                                    className="px-3 py-1 text-xs font-semibold rounded-md transition-colors disabled:opacity-50"
                                    style={{ background: 'rgba(45,212,191,0.18)', color: '#2dd4bf', border: '1px solid rgba(45,212,191,0.3)', cursor: 'pointer' }}
                                  >
                                    {grantingPro === u.id ? '...' : '✓ Activar PRO'}
                                  </button>
                                </div>

                                {/* Activar trial Clínico */}
                                <div className="mt-3 pt-3 flex items-center gap-2 flex-wrap" style={{ borderTop: `1px solid ${C.cardBorder}` }}>
                                  <span className="text-xs font-semibold" style={{ color: C.textMuted }}>Trial Clínico (5 días):</span>
                                  <button
                                    disabled={activatingTrial === u.id}
                                    onClick={e => { e.stopPropagation(); handleActivateClinicoTrial(u.id); }}
                                    className="px-3 py-1 text-xs font-semibold rounded-md transition-colors disabled:opacity-50"
                                    style={{ background: 'rgba(168,85,247,0.18)', color: '#a855f7', border: '1px solid rgba(168,85,247,0.3)', cursor: 'pointer' }}
                                  >
                                    {activatingTrial === u.id ? '...' : '✓ Activar trial Clínico'}
                                  </button>
                                </div>
                              </div>
                            )}

                            {/* Delete user */}
                            {!u.isAdmin && (
                              <div className="mt-4 pt-4" style={{ borderTop: `1px solid ${C.cardBorder}` }}>
                                {confirmDelete === u.id ? (
                                  <div className="flex items-center gap-3">
                                    <p className="text-sm text-red-500 flex-1">¿Eliminar a <strong>{u.name}</strong> y todos sus datos?</p>
                                    <button
                                      onClick={() => handleDeleteUser(u.id)}
                                      disabled={deletingId === u.id}
                                      className="px-3 py-1.5 text-xs font-semibold bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors disabled:opacity-50"
                                    >
                                      {deletingId === u.id ? 'Eliminando...' : 'Sí, eliminar'}
                                    </button>
                                    <button
                                      onClick={() => setConfirmDelete(null)}
                                      className="px-3 py-1.5 text-xs rounded-lg transition-colors"
                                      style={{ border: `1px solid ${C.cardBorder}`, color: C.textMuted }}
                                    >
                                      Cancelar
                                    </button>
                                  </div>
                                ) : (
                                  <button
                                    onClick={() => setConfirmDelete(u.id)}
                                    className="flex items-center gap-1.5 text-xs text-red-500 hover:text-red-400 transition-colors"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                    Eliminar usuario
                                  </button>
                                )}
                              </div>
                            )}
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="px-5 py-4 flex items-center justify-between"
              style={{ borderTop: `1px solid ${C.cardBorder}` }}>
              <p className="text-xs" style={{ color: C.textFaint }}>Página {page} de {totalPages}</p>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="p-1.5 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed"
                  style={{ border: `1px solid ${C.cardBorder}`, background: C.card, color: C.text }}
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="p-1.5 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed"
                  style={{ border: `1px solid ${C.cardBorder}`, background: C.card, color: C.text }}
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

