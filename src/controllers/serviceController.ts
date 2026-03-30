// server/controllers/serviceController.ts
import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// 1. Récupérer tous les services
export const getServices = async (req: Request, res: Response) => {
  try {
    const services = await prisma.service.findMany({
      orderBy: { nom: 'asc' } // Trié par ordre alphabétique
    });
    res.json(services);
  } catch (error) {
    res.status(500).json({ message: "Erreur lors de la récupération des services" });
  }
};

// 2. Créer un service
export const createService = async (req: Request, res: Response) => {
  try {
    const { nom, duree, prix, couleur } = req.body;
    
    const newService = await prisma.service.create({
      data: {
        nom,
        duree: Number(duree), // On s'assure que c'est un nombre
        prix: Number(prix),
        couleur,
        actif: true
      }
    });
    
    res.status(201).json(newService);
  } catch (error) {
    res.status(500).json({ message: "Erreur lors de la création du service" });
  }
};

// 3. Supprimer un service
export const deleteService = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await prisma.service.delete({
      where: { id: Number(id) }
    });
    res.json({ message: "Service supprimé" });
  } catch (error) {
    res.status(500).json({ message: "Impossible de supprimer (peut-être lié à des RDV)" });
  }
};

export const updateService = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { nom, category, prix, duree, couleur, is_starting_price } = req.body;

  try {
    const updated = await prisma.service.update({
      where: { id: Number(id) },
      data: {
        nom,
        category,
        prix: Number(prix),
        duree: Number(duree),
        couleur,
        is_starting_price: Boolean(is_starting_price) // Mise à jour du nouveau champ
      }
    });
    res.json(updated);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Erreur lors de la mise à jour du service" });
  }
};