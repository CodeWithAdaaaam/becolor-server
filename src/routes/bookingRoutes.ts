import express from 'express';
import { getAvailableSlots, createPublicBooking } from '../controllers/bookingController';

const router = express.Router();

// GET /api/booking/slots -> Pour chercher les créneaux
router.get('/slots', getAvailableSlots);

// POST /api/booking/create -> Pour valider le formulaire
router.post('/create', createPublicBooking);

export default router;