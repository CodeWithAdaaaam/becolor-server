"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const clientController_1 = require("../controllers/clientController");
// --- 1. IMPORTER LES NOUVELLES FONCTIONS ---
const ficheController_1 = require("../controllers/ficheController");
const router = express_1.default.Router();
// --- Routes existantes pour le Client ---
router.get('/', clientController_1.getClients);
router.get('/:id', clientController_1.getClientById);
router.post('/', clientController_1.createClient);
router.put('/:id', clientController_1.updateClient);
router.delete('/:id', clientController_1.deleteClient);
// --- Routes existantes pour les anciennes notes ---
router.get('/:id/coloration-notes', clientController_1.getClientNotes);
router.put('/:id/notes', clientController_1.updateClientNotes);
router.post('/:clientId/history/:appointmentId', clientController_1.saveAppointmentHistory);
// --- 2. AJOUTER LES NOUVELLES ROUTES POUR LA FICHE TECHNIQUE ---
router.get('/:id/fiche', ficheController_1.getFicheByClientId);
router.post('/:id/fiche', ficheController_1.upsertFicheByClientId); // On utilise POST car il peut créer ou mettre à jour
exports.default = router;
