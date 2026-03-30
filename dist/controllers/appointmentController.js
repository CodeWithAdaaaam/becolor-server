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
exports.getAppointmentsList = exports.deleteAppointment = exports.updateAppointment = exports.createAppointment = exports.getAppointments = void 0;
const client_1 = require("@prisma/client"); // Import de Prisma pour les types Decimal
const logger_1 = require("../services/logger");
const whatsappClient_1 = require("../services/whatsappClient");
const prisma = new client_1.PrismaClient();
// ============================================================
// FONCTION : VÉRIFIE HORAIRES + CONFLITS
// ============================================================
const checkAvailability = (userId, start, end, excludeAppointmentId) => __awaiter(void 0, void 0, void 0, function* () {
    if (!userId)
        return null;
    const dayOfWeek = start.getDay();
    const schedule = yield prisma.userSchedule.findUnique({
        where: { user_id_day: { user_id: userId, day: dayOfWeek } }
    });
    if (schedule) {
        if (!schedule.isWorking)
            return "L'employé ne travaille pas ce jour-là (Repos).";
        const [startHour, startMin] = schedule.startTime.split(':').map(Number);
        const [endHour, endMin] = schedule.endTime.split(':').map(Number);
        const workStart = new Date(start);
        workStart.setHours(startHour, startMin, 0, 0);
        const workEnd = new Date(start);
        workEnd.setHours(endHour, endMin, 0, 0);
        if (start < workStart || end > workEnd) {
            return `L'employé travaille uniquement de ${schedule.startTime} à ${schedule.endTime}.`;
        }
    }
    const conflict = yield prisma.appointment.findFirst({
        where: {
            user_id: userId,
            id: excludeAppointmentId ? { not: excludeAppointmentId } : undefined,
            statut: { not: 'ANNULE' },
            AND: [{ heure_debut: { lt: end } }, { heure_fin: { gt: start } }]
        }
    });
    if (conflict)
        return "Ce créneau est déjà pris par un autre rendez-vous.";
    return null;
});
// ============================================================
// 1. RÉCUPÉRER LES RDV
// ============================================================
const getAppointments = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { start, end, userId, role } = req.query;
        if (!start || !end)
            return res.status(400).json({ message: "Dates requises" });
        const whereClause = {
            date: { gte: new Date(start), lte: new Date(end) },
            statut: { not: 'ANNULE' }
        };
        if (userId && userId !== 'all')
            whereClause.user_id = Number(userId);
        if (role && (!userId || userId === 'all')) {
            whereClause.user = { roles: { has: role } };
        }
        const appointments = yield prisma.appointment.findMany({
            where: whereClause,
            include: {
                client: true,
                services: true,
                user: true
            },
            orderBy: { heure_debut: 'asc' },
        });
        res.json(appointments);
    }
    catch (error) {
        console.error("Erreur getAppointments:", error);
        res.status(500).json({ message: "Erreur récupération des RDV" });
    }
});
exports.getAppointments = getAppointments;
// ============================================================
// 2. CRÉER UN RDV (MULTI-SERVICES)
// ============================================================
const createAppointment = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { client_id, service_ids, user_id, heure_debut } = req.body;
        if (!user_id)
            return res.status(400).json({ message: "Prestataire obligatoire." });
        if (!service_ids || !Array.isArray(service_ids) || service_ids.length === 0) {
            return res.status(400).json({ message: "Au moins une prestation est requise." });
        }
        const selectedServices = yield prisma.service.findMany({
            where: { id: { in: service_ids.map(id => Number(id)) } }
        });
        const totalDuration = selectedServices.reduce((acc, s) => acc + s.duree + (s.duree_buffer || 0), 0);
        const calculatedPrice = selectedServices.reduce((acc, s) => acc + Number(s.prix), 0);
        const startDate = new Date(heure_debut);
        const endDate = new Date(startDate.getTime() + totalDuration * 60000);
        const conflictReason = yield checkAvailability(Number(user_id), startDate, endDate);
        if (conflictReason)
            return res.status(409).json({ message: conflictReason });
        const newAppointment = yield prisma.appointment.create({
            data: {
                client_id: Number(client_id),
                user_id: Number(user_id),
                date: startDate,
                heure_debut: startDate,
                heure_fin: endDate,
                prix: new client_1.Prisma.Decimal(calculatedPrice),
                statut: 'CONFIRME',
                services: {
                    connect: selectedServices.map(s => ({ id: s.id }))
                }
            },
            include: { client: true, services: true }
        });
        // Envoi WhatsApp
        try {
            if (newAppointment.client.tel_principal) {
                const formattedDate = new Date(startDate).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
                const formattedTime = new Date(startDate).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
                const serviceNames = newAppointment.services.map(s => s.nom).join(', ');
                const message = `🌟 *Confirmation RDV be COLOR*\n\nBonjour ${newAppointment.client.prenom},\nRDV confirmé !\n\n🗓️ *${formattedDate}*\n🕒 *${formattedTime}*\n💅 Prestation(s) : ${serviceNames}\n💰 Total : ${calculatedPrice} MAD\n\nÀ très vite !`;
                (0, whatsappClient_1.sendMessage)(newAppointment.client.tel_principal, message);
            }
        }
        catch (e) { }
        res.status(201).json(newAppointment);
    }
    catch (error) {
        res.status(500).json({ message: "Erreur création" });
    }
});
exports.createAppointment = createAppointment;
// ============================================================
// 3. MISE À JOUR (DASHBOARD + CAISSE)
// ============================================================
const updateAppointment = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { id } = req.params;
    const { heure_debut, user_id, statut, price, service_ids } = req.body;
    const appointmentId = Number(id);
    try {
        const result = yield prisma.$transaction((tx) => __awaiter(void 0, void 0, void 0, function* () {
            const currentAppt = yield tx.appointment.findUnique({
                where: { id: appointmentId },
                include: { services: true, client: true }
            });
            if (!currentAppt)
                throw new Error("RDV introuvable");
            const newStart = heure_debut ? new Date(heure_debut) : currentAppt.heure_debut;
            const providerId = user_id ? Number(user_id) : currentAppt.user_id;
            // Gestion des services si fournis
            let newServices = currentAppt.services;
            if (service_ids && Array.isArray(service_ids)) {
                newServices = yield tx.service.findMany({
                    where: { id: { in: service_ids.map((s) => Number(s)) } }
                });
            }
            const totalDuration = newServices.reduce((acc, s) => acc + s.duree + (s.duree_buffer || 0), 0);
            const newEnd = new Date(newStart.getTime() + totalDuration * 60000);
            if (heure_debut || (user_id && user_id !== currentAppt.user_id)) {
                if (providerId) {
                    const conflictReason = yield checkAvailability(providerId, newStart, newEnd, appointmentId);
                    if (conflictReason)
                        throw new Error(conflictReason);
                }
            }
            // Prix final (saisie manuelle ou calcul auto)
            let finalPrice = Number(currentAppt.prix);
            if (price !== undefined) {
                finalPrice = Number(price);
            }
            else if (service_ids) {
                finalPrice = newServices.reduce((acc, s) => acc + Number(s.prix), 0);
            }
            const updatedAppointment = yield tx.appointment.update({
                where: { id: appointmentId },
                data: {
                    heure_debut: newStart,
                    heure_fin: newEnd,
                    user_id: providerId,
                    statut: statut || currentAppt.statut,
                    date: newStart,
                    prix: new client_1.Prisma.Decimal(finalPrice),
                    services: service_ids ? {
                        set: newServices.map(s => ({ id: s.id }))
                    } : undefined
                },
                include: { user: true, client: true, services: true }
            });
            // ENCAISSEMENT : Création de la transaction
            if (statut === 'TERMINE') {
                yield tx.transaction.create({
                    data: {
                        amount: new client_1.Prisma.Decimal(finalPrice),
                        type: 'ENTREE',
                        category: 'PRESTATION',
                        description: `Encaissement RDV: ${updatedAppointment.client.prenom}`,
                        appointment_id: updatedAppointment.id
                    }
                });
            }
            return updatedAppointment;
        }));
        res.json(result);
    }
    catch (error) {
        if (error.message && (error.message.includes("conflit") || error.message.includes("déjà pris"))) {
            return res.status(409).json({ message: error.message });
        }
        res.status(500).json({ message: "Erreur mise à jour" });
    }
});
exports.updateAppointment = updateAppointment;
// ============================================================
// 4. SUPPRESSION
// ============================================================
const deleteAppointment = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const appt = yield prisma.appointment.findUnique({ where: { id: Number(id) }, include: { client: true } });
        yield prisma.appointment.delete({ where: { id: Number(id) } });
        if (appt)
            yield (0, logger_1.logActivity)(1, 'SUPPRESSION_RDV', `RDV de ${appt.client.prenom} supprimé.`);
        res.json({ message: "RDV supprimé" });
    }
    catch (error) {
        res.status(500).json({ message: "Erreur suppression" });
    }
});
exports.deleteAppointment = deleteAppointment;
// ============================================================
// 5. LISTE COMPLÈTE (PAGINÉE)
// ============================================================
const getAppointmentsList = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 15;
        const search = req.query.search || '';
        const status = req.query.status || 'ALL';
        const skip = (page - 1) * limit;
        const whereClause = {
            OR: [
                { client: { nom: { contains: search, mode: 'insensitive' } } },
                { client: { prenom: { contains: search, mode: 'insensitive' } } },
            ],
        };
        if (status !== 'ALL')
            whereClause.statut = status;
        const [appointments, total] = yield prisma.$transaction([
            prisma.appointment.findMany({
                where: whereClause,
                include: { client: true, services: true, user: true },
                orderBy: { date: 'desc' },
                skip,
                take: limit,
            }),
            prisma.appointment.count({ where: whereClause }),
        ]);
        res.json({
            data: appointments,
            pagination: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit),
            },
        });
    }
    catch (error) {
        res.status(500).json({ message: "Erreur liste" });
    }
});
exports.getAppointmentsList = getAppointmentsList;
