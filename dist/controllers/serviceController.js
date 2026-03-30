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
exports.updateService = exports.deleteService = exports.createService = exports.getServices = void 0;
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
// 1. Récupérer tous les services
const getServices = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const services = yield prisma.service.findMany({
            orderBy: { nom: 'asc' } // Trié par ordre alphabétique
        });
        res.json(services);
    }
    catch (error) {
        res.status(500).json({ message: "Erreur lors de la récupération des services" });
    }
});
exports.getServices = getServices;
// 2. Créer un service
const createService = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { nom, duree, prix, couleur } = req.body;
        const newService = yield prisma.service.create({
            data: {
                nom,
                duree: Number(duree), // On s'assure que c'est un nombre
                prix: Number(prix),
                couleur,
                actif: true
            }
        });
        res.status(201).json(newService);
    }
    catch (error) {
        res.status(500).json({ message: "Erreur lors de la création du service" });
    }
});
exports.createService = createService;
// 3. Supprimer un service
const deleteService = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        yield prisma.service.delete({
            where: { id: Number(id) }
        });
        res.json({ message: "Service supprimé" });
    }
    catch (error) {
        res.status(500).json({ message: "Impossible de supprimer (peut-être lié à des RDV)" });
    }
});
exports.deleteService = deleteService;
const updateService = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { id } = req.params;
    const { nom, category, prix, duree, couleur, is_starting_price } = req.body;
    try {
        const updated = yield prisma.service.update({
            where: { id: Number(id) },
            data: {
                nom,
                category,
                prix: Number(prix),
                duree: Number(duree),
                couleur,
                is_starting_price: Boolean(is_starting_price) // Mise à jour du nouveau champ
            }
        });
        res.json(updated);
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ message: "Erreur lors de la mise à jour du service" });
    }
});
exports.updateService = updateService;
