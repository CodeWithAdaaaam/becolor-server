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
exports.updateSetting = exports.getSetting = exports.updateHours = exports.getHours = void 0;
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
// ============================================================
// 1. LIRE LES HORAIRES (AVEC INITIALISATION AUTOMATIQUE)
// ============================================================
const getHours = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        // On récupère les jours triés de 0 (Dimanche) à 6 (Samedi)
        let hours = yield prisma.openingHour.findMany({
            orderBy: { day: 'asc' }
        });
        // --- SÉCURITÉ : Si la table est vide, on l'initialise ---
        if (hours.length === 0) {
            console.log("🛠️ Initialisation des horaires par défaut...");
            const defaultHours = [0, 1, 2, 3, 4, 5, 6].map(day => ({
                day,
                morningOpen: "10:00",
                morningClose: "13:00",
                afternoonOpen: "14:00",
                afternoonClose: "20:00",
                isOpen: day !== 0 // Fermé le dimanche par défaut
            }));
            yield prisma.openingHour.createMany({
                data: defaultHours
            });
            // On récupère les données fraîchement créées
            hours = yield prisma.openingHour.findMany({
                orderBy: { day: 'asc' }
            });
        }
        // -------------------------------------------------------
        res.json(hours);
    }
    catch (error) {
        console.error("Erreur getHours:", error);
        res.status(500).json({ message: "Erreur récupération horaires" });
    }
});
exports.getHours = getHours;
// ============================================================
// 2. METTRE À JOUR LES HORAIRES (DOUBLE SESSION)
// ============================================================
const updateHours = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const updates = req.body; // Tableau des 7 jours envoyé par le frontend
        // On utilise une boucle pour mettre à jour chaque jour
        for (const dayData of updates) {
            yield prisma.openingHour.update({
                where: { day: dayData.day },
                data: {
                    isOpen: dayData.isOpen,
                    morningOpen: dayData.morningOpen,
                    morningClose: dayData.morningClose,
                    afternoonOpen: dayData.afternoonOpen,
                    afternoonClose: dayData.afternoonClose,
                }
            });
        }
        res.json({ message: "Horaires mis à jour avec succès" });
    }
    catch (error) {
        console.error("❌ ERREUR SAUVEGARDE HORAIRES :", error);
        res.status(500).json({ message: "Erreur sauvegarde horaires" });
    }
});
exports.updateHours = updateHours;
// ============================================================
// 3. LIRE UN PARAMÈTRE GÉNÉRIQUE (ex: onlineBookingActive)
// ============================================================
const getSetting = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const key = req.params.key;
        let setting = yield prisma.setting.findUnique({ where: { key } });
        // Si le paramètre n'existe pas, on renvoie une valeur par défaut
        if (!setting) {
            return res.json({ active: true });
        }
        res.json(setting.value);
    }
    catch (error) {
        console.error("Erreur getSetting:", error);
        res.status(500).json({ message: 'Erreur serveur' });
    }
});
exports.getSetting = getSetting;
// ============================================================
// 4. METTRE À JOUR UN PARAMÈTRE GÉNÉRIQUE
// ============================================================
const updateSetting = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const key = req.params.key;
        const value = req.body;
        yield prisma.setting.upsert({
            where: { key },
            update: { value },
            create: { key, value },
        });
        res.json({ message: "Paramètre mis à jour" });
    }
    catch (error) {
        console.error("Erreur updateSetting:", error);
        res.status(500).json({ message: 'Erreur de mise à jour' });
    }
});
exports.updateSetting = updateSetting;
