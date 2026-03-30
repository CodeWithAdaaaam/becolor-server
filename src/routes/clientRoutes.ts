import express from 'express';
import { 
    getClients, 
    getClientById, 
    createClient, 
    updateClient, 
    deleteClient,
    updateClientNotes,
    saveAppointmentHistory,
    getClientNotes
} from '../controllers/clientController';

// --- 1. IMPORTER LES NOUVELLES FONCTIONS ---
import { 
    getFicheByClientId, 
    upsertFicheByClientId 
} from '../controllers/ficheController';

const router = express.Router();

// --- Routes existantes pour le Client ---
router.get('/', getClients);
router.get('/:id', getClientById);
router.post('/', createClient);
router.put('/:id', updateClient);
router.delete('/:id', deleteClient);

// --- Routes existantes pour les anciennes notes ---
router.get('/:id/coloration-notes', getClientNotes);
router.put('/:id/notes', updateClientNotes);
router.post('/:clientId/history/:appointmentId', saveAppointmentHistory);

// --- 2. AJOUTER LES NOUVELLES ROUTES POUR LA FICHE TECHNIQUE ---
router.get('/:id/fiche', getFicheByClientId);
router.post('/:id/fiche', upsertFicheByClientId); // On utilise POST car il peut créer ou mettre à jour

export default router;