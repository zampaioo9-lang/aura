import { PrismaClient } from '@prisma/client';
import { isClinicoUser, isProUser } from '../src/lib/planUtils';

const prisma = new PrismaClient();

async function main() {
  const user = await prisma.user.findUnique({
    where: { email: 'zampaio9@hotmail.com' },
    select: {
      id: true, name: true, email: true, plan: true, planExpiresAt: true, isAdmin: true,
      clinicoTrialEndsAt: true, hasUsedClinicoTrial: true, trialAudioSecondsUsed: true, trialAiNotesUsed: true,
      featureOverrides: true, createdAt: true,
    },
  });

  if (!user) {
    console.log('NO EXISTE ningún usuario con ese correo exacto: zampaio9@hotmail.com');
    const similar = await prisma.user.findMany({
      where: { email: { contains: 'zampaio', mode: 'insensitive' } },
      select: { id: true, name: true, email: true, plan: true, planExpiresAt: true, isAdmin: true },
    });
    console.log('Cuentas similares encontradas:', JSON.stringify(similar, null, 2));
    return;
  }

  console.log('Usuario encontrado:', JSON.stringify(user, null, 2));
  console.log('Fecha/hora actual del servidor:', new Date().toISOString());
  console.log('isClinicoUser (función real):', isClinicoUser(user));
  console.log('isProUser (función real):', isProUser(user));
}

main().finally(() => prisma.$disconnect());
