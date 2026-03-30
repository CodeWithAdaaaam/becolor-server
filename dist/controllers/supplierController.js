"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getSupplierById = exports.deleteSupplier = exports.updateSupplier = exports.createSupplier = exports.getSuppliers = void 0;
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
// 1. LISTE DES FOURNISSEURS (Avec calcul des dates)
const getSuppliers = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const suppliers = yield prisma.supplier.findMany({
            orderBy: { name: 'asc' },
            include: {
                // On récupère la dernière dépense pour afficher les dates
                expenses: {
                    orderBy: { date: 'desc' },
                    take: 1,
                    include: { transaction: true }
                }
            }
        });
        // On formate les données pour le frontend
        const formattedSuppliers = suppliers.map(sup => {
            const lastExpense = sup.expenses[0];
            return {
                id: sup.id,
                name: sup.name,
                phone: sup.phone,
                description: sup.notes, // On utilise le champ 'notes' pour la description
                // Dates calculées
                lastPurchase: lastExpense ? lastExpense.date : null,
                lastPayment: (lastExpense === null || lastExpense === void 0 ? void 0 : lastExpense.transaction) ? lastExpense.transaction.created_at : null
            };
        });
        res.json(formattedSuppliers);
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ message: "Erreur récupération fournisseurs" });
    }
});
exports.getSuppliers = getSuppliers;
// 2. CRÉER UN FOURNISSEUR
const createSupplier = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { name, phone, description } = req.body;
        const newSupplier = yield prisma.supplier.create({
            data: {
                name,
                phone,
                notes: description // Mapping description -> notes
            }
        });
        res.status(201).json(newSupplier);
    }
    catch (error) {
        res.status(500).json({ message: "Erreur création" });
    }
});
exports.createSupplier = createSupplier;
// 3. MODIFIER UN FOURNISSEUR
const updateSupplier = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const { name, phone, description } = req.body;
        yield prisma.supplier.update({
            where: { id: Number(id) },
            data: { name, phone, notes: description }
        });
        res.json({ message: "Mis à jour" });
    }
    catch (error) {
        res.status(500).json({ message: "Erreur mise à jour" });
    }
});
exports.updateSupplier = updateSupplier;
// 4. SUPPRIMER UN FOURNISSEUR
const deleteSupplier = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        // On vérifie s'il a des dépenses liées avant de supprimer
        const hasExpenses = yield prisma.expense.findFirst({ where: { supplier_id: Number(id) } });
        if (hasExpenses) {
            return res.status(400).json({ message: "Impossible de supprimer : ce fournisseur a des historiques d'achats." });
        }
        yield prisma.supplier.delete({ where: { id: Number(id) } });
        res.json({ message: "Fournisseur supprimé" });
    }
    catch (error) {
        res.status(500).json({ message: "Erreur suppression" });
    }
});
exports.deleteSupplier = deleteSupplier;
const getSupplierById = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const supplier = yield prisma.supplier.findUnique({
            where: { id: Number(id) },
            include: {
                // On récupère TOUTES les dépenses triées par date
                expenses: {
                    orderBy: { date: 'desc' },
                    include: { transaction: true } // Pour avoir le détail du paiement si besoin
                }
            }
        });
        if (!supplier)
            return res.status(404).json({ message: "Fournisseur introuvable" });
        res.json(supplier);
    }
    catch (error) {
        res.status(500).json({ message: "Erreur serveur" });
    }
});
exports.getSupplierById = getSupplierById;
