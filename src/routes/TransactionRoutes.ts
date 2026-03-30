import { Router } from 'express';
import { 
  createTransaction, 
  createExpense, 
  getCashRegister, // On utilise celle-ci pour le Dashboard
  getTransactions, // On utilise celle-ci pour l'historique filtré
  getSuppliers,
  createSupplier 
} from '../controllers/transactionController';

const router = Router();

// Route principale (Dashboard Caisse) -> Renvoie solde + 50 dernières
router.get('/', getCashRegister); 

// Route Historique complet (avec filtres date)
router.get('/history', getTransactions);

// Nouvelle Vente
router.post('/', createTransaction);

// Nouvelle Dépense
router.post('/expenses', createExpense);

// Fournisseurs
router.get('/suppliers', getSuppliers);
router.post('/suppliers', createSupplier);

export default router;