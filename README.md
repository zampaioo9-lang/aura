# Aura

Plataforma de reservas y gestión de citas para profesionales independientes. Los clientes pueden explorar un directorio de profesionales, ver sus servicios y reservar citas. Los profesionales pueden gestionar sus reservas, servicios y disponibilidad.

## Arquitectura

| Componente | Tecnología | Ubicación |
|-----------|------------|-----------|
| Backend | Express + Prisma + PostgreSQL | Desplegado en Vercel |
| Frontend Web | React + Vite | `frontend/` |
| App Móvil | Expo React Native (TypeScript) | `mobile/` |

**Backend URL:** `https://backend-one-neon-96.vercel.app`

## App Móvil

### Funcionalidades

**Para clientes:**
- Registro e inicio de sesión con JWT
- Directorio de profesionales organizado por categorías y profesiones
- Buscador de profesiones con filtrado en tiempo real
- Visualización de perfiles y servicios
- Reserva de citas con selector de fecha y hora disponible
- Historial de reservas con filtros por estado
- Cancelación de reservas

**Para profesionales:**
- Creación de perfil profesional con +130 profesiones predefinidas
- Dashboard con estadísticas de citas
- Gestión de citas (confirmar, cancelar, completar, marcar no-show)
- CRUD de servicios (nombre, descripción, duración, precio)
- Configuración de disponibilidad semanal por día y horario

### Estructura

```
mobile/
├── app/                    # Pantallas (Expo Router file-based routing)
│   ├── index.tsx           # Welcome screen
│   ├── (auth)/             # Login y registro
│   ├── (tabs)/             # Tabs cliente: Explorar, Reservas, Perfil
│   └── (admin)/            # Tabs admin: Dashboard, Citas, Servicios, Horarios
├── components/             # Componentes reutilizables
│   ├── ui/                 # Button, Input, Card
│   ├── BookingCard.tsx     # Tarjeta de reserva
│   ├── ServiceCard.tsx     # Tarjeta de servicio
│   ├── SlotPicker.tsx      # Selector de fecha/hora
│   └── ProfessionPicker.tsx # Selector de profesión por categoría
├── lib/                    # Utilidades
│   ├── api.ts              # Cliente axios con JWT interceptor
│   ├── auth.tsx            # AuthContext + SecureStore
│   ├── theme.ts            # Colores, spacing, tipografía
│   ├── types.ts            # Interfaces TypeScript
│   └── professions.ts      # Catálogo de 130+ profesiones en 13 categorías
├── app.json
├── package.json
└── tsconfig.json
```

### Instalación y ejecución

```bash
cd mobile
npm install
npx expo start
```

Escanear el QR con [Expo Go](https://expo.dev/go) en tu celular (Android/iOS).

### Dependencias principales

- **expo-router** - Navegación file-based
- **expo-secure-store** - Almacenamiento seguro de JWT
- **axios** - Cliente HTTP
- **lucide-react-native** - Iconos
- **react-native-safe-area-context** - Safe area
- **react-native-screens** - Navegación nativa

### Tema visual

Dark theme con acentos amber/gold, consistente con el frontend web.

| Token | Valor |
|-------|-------|
| Background | `#0a0a0f` |
| Surface | `#141419` |
| Amber | `#f59e0b` |
| Text | `#f5f5f7` |

## API Endpoints utilizados

| Funcionalidad | Endpoint | Método |
|--------------|----------|--------|
| Login | `/api/auth/login` | POST |
| Registro | `/api/auth/register` | POST |
| Usuario actual | `/api/auth/me` | GET |
| Perfil propio | `/api/profiles/me` | GET |
| Crear perfil | `/api/profiles` | POST |
| Listar perfiles | `/api/profiles` | GET |
| Servicios propios | `/api/services/me` | GET |
| Crear servicio | `/api/services` | POST |
| Editar servicio | `/api/services/:id` | PUT |
| Eliminar servicio | `/api/services/:id` | DELETE |
| Slots disponibles | `/api/bookings/available-slots` | GET |
| Crear reserva | `/api/bookings` | POST |
| Reservas del cliente | `/api/bookings/client/:email` | GET |
| Reservas del profesional | `/api/bookings/professional` | GET |
| Confirmar cita | `/api/bookings/:id/confirm` | PUT |
| Cancelar cita | `/api/bookings/:id/cancel` | PUT |
| Completar cita | `/api/bookings/:id/complete` | PUT |
| No-show | `/api/bookings/:id/no-show` | PUT |
| Disponibilidad propia | `/api/availability/me` | GET |
| Crear disponibilidad | `/api/availability/bulk` | POST |
| Eliminar disponibilidad | `/api/availability/:id` | DELETE |

## Categorías de profesiones

Salud y Bienestar, Salud Mental, Belleza y Estética, Bienestar y Relajación, Fitness y Deporte, Tecnología y Digital, Educación y Formación, Construcción y Hogar, Servicios Profesionales, Automotriz, Mascotas, Eventos y Entretenimiento, Otros.

## Licencia

MIT
