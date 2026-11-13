import { Router } from 'express';
import Anthropic from '@anthropic-ai/sdk';
import { PrismaClient } from '@prisma/client';
import { AppError } from '../middleware/errorHandler';

const router = Router();
const prisma = new PrismaClient();

router.post('/match', async (req, res, next) => {
  try {
    const { answers } = req.body as {
      answers: { q1: string; q2: string; q3: string; q4: string; q5: string };
    };

    if (!answers?.q1) throw new AppError(400, 'Las respuestas son requeridas');

    const ip = ((req.headers['x-forwarded-for'] as string) || '').split(',')[0].trim() || req.socket.remoteAddress || 'unknown';
    const today = new Date().toISOString().split('T')[0];
    const rlKey = `match:${ip}:${today}`;

    const existing = await prisma.rateLimit.findUnique({ where: { key: rlKey } });
    if (existing && existing.count >= 3) {
      throw new AppError(429, 'Has alcanzado el límite de 3 búsquedas por día. Vuelve mañana.');
    }
    await prisma.rateLimit.upsert({
      where: { key: rlKey },
      update: { count: { increment: 1 } },
      create: { key: rlKey, count: 1, expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) },
    });

    const profiles = await prisma.profile.findMany({
      where: { published: true },
      select: {
        id: true,
        slug: true,
        title: true,
        bio: true,
        city: true,
        country: true,
        modality: true,
        therapeuticApproaches: true,
        problematics: true,
        populations: true,
        pricePerSession: true,
        sessionCurrency: true,
        avatar: true,
        yearsExperience: true,
      },
    });

    const qualifiedProfiles = profiles.filter(p =>
      p.therapeuticApproaches.length > 0 || p.populations.length > 0 || !!p.bio
    );

    if (qualifiedProfiles.length === 0) {
      return res.json({ matches: [] });
    }

    const therapistList = qualifiedProfiles.map((p: typeof profiles[0], i: number) =>
      `[${i + 1}] ID: ${p.id}
Nombre: ${p.title}
Bio: ${p.bio ?? 'No especificada'}
Ciudad: ${p.city ?? 'No especificada'}, ${p.country ?? ''}
Modalidad: ${p.modality ?? 'No especificada'}
Enfoques terapéuticos: ${p.therapeuticApproaches.join(', ') || 'No especificados'}
Problemáticas que atiende: ${p.problematics.join(', ') || 'No especificadas'}
Poblaciones: ${p.populations.join(', ') || 'No especificadas'}
Años de experiencia: ${p.yearsExperience ?? 'No especificados'}`
    ).join('\n\n');

    const patientContext = `
1. Motivo principal (su problemática, el dato MÁS importante) → ${answers.q1}
2. Modalidad preferida → ${answers.q2}
3. Para quién es la terapia → ${answers.q3}
4. Ubicación donde busca terapeuta → ${answers.q4 || 'Sin preferencia de ubicación / abierto a cualquier lugar'}
5. Enfoque terapéutico preferido (puede incluir otras preferencias: idioma, horarios, etc.) → ${answers.q5}`.trim();

    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

    const message = await client.messages.create({
      model: 'claude-opus-4-8',
      max_tokens: 2048,
      messages: [{
        role: 'user',
        content: `Eres un sistema experto en matching terapeuta-paciente. Analiza las respuestas del paciente y los perfiles de terapeutas disponibles, y devuelve una lista rankeada de los más compatibles.

RESPUESTAS DEL PACIENTE:
${patientContext}

TERAPEUTAS DISPONIBLES:
${therapistList}

Instrucciones:
- El criterio MÁS IMPORTANTE es qué tan bien la bio, enfoques terapéuticos y problemáticas de cada terapeuta responden al motivo principal del paciente (punto 1). Prioriza esto por encima de todo lo demás.
- Usa como criterios de refuerzo, no determinantes: modalidad preferida, para quién es la terapia, ubicación (si el paciente especificó ciudad y prefiere modalidad presencial o "me da igual", da preferencia a terapeutas de esa misma ciudad), y las otras preferencias mencionadas.
- Un terapeuta muy compatible con el motivo principal pero en otra ciudad u modalidad distinta puede seguir rankeando alto, sobre todo si ofrece modalidad en línea.
- Devuelve los TOP ${Math.min(qualifiedProfiles.length, 5)} más compatibles
- Si hay menos de 5 terapeutas totales, devuelve todos
- Para cada uno incluye un score del 0 al 100 y una razón breve (máx 2 oraciones en español) de por qué es compatible

Responde ÚNICAMENTE con un JSON válido, sin texto adicional, sin markdown:
{
  "matches": [
    { "profileId": "...", "score": 92, "reason": "..." },
    ...
  ]
}`,
      }],
    });

    const text = message.content[0].type === 'text' ? message.content[0].text : '';
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new AppError(500, 'La IA no devolvió un JSON válido');

    const { matches } = JSON.parse(jsonMatch[0]) as {
      matches: { profileId: string; score: number; reason: string }[];
    };

    const profileMap = new Map(qualifiedProfiles.map((p: typeof profiles[0]) => [p.id, p]));
    const enriched = matches.map(m => ({
      ...m,
      profile: profileMap.get(m.profileId) ?? null,
    })).filter(m => m.profile !== null);

    const lead = await prisma.matchLead.create({
      data: {
        answers,
        matchedProfileIds: enriched.map(m => m.profileId),
      },
    });

    res.json({ matches: enriched, leadId: lead.id });
  } catch (err: any) {
    console.error('AI MATCHING ERROR:', err?.message, err?.status, err?.stack?.slice(0, 500));
    next(err);
  }
});

export default router;
