"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
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
exports.createPublicBooking = exports.getAvailableSlots = void 0;
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
// --- UTILITAIRES ---
const getMinutes = (time) => {
    if (!time || !time.includes(':'))
        return 0;
    const [h, m] = time.split(':').map(Number);
    return h * 60 + m;
};
const formatMinutesToHHMM = (totalMinutes) => {
    const mins = totalMinutes % 1440;
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
};
/**
 * Génère les créneaux pour une plage donnée
 */
const generateSlotsForRange = (start, end, duration, dateStr, appointments) => {
    const slots = [];
    let currentMin = getMinutes(start);
    let endMin = getMinutes(end);
    // Gestion du passage à minuit (ex: 16:00 à 01:00)
    if (endMin <= currentMin) {
        endMin += 1440;
    }
    while (currentMin + duration <= endMin) {
        const currentHHMM = formatMinutesToHHMM(currentMin);
        const slotEndMin = currentMin + duration;
        const endHHMM = formatMinutesToHHMM(slotEndMin);
        const sDate = new Date(`${dateStr}T${currentHHMM}:00`);
        const eDate = new Date(`${dateStr}T${endHHMM}:00`);
        if (slotEndMin >= 1440) {
            eDate.setDate(eDate.getDate() + 1);
        }
        // Vérification des conflits (chevauchement de dates)
        const conflict = appointments.some((appt) => {
            const apptStart = new Date(appt.heure_debut);
            const apptEnd = new Date(appt.heure_fin);
            return (sDate < apptEnd) && (eDate > apptStart);
        });
        if (!conflict)
            slots.push(currentHHMM);
        currentMin += 15; // Pas de 15 minutes
    }
    return slots;
};
// --- CONTROLEURS ---
/**
 * Récupérer les créneaux (Double Session)
 */
const getAvailableSlots = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { date, serviceId, staffId } = req.query;
        if (!date || !serviceId)
            return res.status(400).json({ message: "Données manquantes" });
        const selectedDate = new Date(date);
        const dayOfWeek = selectedDate.getDay();
        const startOfDay = new Date(selectedDate);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(selectedDate);
        endOfDay.setHours(23, 59, 59, 999);
        // 1. Récupération du service (Attention au type Decimal de prix dans le schéma)
        const service = yield prisma.service.findUnique({ where: { id: Number(serviceId) } });
        if (!service)
            return res.status(404).json({ message: "Service introuvable" });
        const totalDuration = service.duree + (service.duree_buffer || 0);
        // 2. Récupération des RDV existants
        const appointments = yield prisma.appointment.findMany({
            where: {
                date: { gte: startOfDay, lte: endOfDay },
                statut: { not: 'ANNULE' },
                user_id: (staffId && staffId !== 'any') ? Number(staffId) : undefined
            }
        });
        // 3. Récupération des horaires (Basé sur le modèle OpeningHour du schéma)
        const stdHours = yield prisma.openingHour.findUnique({ where: { day: dayOfWeek } });
        if (!stdHours || !stdHours.isOpen)
            return res.json([]);
        let timeRanges = [];
        // Session 1 (Matin)
        if (stdHours.morningOpen && stdHours.morningClose) {
            timeRanges.push({ start: stdHours.morningOpen, end: stdHours.morningClose });
        }
        // Session 2 (Après-midi/Soir)
        if (stdHours.afternoonOpen && stdHours.afternoonClose) {
            timeRanges.push({ start: stdHours.afternoonOpen, end: stdHours.afternoonClose });
        }
        // 4. Génération des créneaux
        let allSlots = [];
        for (const range of timeRanges) {
            const rangeSlots = generateSlotsForRange(range.start, range.end, totalDuration, date, appointments);
            allSlots = [...allSlots, ...rangeSlots];
        }
        // 5. Filtre sécurité Heure Passée
        const now = new Date();
        const todayStr = now.toISOString().split('T')[0];
        if (date === todayStr) {
            const currentHHMM = formatMinutesToHHMM(now.getHours() * 60 + now.getMinutes());
            allSlots = allSlots.filter(s => s > currentHHMM);
        }
        res.json(allSlots);
    }
    catch (error) {
        console.error("Erreur getAvailableSlots:", error);
        res.status(500).json({ message: "Erreur serveur" });
    }
});
exports.getAvailableSlots = getAvailableSlots;
/**
 * Création RDV (Correction Prisma Relation Multi-Services)
 */
const createPublicBooking = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const { client, serviceId, staffId, date, time } = req.body;
        // 1. Identification / Création Client
        let clientDb = yield prisma.client.findFirst({ where: { tel_principal: client.tel } });
        if (!clientDb) {
            clientDb = yield prisma.client.create({
                data: {
                    nom: client.nom,
                    prenom: client.prenom,
                    tel_principal: client.tel,
                    email: client.email,
                    source: 'public_booking'
                }
            });
        }
        // 2. Calcul Durée & Prix
        const service = yield prisma.service.findUnique({ where: { id: Number(serviceId) } });
        if (!service)
            return res.status(404).json({ message: "Service introuvable" });
        const totalDuration = service.duree + (service.duree_buffer || 0);
        const startDateTime = new Date(`${date}T${time}:00`);
        const endDateTime = new Date(startDateTime.getTime() + totalDuration * 60000);
        // 3. Création du RDV (Correction structure data selon schema.prisma)
        const newAppointment = yield prisma.appointment.create({
            data: {
                client_id: clientDb.id,
                user_id: staffId && staffId !== 'any' ? Number(staffId) : null,
                date: startDateTime,
                heure_debut: startDateTime,
                heure_fin: endDateTime,
                prix: service.prix, // Prisma accepte service.prix car c'est un Decimal
                statut: 'CONFIRME',
                // Utilisation de la relation Many-to-Many
                services: {
                    connect: [{ id: Number(serviceId) }]
                }
            },
            include: {
                client: true,
                services: true // On inclut 'services' au pluriel
            }
        });
        // 4. Notification WhatsApp
        try {
            const { sendMessage } = yield Promise.resolve().then(() => __importStar(require('../services/whatsappClient')));
            if (newAppointment.client.tel_principal) {
                const formattedDate = new Date(startDateTime).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
                const serviceName = ((_a = newAppointment.services[0]) === null || _a === void 0 ? void 0 : _a.nom) || "Prestation";
                const message = `🌟 *Confirmation Réservation be COLOR*\n\nBonjour ${newAppointment.client.prenom},\nVotre demande est bien reçue !\n\n🗓️ *${formattedDate}*\n🕒 *${time}*\n💇‍♀️ Prestation : ${serviceName}\n\nÀ très vite !`;
                sendMessage(newAppointment.client.tel_principal, message).catch(e => console.error("Error WS:", e));
            }
        }
        catch (wsErr) {
            console.log("WhatsApp skip");
        }
        res.status(201).json(newAppointment);
    }
    catch (error) {
        console.error("Erreur createPublicBooking:", error);
        res.status(500).json({ message: "Erreur lors de l'enregistrement de la réservation." });
    }
});
exports.createPublicBooking = createPublicBooking;
