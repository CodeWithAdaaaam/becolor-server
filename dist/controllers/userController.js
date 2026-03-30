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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteUser = exports.updateUser = exports.updateUserSchedule = exports.getUserSchedule = exports.getAllStaff = void 0;
const client_1 = require("@prisma/client");
const bcryptjs_1 = __importDefault(require("bcryptjs")); // <--- AJOUT IMPORTANT
const prisma = new client_1.PrismaClient();
// --- RÉCUPÉRER TOUT LE STAFF ---
const getAllStaff = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const staff = yield prisma.user.findMany({
            select: {
                id: true,
                nom: true,
                prenom: true,
                email: true, // J'ai ajouté l'email car on en a besoin pour l'édition
                roles: true,
                color: true
            },
            orderBy: { prenom: 'asc' }
        });
        console.log(`✅ Staff chargé : ${staff.length} employés trouvés.`);
        res.json(staff);
    }
    catch (error) {
        console.error("Erreur getAllStaff:", error);
        res.status(500).json({ message: "Impossible de récupérer le personnel" });
    }
});
exports.getAllStaff = getAllStaff;
// --- RÉCUPÉRER LE PLANNING D'UN USER ---
const getUserSchedule = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const userId = Number(req.params.id);
        const schedule = yield prisma.userSchedule.findMany({
            where: { user_id: userId },
            orderBy: { day: 'asc' }
        });
        res.json(schedule);
    }
    catch (error) {
        res.status(500).json({ message: "Erreur récupération planning" });
    }
});
exports.getUserSchedule = getUserSchedule;
// --- METTRE À JOUR JUSTE LE PLANNING (EXISTANT) ---
const updateUserSchedule = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const userId = Number(req.params.id);
        const days = req.body;
        yield prisma.$transaction(days.map((dayData) => prisma.userSchedule.upsert({
            where: {
                user_id_day: { user_id: userId, day: dayData.day }
            },
            update: {
                startTime: dayData.startTime,
                endTime: dayData.endTime,
                isWorking: dayData.isWorking
            },
            create: {
                user_id: userId,
                day: dayData.day,
                startTime: dayData.startTime,
                endTime: dayData.endTime,
                isWorking: dayData.isWorking
            }
        })));
        res.json({ message: "Planning mis à jour avec succès" });
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ message: "Erreur sauvegarde planning" });
    }
});
exports.updateUserSchedule = updateUserSchedule;
// --- AJOUT : METTRE À JOUR UN UTILISATEUR COMPLET (PUT) ---
const updateUser = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const userId = Number(req.params.id);
    const { nom, prenom, email, roles, color, password, schedule } = req.body;
    try {
        // 1. Préparer les données de l'utilisateur
        const updateData = {
            nom,
            prenom,
            email,
            roles,
            color
        };
        // 2. Si un nouveau mot de passe est envoyé, on le hash
        if (password && password.trim() !== '') {
            const salt = yield bcryptjs_1.default.genSalt(10);
            updateData.password = yield bcryptjs_1.default.hash(password, salt);
        }
        // 3. Transaction : Update User + Update Schedule
        yield prisma.$transaction((tx) => __awaiter(void 0, void 0, void 0, function* () {
            // A. Mise à jour des infos de base
            yield tx.user.update({
                where: { id: userId },
                data: updateData
            });
            // B. Mise à jour du planning (si fourni)
            if (schedule && Array.isArray(schedule)) {
                yield Promise.all(schedule.map((day) => tx.userSchedule.upsert({
                    where: {
                        user_id_day: { user_id: userId, day: day.day }
                    },
                    update: {
                        startTime: day.startTime,
                        endTime: day.endTime,
                        isWorking: day.isWorking
                    },
                    create: {
                        user_id: userId,
                        day: day.day,
                        startTime: day.startTime,
                        endTime: day.endTime,
                        isWorking: day.isWorking
                    }
                })));
            }
        }));
        res.json({ message: "Utilisateur mis à jour avec succès" });
    }
    catch (error) {
        console.error("Erreur update user:", error);
        res.status(500).json({ message: "Erreur lors de la mise à jour de l'utilisateur" });
    }
});
exports.updateUser = updateUser;
// --- AJOUT : SUPPRIMER UN UTILISATEUR (DELETE) ---
// (Au cas où tu en aurais besoin aussi pour la fonction handleDelete du frontend)
const deleteUser = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const userId = Number(req.params.id);
    try {
        // Supprimer d'abord les dépendances si nécessaire (ex: planning)
        // Prisma le fait souvent auto si "Cascade" est activé, sinon :
        yield prisma.userSchedule.deleteMany({ where: { user_id: userId } });
        yield prisma.user.delete({ where: { id: userId } });
        res.json({ message: "Utilisateur supprimé" });
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ message: "Impossible de supprimer (Utilisateur lié à des RDV ?)" });
    }
});
exports.deleteUser = deleteUser;
