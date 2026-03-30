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
exports.createSupplier = exports.getSuppliers = exports.getTransactions = exports.createExpense = exports.createTransaction = exports.getCashRegister = void 0;
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
// ============================================================
// 1. UTILITAIRE : CALCULER LE SOLDE ACTUEL
// ============================================================
const calculateCurrentBalance = () => __awaiter(void 0, void 0, void 0, function* () {
    const allTransactions = yield prisma.transaction.findMany();
    let balance = 0;
    allTransactions.forEach(t => {
        // Si c'est une DEPENSE ou un RETRAIT, on soustrait
        if (t.type === 'DEPENSE' || t.type === 'RETRAIT') {
            balance -= Number(t.amount);
        }
        else {
            // REVENU, DEPOT, ENCAISSEMENT_RDV...
            balance += Number(t.amount);
        }
    });
    return balance;
});
// ============================================================
// 2. RÉCUPÉRER LE SOLDE ET L'HISTORIQUE (Pour le Dashboard)
// ============================================================
const getCashRegister = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const transactions = yield prisma.transaction.findMany({
            orderBy: { created_at: 'desc' },
            take: 50,
            include: {
                appointment: { include: { client: true } },
                items: true,
                user: true,
                expense: { include: { supplier: true } }
            }
        });
        const balance = yield calculateCurrentBalance();
        res.json({ balance, transactions });
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ message: "Erreur récupération caisse" });
    }
});
exports.getCashRegister = getCashRegister;
// ============================================================
// 3. ENCAISSEMENT (VENTE : SERVICES + PRODUITS)
// ============================================================
const createTransaction = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { items, // Tableau: [{ type: 'SERVICE'|'PRODUIT', id: 1, price: 50, quantity: 1, name: 'Coupe' }]
        client_id, // ID client (optionnel)
        client_name, // Nom (si client passant)
        user_id, // Qui a fait la vente
        payment_method, // 'ESPECES', 'CB', etc.
        amount, // Total calculé
        description, appointment_id // Si lié à un RDV existant
         } = req.body;
        // Transaction Prisma (Tout ou rien)
        const result = yield prisma.$transaction((tx) => __awaiter(void 0, void 0, void 0, function* () {
            // A. Créer la transaction financière
            const newTransaction = yield tx.transaction.create({
                data: {
                    type: 'REVENU', // C'est une entrée d'argent
                    amount: amount,
                    payment_method: payment_method || 'ESPECES',
                    client_id: client_id || null,
                    client_name: client_name || (client_id ? undefined : 'Client Passant'),
                    user_id: user_id ? Number(user_id) : null,
                    description: description || "Encaissement",
                    appointment_id: appointment_id || null,
                    // B. Détail du panier
                    items: {
                        create: items.map((item) => ({
                            type: item.type,
                            service_id: item.type === 'SERVICE' ? item.id : null,
                            product_id: item.type === 'PRODUIT' ? item.id : null,
                            name: item.name,
                            price: item.price,
                            quantity: item.quantity || 1
                        }))
                    }
                },
                include: { items: true }
            });
            // C. Mettre à jour le RDV en "TERMINE"
            if (appointment_id) {
                yield tx.appointment.update({
                    where: { id: appointment_id },
                    data: { statut: 'TERMINE' }
                });
            }
            // D. Mettre à jour le Stock (Produits)
            for (const item of items) {
                if (item.type === 'PRODUIT' && item.id) {
                    // Vérification simple si le produit existe
                    const productExists = yield tx.product.findUnique({ where: { id: item.id } });
                    if (productExists) {
                        yield tx.product.update({
                            where: { id: item.id },
                            data: { stock: { decrement: item.quantity || 1 } }
                        });
                    }
                }
            }
            return newTransaction;
        }));
        res.status(201).json(result);
    }
    catch (error) {
        console.error('Erreur encaissement:', error);
        res.status(500).json({ error: 'Erreur lors de la transaction' });
    }
});
exports.createTransaction = createTransaction;
// ============================================================
// 4. DÉPENSE (SORTIE DE CAISSE AVEC SÉCURITÉ)
// ============================================================
const createExpense = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { amount, category, description, supplier_id, payment_method, user_id } = req.body;
        const numericAmount = Number(amount);
        // --- SÉCURITÉ ANTI-NÉGATIF ---
        // On vérifie le solde avant d'autoriser la sortie
        const currentBalance = yield calculateCurrentBalance();
        if (numericAmount > currentBalance) {
            return res.status(400).json({
                message: `Impossible de sortir ${numericAmount} MAD. Il n'y a que ${currentBalance} MAD en caisse.`
            });
        }
        // ------------------------------
        const result = yield prisma.$transaction((tx) => __awaiter(void 0, void 0, void 0, function* () {
            // A. Créer la fiche dépense
            const expense = yield tx.expense.create({
                data: {
                    amount: numericAmount,
                    category,
                    description,
                    supplier_id: supplier_id ? Number(supplier_id) : null
                }
            });
            // B. Créer la transaction (Type DEPENSE)
            const transaction = yield tx.transaction.create({
                data: {
                    type: 'DEPENSE',
                    amount: numericAmount,
                    payment_method: payment_method || 'ESPECES',
                    user_id: user_id ? Number(user_id) : null,
                    description: `Sortie: ${category} - ${description}`,
                    expense_id: expense.id
                }
            });
            return transaction;
        }));
        res.status(201).json(result);
    }
    catch (error) {
        console.error('Erreur dépense:', error);
        res.status(500).json({ error: 'Impossible de créer la dépense' });
    }
});
exports.createExpense = createExpense;
// ============================================================
// 5. LISTE FILTRÉE (POUR RECHERCHE AVANCÉE)
// ============================================================
const getTransactions = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { startDate, endDate, type } = req.query;
        const whereClause = {};
        if (startDate && endDate) {
            whereClause.created_at = {
                gte: new Date(startDate),
                lte: new Date(endDate),
            };
        }
        if (type) {
            whereClause.type = type;
        }
        const transactions = yield prisma.transaction.findMany({
            where: whereClause,
            include: {
                items: true,
                user: { select: { nom: true, prenom: true } },
                client: { select: { nom: true, prenom: true } },
                expense: { include: { supplier: true } }
            },
            orderBy: { created_at: 'desc' }
        });
        res.json(transactions);
    }
    catch (error) {
        res.status(500).json({ error: 'Erreur récupération historique' });
    }
});
exports.getTransactions = getTransactions;
// ============================================================
// 6. GESTION DES FOURNISSEURS
// ============================================================
const getSuppliers = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const suppliers = yield prisma.supplier.findMany({ orderBy: { name: 'asc' } });
        res.json(suppliers);
    }
    catch (error) {
        res.status(500).json({ error: 'Erreur fournisseurs' });
    }
});
exports.getSuppliers = getSuppliers;
const createSupplier = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { name, contactName, phone, email, category, notes } = req.body;
        const supplier = yield prisma.supplier.create({
            data: { name, contactName, phone, email, category, notes }
        });
        res.status(201).json(supplier);
    }
    catch (error) {
        res.status(500).json({ error: 'Erreur création fournisseur' });
    }
});
exports.createSupplier = createSupplier;
