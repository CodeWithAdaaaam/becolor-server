import { Router } from 'express';
import { getDashboardStats, getFinancialStats } from '../controllers/statsController';

const router = Router();

// Route pour l'accueil (Dashboard simple) -> /api/stats/dashboard
router.get('/dashboard', getDashboardStats);

// Route pour la page Stats Avancées -> /api/stats
router.get('/', getFinancialStats);

export default router;