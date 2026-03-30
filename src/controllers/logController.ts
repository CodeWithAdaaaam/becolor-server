import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const getLogs = async (req: Request, res: Response) => {
  try {
    const logs = await prisma.activityLog.findMany({
      take: 50, // Les 50 derniers
      orderBy: { created_at: 'desc' }, // Du plus récent au plus vieux
      include: {
        user: { select: { nom: true, prenom: true } } // On veut le nom, pas juste l'ID
      }
    });
    
    // Debug : voir si le serveur trouve des logs
    console.log(`🔍 Lecture logs : ${logs.length} trouvés.`);
    
    res.json(logs);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Impossible de lire les logs" });
  }
};