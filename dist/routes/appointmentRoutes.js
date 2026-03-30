"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const appointmentController_1 = require("../controllers/appointmentController");
const router = (0, express_1.Router)();
// --- ROUTES ---
// 1. Récupérer tous les RDV (avec filtres query: start, end, userId, role)
router.get('/', appointmentController_1.getAppointments);
// Route pour la liste paginée (Dashboard)
router.get('/list', appointmentController_1.getAppointmentsList);
router.post('/', appointmentController_1.createAppointment);
// Cette route gère maintenant TOUTES les mises à jour (statut, prix, services, drag&drop)
router.put('/:id', appointmentController_1.updateAppointment);
router.delete('/:id', appointmentController_1.deleteAppointment);
exports.default = router;
