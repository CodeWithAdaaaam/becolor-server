import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// 1. LISTE DES FOURNISSEURS (Avec calcul des dates)
export const getSuppliers = async (req: Request, res: Response) => {
  try {
    const suppliers = await prisma.supplier.findMany({
      orderBy: { name: 'asc' },
      include: {
        // On récupère la dernière dépense pour afficher les dates
        expenses: {
          orderBy: { date: 'desc' },
          take: 1,
          include: { transaction: true }
        }
      }
    });

    // On formate les données pour le frontend
    const formattedSuppliers = suppliers.map(sup => {
      const lastExpense = sup.expenses[0];
      return {
        id: sup.id,
        name: sup.name,
        phone: sup.phone,
        description: sup.notes, // On utilise le champ 'notes' pour la description
        // Dates calculées
        lastPurchase: lastExpense ? lastExpense.date : null,
        lastPayment: lastExpense?.transaction ? lastExpense.transaction.created_at : null
      };
    });

    res.json(formattedSuppliers);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Erreur récupération fournisseurs" });
  }
};

// 2. CRÉER UN FOURNISSEUR
export const createSupplier = async (req: Request, res: Response) => {
  try {
    const { name, phone, description } = req.body;

    const newSupplier = await prisma.supplier.create({
      data: {
        name,
        phone,
        notes: description // Mapping description -> notes
      }
    });

    res.status(201).json(newSupplier);
  } catch (error) {
    res.status(500).json({ message: "Erreur création" });
  }
};

// 3. MODIFIER UN FOURNISSEUR
export const updateSupplier = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, phone, description } = req.body;

    await prisma.supplier.update({
      where: { id: Number(id) },
      data: { name, phone, notes: description }
    });

    res.json({ message: "Mis à jour" });
  } catch (error) {
    res.status(500).json({ message: "Erreur mise à jour" });
  }
};

// 4. SUPPRIMER UN FOURNISSEUR
export const deleteSupplier = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    // On vérifie s'il a des dépenses liées avant de supprimer
    const hasExpenses = await prisma.expense.findFirst({ where: { supplier_id: Number(id) } });
    
    if (hasExpenses) {
        return res.status(400).json({ message: "Impossible de supprimer : ce fournisseur a des historiques d'achats." });
    }

    await prisma.supplier.delete({ where: { id: Number(id) } });
    res.json({ message: "Fournisseur supprimé" });
  } catch (error) {
    res.status(500).json({ message: "Erreur suppression" });
  }
};

export const getSupplierById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const supplier = await prisma.supplier.findUnique({
      where: { id: Number(id) },
      include: {
        // On récupère TOUTES les dépenses triées par date
        expenses: {
          orderBy: { date: 'desc' },
          include: { transaction: true } // Pour avoir le détail du paiement si besoin
        }
      }
    });

    if (!supplier) return res.status(404).json({ message: "Fournisseur introuvable" });
    res.json(supplier);
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur" });
  }
};