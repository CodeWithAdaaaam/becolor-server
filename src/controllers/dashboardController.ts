// server/src/controllers/dashboardController.ts
import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const getDashboardStats = async (req: Request, res: Response) => {
  try {
    // Définir le début et la fin de la journée actuelle
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // 1. Calculer le Chiffre d'Affaires du jour (RDV terminés)
    const dailyRevenue = await prisma.appointment.aggregate({
      _sum: {
        prix: true,
      },
      where: {
        date: {
          gte: today,
          lt: tomorrow,
        },
        statut: 'TERMINE', // On ne compte que les RDV payés
      },
    });

    // 2. Compter les RDV du jour (tous statuts confondus)
    const dailyAppointments = await prisma.appointment.count({
      where: {
        date: {
          gte: today,
          lt: tomorrow,
        },
      },
    });

    // 3. Compter les nouvelles clientes créées aujourd'hui
    const newClientsToday = await prisma.client.count({
      where: {
        created_at: {
          gte: today,
          lt: tomorrow,
        },
      },
    });

    // 4. Récupérer les 5 prochains RDV
    const upcomingAppointments = await prisma.appointment.findMany({
      where: {
        heure_debut: {
          gte: new Date(), // A partir de maintenant
        },
        statut: 'CONFIRME',
      },
      take: 5,
      orderBy: {
        heure_debut: 'asc',
      },
      include: {
        client: { select: { nom: true, prenom: true } },
        services: { select: { nom: true } },
      },
    });
    
    // Renvoyer toutes les stats
    res.json({
      dailyRevenue: dailyRevenue._sum.prix || 0,
      dailyAppointments: dailyAppointments,
      newClientsToday: newClientsToday,
      upcomingAppointments: upcomingAppointments,
    });

  } catch (error) {
    console.error("Erreur getDashboardStats:", error);
    res.status(500).json({ message: "Erreur serveur lors du calcul des stats." });
  }
};