// server/src/controllers/transactionController.ts
import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// ============================================================
// 1. UTILITAIRE : CALCULER LE SOLDE ACTUEL
// ============================================================
const calculateCurrentBalance = async () => {
  const allTransactions = await prisma.transaction.findMany();
  let balance = 0;
  allTransactions.forEach(t => {
    // Si c'est une DEPENSE ou un RETRAIT, on soustrait
    if (t.type === 'DEPENSE' || t.type === 'RETRAIT') {
        balance -= Number(t.amount);
    } else {
        // REVENU, DEPOT, ENCAISSEMENT_RDV...
        balance += Number(t.amount);
    }
  });
  return balance;
};

// ============================================================
// 2. RÉCUPÉRER LE SOLDE ET L'HISTORIQUE (Pour le Dashboard)
// ============================================================
export const getCashRegister = async (req: Request, res: Response) => {
  try {
    const transactions = await prisma.transaction.findMany({
      orderBy: { created_at: 'desc' },
      take: 50,
      include: {
        appointment: { include: { client: true } },
        items: true,
        user: true,
        expense: { include: { supplier: true } }
      }
    });

    const balance = await calculateCurrentBalance();

    res.json({ balance, transactions });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Erreur récupération caisse" });
  }
};

// ============================================================
// 3. ENCAISSEMENT (VENTE : SERVICES + PRODUITS)
// ============================================================
export const createTransaction = async (req: Request, res: Response) => {
  try {
    const { 
      items,            // Tableau: [{ type: 'SERVICE'|'PRODUIT', id: 1, price: 50, quantity: 1, name: 'Coupe' }]
      client_id,        // ID client (optionnel)
      client_name,      // Nom (si client passant)
      user_id,          // Qui a fait la vente
      payment_method,   // 'ESPECES', 'CB', etc.
      amount,           // Total calculé
      description,
      appointment_id    // Si lié à un RDV existant
    } = req.body;

    // Transaction Prisma (Tout ou rien)
    const result = await prisma.$transaction(async (tx) => {
      
      // A. Créer la transaction financière
      const newTransaction = await tx.transaction.create({
        data: {
          type: 'REVENU', // C'est une entrée d'argent
          amount: amount,
          payment_method: payment_method || 'ESPECES',
          client_id: client_id || null,
          client_name: client_name || (client_id ? undefined : 'Client Passant'),
          user_id: user_id ? Number(user_id) : null,
          description: description || "Encaissement",
          appointment_id: appointment_id || null,
          
          // B. Détail du panier
          items: {
            create: items.map((item: any) => ({
              type: item.type,
              service_id: item.type === 'SERVICE' ? item.id : null,
              product_id: item.type === 'PRODUIT' ? item.id : null,
              name: item.name,
              price: item.price,
              quantity: item.quantity || 1
            }))
          }
        },
        include: { items: true }
      });

      // C. Mettre à jour le RDV en "TERMINE"
      if (appointment_id) {
        await tx.appointment.update({
          where: { id: appointment_id },
          data: { statut: 'TERMINE' }
        });
      }

      // D. Mettre à jour le Stock (Produits)
      for (const item of items) {
        if (item.type === 'PRODUIT' && item.id) {
            // Vérification simple si le produit existe
            const productExists = await tx.product.findUnique({ where: { id: item.id }});
            if (productExists) {
                await tx.product.update({
                    where: { id: item.id },
                    data: { stock: { decrement: item.quantity || 1 } }
                });
            }
        }
      }

      return newTransaction;
    });
    
    res.status(201).json(result);
  } catch (error) {
    console.error('Erreur encaissement:', error);
    res.status(500).json({ error: 'Erreur lors de la transaction' });
  }
};

// ============================================================
// 4. DÉPENSE (SORTIE DE CAISSE AVEC SÉCURITÉ)
// ============================================================
export const createExpense = async (req: Request, res: Response) => {
  try {
    const { 
      amount, 
      category, 
      description, 
      supplier_id, 
      payment_method,
      user_id 
    } = req.body;

    const numericAmount = Number(amount);

    // --- SÉCURITÉ ANTI-NÉGATIF ---
    // On vérifie le solde avant d'autoriser la sortie
    const currentBalance = await calculateCurrentBalance();
    
    if (numericAmount > currentBalance) {
        return res.status(400).json({ 
            message: `Impossible de sortir ${numericAmount} MAD. Il n'y a que ${currentBalance} MAD en caisse.` 
        });
    }
    // ------------------------------

    const result = await prisma.$transaction(async (tx) => {
      // A. Créer la fiche dépense
      const expense = await tx.expense.create({
        data: {
          amount: numericAmount,
          category,
          description,
          supplier_id: supplier_id ? Number(supplier_id) : null
        }
      });

      // B. Créer la transaction (Type DEPENSE)
      const transaction = await tx.transaction.create({
        data: {
          type: 'DEPENSE',
          amount: numericAmount, 
          payment_method: payment_method || 'ESPECES',
          user_id: user_id ? Number(user_id) : null,
          description: `Sortie: ${category} - ${description}`,
          expense_id: expense.id
        }
      });

      return transaction;
    });

    res.status(201).json(result);
  } catch (error) {
    console.error('Erreur dépense:', error);
    res.status(500).json({ error: 'Impossible de créer la dépense' });
  }
};

// ============================================================
// 5. LISTE FILTRÉE (POUR RECHERCHE AVANCÉE)
// ============================================================
export const getTransactions = async (req: Request, res: Response) => {
  try {
    const { startDate, endDate, type } = req.query;
    const whereClause: any = {};

    if (startDate && endDate) {
      whereClause.created_at = {
        gte: new Date(startDate as string),
        lte: new Date(endDate as string),
      };
    }

    if (type) { whereClause.type = type; }

    const transactions = await prisma.transaction.findMany({
      where: whereClause,
      include: {
        items: true,
        user: { select: { nom: true, prenom: true } },
        client: { select: { nom: true, prenom: true } },
        expense: { include: { supplier: true } }
      },
      orderBy: { created_at: 'desc' }
    });

    res.json(transactions);
  } catch (error) {
    res.status(500).json({ error: 'Erreur récupération historique' });
  }
};

// ============================================================
// 6. GESTION DES FOURNISSEURS
// ============================================================
export const getSuppliers = async (req: Request, res: Response) => {
  try {
    const suppliers = await prisma.supplier.findMany({ orderBy: { name: 'asc' } });
    res.json(suppliers);
  } catch (error) {
    res.status(500).json({ error: 'Erreur fournisseurs' });
  }
};

export const createSupplier = async (req: Request, res: Response) => {
  try {
    const { name, contactName, phone, email, category, notes } = req.body;
    const supplier = await prisma.supplier.create({
      data: { name, contactName, phone, email, category, notes }
    });
    res.status(201).json(supplier);
  } catch (error) {
    res.status(500).json({ error: 'Erreur création fournisseur' });
  }
};