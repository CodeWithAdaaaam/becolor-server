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
exports.getFinancialStats = exports.getDashboardStats = void 0;
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
// =======================================================================
// 1. STATS ACCUEIL (Basique : Basé sur RDV et Agenda)
// =======================================================================
const getDashboardStats = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
        // CA du jour (RDV uniquement)
        const dailyRevenue = yield prisma.appointment.aggregate({
            where: { date: { gte: today, lt: tomorrow }, statut: { not: 'ANNULE' } },
            _sum: { prix: true }
        });
        // CA du mois (RDV uniquement)
        const monthlyRevenue = yield prisma.appointment.aggregate({
            where: { date: { gte: firstDayOfMonth }, statut: { not: 'ANNULE' } },
            _sum: { prix: true }
        });
        // Nombre RDV jour
        const dailyCount = yield prisma.appointment.count({
            where: { date: { gte: today, lt: tomorrow }, statut: { not: 'ANNULE' } }
        });
        // Prochains RDV
        const upcoming = yield prisma.appointment.findMany({
            where: {
                date: { gte: today, lt: tomorrow },
                statut: { not: 'ANNULE' },
                heure_debut: { gte: new Date() }
            },
            include: {
                client: { select: { prenom: true, nom: true } },
                services: { select: { nom: true } }, // ✅ CORRECTION : Pluriel
                user: { select: { prenom: true } }
            },
            orderBy: { heure_debut: 'asc' },
            take: 5
        });
        // ✅ CORRECTION TOP SERVICES : 
        // On utilise TransactionItem car Appointment n'a plus de colonne service_id unique
        const topServicesRaw = yield prisma.transactionItem.groupBy({
            by: ['service_id', 'name'],
            where: {
                type: 'SERVICE',
                transaction: { created_at: { gte: firstDayOfMonth } }
            },
            _count: { service_id: true },
            _sum: { price: true },
            orderBy: { _count: { service_id: 'desc' } },
            take: 3
        });
        const topServices = topServicesRaw.map(item => ({
            name: item.name,
            count: item._count.service_id,
            ca: Number(item._sum.price || 0)
        }));
        // Graphique simple (7 derniers jours)
        const last7Days = [];
        for (let i = 6; i >= 0; i--) {
            const d = new Date(today);
            d.setDate(d.getDate() - i);
            const dayStart = new Date(d);
            dayStart.setHours(0, 0, 0, 0);
            const dayEnd = new Date(d);
            dayEnd.setHours(23, 59, 59, 999);
            const rev = yield prisma.appointment.aggregate({
                where: { date: { gte: dayStart, lte: dayEnd }, statut: { not: 'ANNULE' } },
                _sum: { prix: true }
            });
            last7Days.push({
                name: d.toLocaleDateString('fr-FR', { weekday: 'short' }),
                ca: Number(rev._sum.prix || 0)
            });
        }
        res.json({
            dailyRevenue: dailyRevenue._sum.prix || 0,
            monthlyRevenue: monthlyRevenue._sum.prix || 0,
            dailyCount,
            upcoming,
            topServices,
            chartData: last7Days
        });
    }
    catch (error) {
        console.error("Erreur stats dashboard:", error);
        res.status(500).json({ message: "Erreur stats dashboard" });
    }
});
exports.getDashboardStats = getDashboardStats;
// =======================================================================
// 2. STATS AVANCÉES / FINANCIÈRES (Basé sur la Caisse / Transactions)
// =======================================================================
const getFinancialStats = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { startDate, endDate } = req.query;
        if (!startDate || !endDate) {
            return res.status(400).json({ message: "Dates requises" });
        }
        const start = new Date(startDate);
        const end = new Date(endDate);
        const transactions = yield prisma.transaction.findMany({
            where: {
                created_at: { gte: start, lte: end }
            },
            include: {
                items: true,
                user: true,
                client: true
            }
        });
        let totalRevenue = 0;
        let totalExpenses = 0;
        let servicesRevenue = 0;
        let productsRevenue = 0;
        const staffStats = {};
        const methodStats = {};
        const clientStats = {};
        transactions.forEach(t => {
            const amount = Number(t.amount);
            if (['REVENU', 'ENCAISSEMENT_RDV', 'DEPOT'].includes(t.type)) {
                totalRevenue += amount;
                const method = t.payment_method || 'AUTRE';
                methodStats[method] = (methodStats[method] || 0) + amount;
                if (t.user) {
                    const staffName = `${t.user.prenom} ${t.user.nom}`;
                    staffStats[staffName] = (staffStats[staffName] || 0) + amount;
                }
                const clientName = t.client ? `${t.client.prenom} ${t.client.nom}` : (t.client_name || 'Passant');
                clientStats[clientName] = (clientStats[clientName] || 0) + amount;
                t.items.forEach(item => {
                    const itemTotal = Number(item.price) * item.quantity;
                    if (item.type === 'SERVICE')
                        servicesRevenue += itemTotal;
                    if (item.type === 'PRODUIT')
                        productsRevenue += itemTotal;
                });
            }
            else if (['DEPENSE', 'RETRAIT'].includes(t.type)) {
                totalExpenses += amount;
            }
        });
        const byStaff = Object.entries(staffStats)
            .map(([name, value]) => ({ name, value }))
            .sort((a, b) => b.value - a.value);
        const byClient = Object.entries(clientStats)
            .map(([name, value]) => ({ name, value }))
            .sort((a, b) => b.value - a.value)
            .slice(0, 10);
        res.json({
            global: {
                revenue: totalRevenue,
                expenses: totalExpenses,
                net: totalRevenue - totalExpenses
            },
            details: {
                services: servicesRevenue,
                products: productsRevenue
            },
            byMethod: methodStats,
            byStaff,
            byClient
        });
    }
    catch (error) {
        console.error("Erreur stats financières:", error);
        res.status(500).json({ message: "Erreur calcul stats" });
    }
});
exports.getFinancialStats = getFinancialStats;
