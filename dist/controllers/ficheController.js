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
exports.upsertFicheByClientId = exports.getFicheByClientId = void 0;
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
// Récupérer la fiche technique d'un client
const getFicheByClientId = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { id } = req.params;
    try {
        const fiche = yield prisma.ficheTechnique.findUnique({
            where: { client_id: Number(id) }, // Note: le champ dans la DB est client_id
        });
        // Si la fiche n'existe pas, on renvoie un objet vide. Le front s'en chargera.
        if (!fiche) {
            return res.status(200).json(null);
        }
        res.json(fiche);
    }
    catch (error) {
        console.error("Erreur getFicheByClientId:", error);
        res.status(500).json({ message: 'Erreur serveur' });
    }
});
exports.getFicheByClientId = getFicheByClientId;
// Créer ou Mettre à jour une fiche technique (Upsert)
const upsertFicheByClientId = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { id } = req.params;
    const data = req.body;
    try {
        const fiche = yield prisma.ficheTechnique.upsert({
            where: { client_id: Number(id) },
            // Données à mettre à jour si la fiche existe
            update: data,
            // Données à utiliser pour créer la fiche si elle n'existe pas
            create: Object.assign(Object.assign({}, data), { client_id: Number(id) }),
        });
        res.status(200).json(fiche);
    }
    catch (error) {
        console.error("Erreur upsertFicheByClientId:", error);
        res.status(500).json({ message: 'Erreur lors de la sauvegarde' });
    }
});
exports.upsertFicheByClientId = upsertFicheByClientId;
