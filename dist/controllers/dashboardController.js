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
exports.getDashboardStats = void 0;
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
const getDashboardStats = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        // Définir le début et la fin de la journée actuelle
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        // 1. Calculer le Chiffre d'Affaires du jour (RDV terminés)
        const dailyRevenue = yield prisma.appointment.aggregate({
            _sum: {
                prix: true,
            },
            where: {
                date: {
                    gte: today,
                    lt: tomorrow,
                },
                statut: 'TERMINE', // On ne compte que les RDV payés
            },
        });
        // 2. Compter les RDV du jour (tous statuts confondus)
        const dailyAppointments = yield prisma.appointment.count({
            where: {
                date: {
                    gte: today,
                    lt: tomorrow,
                },
            },
        });
        // 3. Compter les nouvelles clientes créées aujourd'hui
        const newClientsToday = yield prisma.client.count({
            where: {
                created_at: {
                    gte: today,
                    lt: tomorrow,
                },
            },
        });
        // 4. Récupérer les 5 prochains RDV
        const upcomingAppointments = yield prisma.appointment.findMany({
            where: {
                heure_debut: {
                    gte: new Date(), // A partir de maintenant
                },
                statut: 'CONFIRME',
            },
            take: 5,
            orderBy: {
                heure_debut: 'asc',
            },
            include: {
                client: { select: { nom: true, prenom: true } },
                services: { select: { nom: true } },
            },
        });
        // Renvoyer toutes les stats
        res.json({
            dailyRevenue: dailyRevenue._sum.prix || 0,
            dailyAppointments: dailyAppointments,
            newClientsToday: newClientsToday,
            upcomingAppointments: upcomingAppointments,
        });
    }
    catch (error) {
        console.error("Erreur getDashboardStats:", error);
        res.status(500).json({ message: "Erreur serveur lors du calcul des stats." });
    }
});
exports.getDashboardStats = getDashboardStats;
