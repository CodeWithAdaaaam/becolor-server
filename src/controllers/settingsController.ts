// server/controllers/settingsController.ts
import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// ============================================================
// 1. LIRE LES HORAIRES (AVEC INITIALISATION AUTOMATIQUE)
// ============================================================
export const getHours = async (req: Request, res: Response) => {
  try {
    // On récupère les jours triés de 0 (Dimanche) à 6 (Samedi)
    let hours = await prisma.openingHour.findMany({
      orderBy: { day: 'asc' }
    });

    // --- SÉCURITÉ : Si la table est vide, on l'initialise ---
    if (hours.length === 0) {
      console.log("🛠️ Initialisation des horaires par défaut...");
      const defaultHours = [0, 1, 2, 3, 4, 5, 6].map(day => ({
        day,
        morningOpen: "10:00",
        morningClose: "13:00",
        afternoonOpen: "14:00",
        afternoonClose: "20:00",
        isOpen: day !== 0 // Fermé le dimanche par défaut
      }));

      await prisma.openingHour.createMany({
        data: defaultHours
      });

      // On récupère les données fraîchement créées
      hours = await prisma.openingHour.findMany({
        orderBy: { day: 'asc' }
      });
    }
    // -------------------------------------------------------

    res.json(hours);
  } catch (error) {
    console.error("Erreur getHours:", error);
    res.status(500).json({ message: "Erreur récupération horaires" });
  }
};

// ============================================================
// 2. METTRE À JOUR LES HORAIRES (DOUBLE SESSION)
// ============================================================
export const updateHours = async (req: Request, res: Response) => {
  try {
    const updates = req.body; // Tableau des 7 jours envoyé par le frontend
    
    // On utilise une boucle pour mettre à jour chaque jour
    for (const dayData of updates) {
      await prisma.openingHour.update({
        where: { day: dayData.day }, 
        data: {
          isOpen: dayData.isOpen,
          morningOpen: dayData.morningOpen,
          morningClose: dayData.morningClose,
          afternoonOpen: dayData.afternoonOpen,
          afternoonClose: dayData.afternoonClose,
        }
      });
    }
    
    res.json({ message: "Horaires mis à jour avec succès" });
  } catch (error) {
    console.error("❌ ERREUR SAUVEGARDE HORAIRES :", error);
    res.status(500).json({ message: "Erreur sauvegarde horaires" });
  }
};

// ============================================================
// 3. LIRE UN PARAMÈTRE GÉNÉRIQUE (ex: onlineBookingActive)
// ============================================================
export const getSetting = async (req: Request, res: Response) => {
  try {
    const key = req.params.key as string;

    let setting = await prisma.setting.findUnique({ where: { key } });
    
    // Si le paramètre n'existe pas, on renvoie une valeur par défaut
    if (!setting) {
        return res.json({ active: true });
    }
    
    res.json(setting.value);
  } catch (error) {
    console.error("Erreur getSetting:", error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

// ============================================================
// 4. METTRE À JOUR UN PARAMÈTRE GÉNÉRIQUE
// ============================================================
export const updateSetting = async (req: Request, res: Response) => {
  try {
    const key = req.params.key as string;
    const value = req.body; 

    await prisma.setting.upsert({
      where: { key },
      update: { value },
      create: { key, value },
    });
    
    res.json({ message: "Paramètre mis à jour" });
  } catch (error) {
    console.error("Erreur updateSetting:", error);
    res.status(500).json({ message: 'Erreur de mise à jour' });
  }
};