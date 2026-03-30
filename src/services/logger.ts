import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const logActivity = async (userId: number | null, action: string, details?: string) => {
  try {
    console.log(`📝 LOGGING: [${action}] ${details}`); // Pour voir dans le terminal

    await prisma.activityLog.create({
      data: {
        user_id: userId ? Number(userId) : null, // null = action système
        action: action,
        details: details || ''
      }
    });
  } catch (error) {
    console.error("❌ Erreur critique Logger:", error);
  }
};