import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Récupérer la fiche technique d'un client
export const getFicheByClientId = async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    const fiche = await prisma.ficheTechnique.findUnique({
      where: { client_id: Number(id) }, // Note: le champ dans la DB est client_id
    });
    // Si la fiche n'existe pas, on renvoie un objet vide. Le front s'en chargera.
    if (!fiche) {
      return res.status(200).json(null);
    }
    res.json(fiche); 
  } catch (error) {
    console.error("Erreur getFicheByClientId:", error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

// Créer ou Mettre à jour une fiche technique (Upsert)
export const upsertFicheByClientId = async (req: Request, res: Response) => {
  const { id } = req.params;
  const data = req.body;

  try {
    const fiche = await prisma.ficheTechnique.upsert({
      where: { client_id: Number(id) },
      // Données à mettre à jour si la fiche existe
      update: data,
      // Données à utiliser pour créer la fiche si elle n'existe pas
      create: {
        ...data,
        client_id: Number(id),
      },
    });
    res.status(200).json(fiche);
  } catch (error) {
    console.error("Erreur upsertFicheByClientId:", error);
    res.status(500).json({ message: 'Erreur lors de la sauvegarde' });
  }
};