# Cómo funcionan los horarios: General y por Servicio

## Dos niveles de configuración

**Nivel 1 — Horario general del profesional**
Configurado en la sección "Disponibilidad" del panel de agendamiento. Define los días y franjas en que el profesional trabaja en general.
Ejemplo: Lunes a Viernes de 9:00 a 18:00.

**Nivel 2 — Horario específico por servicio**
Configurado dentro de cada servicio (sección "Servicios" → clic en un servicio → días disponibles). Permite que un servicio concreto tenga su propio horario, diferente al general.
Ejemplo: "Consulta de pareja" solo disponible Sábados de 10:00 a 14:00.

---

## Regla de prioridad — override total

Cuando el cliente abre el selector de horarios para reservar, el sistema aplica esta lógica:

```
¿El servicio tiene horarios propios configurados?
  ✅ SÍ → usa SOLO esos horarios (el horario general se ignora por completo)
  ❌ NO → usa el horario general del profesional
```

Es un **reemplazo total**, no una combinación. Si un servicio tiene horarios propios, el horario general deja de aplicar para ese servicio.

---

## Ejemplos prácticos

| Configuración | Lo que ve el cliente al reservar |
|---|---|
| General: Lun–Vie 9–18. Servicio sin horario propio | Slots disponibles Lun–Vie 9–18 |
| General: Lun–Vie 9–18. Servicio: Sáb 10–14 | Slots disponibles **solo** Sáb 10–14 |
| General: Lun–Vie 9–18. Servicio: Lun 9–12 | Slots disponibles **solo** Lun 9–12 |

---

## Lo que siempre aplica (sin excepción)

Sin importar si el servicio usa horario general o propio, estas reglas siempre se respetan:

- **Bloqueos de fechas** (días o rangos bloqueados en la tab "Bloqueos") — anulan cualquier disponibilidad.
- **Buffer entre citas** — el tiempo mínimo de separación entre reservas configurado en "Reglas".
- **Anticipación mínima** — cuántas horas de antelación se requieren para reservar.
- **Citas ya existentes** — los horarios ocupados por otras reservas no se muestran.

---

## Recomendación para el profesional

- Si todos tus servicios tienen el mismo horario de atención → configura solo el horario general y deja los servicios sin horario propio.
- Si un servicio se ofrece en días u horas distintas al resto → configura ese servicio con su horario específico.
- No es necesario configurar horarios en todos los servicios, solo en los que sean diferentes al general.
