"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const transactionController_1 = require("../controllers/transactionController");
const router = (0, express_1.Router)();
// Route principale (Dashboard Caisse) -> Renvoie solde + 50 dernières
router.get('/', transactionController_1.getCashRegister);
// Route Historique complet (avec filtres date)
router.get('/history', transactionController_1.getTransactions);
// Nouvelle Vente
router.post('/', transactionController_1.createTransaction);
// Nouvelle Dépense
router.post('/expenses', transactionController_1.createExpense);
// Fournisseurs
router.get('/suppliers', transactionController_1.getSuppliers);
router.post('/suppliers', transactionController_1.createSupplier);
exports.default = router;
