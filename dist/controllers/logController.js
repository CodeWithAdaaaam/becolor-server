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
exports.getLogs = void 0;
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
const getLogs = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const logs = yield prisma.activityLog.findMany({
            take: 50, // Les 50 derniers
            orderBy: { created_at: 'desc' }, // Du plus récent au plus vieux
            include: {
                user: { select: { nom: true, prenom: true } } // On veut le nom, pas juste l'ID
            }
        });
        // Debug : voir si le serveur trouve des logs
        console.log(`🔍 Lecture logs : ${logs.length} trouvés.`);
        res.json(logs);
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ message: "Impossible de lire les logs" });
    }
});
exports.getLogs = getLogs;
