import { Router } from 'express';
import { 
  getAppointments, 
  createAppointment, 
  updateAppointment, 
  deleteAppointment,
  getAppointmentsList
} from '../controllers/appointmentController';

const router = Router();

// --- ROUTES ---

// 1. Récupérer tous les RDV (avec filtres query: start, end, userId, role)
router.get('/', getAppointments);

// Route pour la liste paginée (Dashboard)
router.get('/list', getAppointmentsList);

router.post('/', createAppointment);

// Cette route gère maintenant TOUTES les mises à jour (statut, prix, services, drag&drop)
router.put('/:id', updateAppointment);

router.delete('/:id', deleteAppointment);



export default router;