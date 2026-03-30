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
exports.updateUser = exports.deleteUser = exports.getStaff = exports.login = exports.register = void 0;
const client_1 = require("@prisma/client");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const prisma = new client_1.PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || 'ton_secret_jwt_super_securise';
// ============================================================
// 1. INSCRIPTION (Register) AVEC MULTI-RÔLES
// ============================================================
const register = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { nom, prenom, email, password, roles, // Reçu comme tableau : ["COIFFEUR", "ONGLERIE"]
        color, schedule } = req.body;
        const existingUser = yield prisma.user.findUnique({ where: { email } });
        if (existingUser) {
            return res.status(400).json({ message: "Cet email est déjà utilisé." });
        }
        const hashedPassword = yield bcryptjs_1.default.hash(password, 10);
        // Préparer le planning par défaut si vide
        let scheduleData = schedule;
        if (!scheduleData || !Array.isArray(scheduleData) || scheduleData.length === 0) {
            scheduleData = Array.from({ length: 7 }, (_, i) => ({
                day: i,
                startTime: "09:00",
                endTime: "19:00",
                isWorking: i !== 0
            }));
        }
        const newUser = yield prisma.user.create({
            data: {
                nom,
                prenom,
                email,
                password_hash: hashedPassword,
                // MODIFICATION : Utilise roles (tableau)
                roles: roles && roles.length > 0 ? roles : ['RECEPTIONIST'],
                color: color || '#3b82f6',
                schedules: {
                    create: scheduleData.map((s) => ({
                        day: Number(s.day),
                        startTime: s.startTime,
                        endTime: s.endTime,
                        isWorking: Boolean(s.isWorking)
                    }))
                }
            },
            include: {
                schedules: true
            }
        });
        res.status(201).json({ message: "Personnel créé avec succès", user: newUser });
    }
    catch (error) {
        console.error("Erreur register:", error);
        res.status(500).json({ message: "Erreur lors de l'inscription" });
    }
});
exports.register = register;
// ============================================================
// 2. CONNEXION (Login)
// ============================================================
const login = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { email, password } = req.body;
        const user = yield prisma.user.findUnique({ where: { email } });
        if (!user) {
            return res.status(401).json({ message: "Email ou mot de passe incorrect." });
        }
        const isValid = yield bcryptjs_1.default.compare(password, user.password_hash);
        if (!isValid) {
            return res.status(401).json({ message: "Email ou mot de passe incorrect." });
        }
        const token = jsonwebtoken_1.default.sign({ userId: user.id, roles: user.roles }, // Token inclut le tableau des rôles
        JWT_SECRET, { expiresIn: '24h' });
        res.json({
            token,
            user: {
                id: user.id,
                nom: user.nom,
                prenom: user.prenom,
                roles: user.roles // Renvoie le tableau au frontend
            }
        });
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ message: "Erreur de connexion" });
    }
});
exports.login = login;
// ============================================================
// 3. RÉCUPÉRER LE PERSONNEL (GetStaff)
// ============================================================
const getStaff = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const users = yield prisma.user.findMany({
            select: {
                id: true,
                nom: true,
                prenom: true,
                roles: true, // Pluriel
                color: true
            },
            orderBy: { prenom: 'asc' }
        });
        res.json(users);
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ message: "Erreur lors de la récupération du personnel" });
    }
});
exports.getStaff = getStaff;
// ============================================================
// 4. SUPPRIMER UN UTILISATEUR
// ============================================================
const deleteUser = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        if (Number(id) === 1) {
            return res.status(403).json({ message: "Impossible de supprimer l'administrateur principal." });
        }
        yield prisma.userSchedule.deleteMany({ where: { user_id: Number(id) } });
        yield prisma.user.delete({ where: { id: Number(id) } });
        res.json({ message: "Utilisateur supprimé avec succès" });
    }
    catch (error) {
        res.status(500).json({ message: "Impossible de supprimer (données liées)." });
    }
});
exports.deleteUser = deleteUser;
// ============================================================
// 5. METTRE À JOUR UN UTILISATEUR
// ============================================================
const updateUser = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const { nom, prenom, email, password, roles, color } = req.body;
        const existingUser = yield prisma.user.findUnique({ where: { id: Number(id) } });
        if (!existingUser) {
            return res.status(404).json({ message: "Utilisateur introuvable." });
        }
        let updateData = {
            nom,
            prenom,
            email,
            roles, // Met à jour le tableau des rôles
            color
        };
        if (password && password.trim() !== "") {
            const hashedPassword = yield bcryptjs_1.default.hash(password, 10);
            updateData.password_hash = hashedPassword;
        }
        const updatedUser = yield prisma.user.update({
            where: { id: Number(id) },
            data: updateData
        });
        res.json({ message: "Mise à jour réussie", user: updatedUser });
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ message: "Erreur lors de la mise à jour." });
    }
});
exports.updateUser = updateUser;
