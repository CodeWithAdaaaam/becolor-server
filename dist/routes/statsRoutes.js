"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const statsController_1 = require("../controllers/statsController");
const router = (0, express_1.Router)();
// Route pour l'accueil (Dashboard simple) -> /api/stats/dashboard
router.get('/dashboard', statsController_1.getDashboardStats);
// Route pour la page Stats Avancées -> /api/stats
router.get('/', statsController_1.getFinancialStats);
exports.default = router;
