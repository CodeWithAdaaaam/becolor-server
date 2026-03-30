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
exports.deleteClient = exports.getClientNotes = exports.updateClientNotes = exports.updateClient = exports.createClient = exports.saveAppointmentHistory = exports.getClientById = exports.getClients = void 0;
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
// 1. LISTER LES CLIENTES (Recherche + Compteur de RDV)
const getClients = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { search } = req.query;
        const whereClause = search ? {
            OR: [
                { nom: { contains: String(search), mode: 'insensitive' } },
                { prenom: { contains: String(search), mode: 'insensitive' } },
                { tel_principal: { contains: String(search) } }
            ]
        } : {};
        const clients = yield prisma.client.findMany({
            where: whereClause,
            orderBy: { updated_at: 'desc' }, // Les plus récemment modifiées en premier
            include: {
                _count: { select: { appointments: true } } // On récupère le nombre de RDV
            }
        });
        res.json(clients);
    }
    catch (error) {
        console.error("Erreur getClients:", error);
        res.status(500).json({ message: "Erreur récupération clients" });
    }
});
exports.getClients = getClients;
// 2. RÉCUPÉRER UNE FICHE CLIENTE COMPLÈTE
const getClientById = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const client = yield prisma.client.findUnique({
            where: { id: Number(id) },
            include: {
                // RDV
                appointments: {
                    include: { services: true, user: true },
                    orderBy: { date: 'desc' }
                },
                // Note Générale (Allergies actuelles)
                coloration_notes: true,
                // NOUVEAU : Historique Technique complet
                coloration_history: {
                    orderBy: { date_coloration: 'desc' }
                }
            }
        });
        if (!client)
            return res.status(404).json({ message: 'Cliente non trouvée' });
        res.json(client);
    }
    catch (error) {
        res.status(500).json({ message: 'Erreur serveur' });
    }
});
exports.getClientById = getClientById;
// 2. AJOUTE CETTE FONCTION : Sauvegarder l'historique d'un RDV
const saveAppointmentHistory = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { clientId, appointmentId } = req.params;
        const { formule, resultat, technique } = req.body;
        // On crée ou met à jour l'historique pour CE rendez-vous
        // (Note : on utilise findFirst car appointment_id n'est pas @unique dans ton schema initial, 
        // mais logiquement il devrait l'être. On gère ça proprement).
        const existing = yield prisma.colorationHistory.findFirst({
            where: { appointment_id: Number(appointmentId) }
        });
        if (existing) {
            const updated = yield prisma.colorationHistory.update({
                where: { id: existing.id },
                data: { formule_utilisee: formule, resultat, couleur_appliquee: technique }
            });
            return res.json(updated);
        }
        else {
            const created = yield prisma.colorationHistory.create({
                data: {
                    client_id: Number(clientId),
                    appointment_id: Number(appointmentId),
                    date_coloration: new Date(), // Ou la date du RDV si tu préfères
                    formule_utilisee: formule,
                    resultat: resultat,
                    couleur_appliquee: technique
                }
            });
            return res.json(created);
        }
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ message: "Erreur sauvegarde historique" });
    }
});
exports.saveAppointmentHistory = saveAppointmentHistory;
// 3. CRÉER UN CLIENT
const createClient = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { nom, prenom, tel_principal, email } = req.body;
        // Si le numéro existe déjà, on ajoute un suffixe unique
        let telToUse = tel_principal;
        const existing = yield prisma.client.findFirst({ where: { tel_principal } });
        if (existing) {
            const timestamp = Date.now().toString().slice(-4);
            telToUse = `${tel_principal}_${timestamp}`;
        }
        const newClient = yield prisma.client.create({
            data: {
                nom,
                prenom,
                tel_principal: telToUse,
                tel_secondaire: existing ? tel_principal : null, // On garde le numéro original en secondaire si doublon
                email,
                source: existing ? 'panel_duplicate' : 'panel'
            }
        });
        // Création d'une fiche technique vide
        yield prisma.colorationNote.create({ data: { client_id: newClient.id } });
        res.status(201).json(newClient);
    }
    catch (error) {
        console.error("Erreur création client:", error);
        res.status(500).json({
            message: "Erreur création client",
            error: (error === null || error === void 0 ? void 0 : error.message) || 'Erreur inconnue'
        });
    }
});
exports.createClient = createClient;
// 4. METTRE À JOUR LES INFOS GÉNÉRALES (Nom, Tel...)
const updateClient = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const client = yield prisma.client.update({
            where: { id: Number(id) },
            data: req.body // Met à jour tout ce qui est envoyé (nom, prenom, etc.)
        });
        res.json(client);
    }
    catch (error) {
        res.status(500).json({ message: "Erreur mise à jour client" });
    }
});
exports.updateClient = updateClient;
// 5. METTRE À JOUR LA FICHE TECHNIQUE (Le Cerveau du Coiffeur)
const updateClientNotes = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params; // ID de la cliente
        const notesData = req.body;
        // "Upsert" veut dire : Met à jour si ça existe, sinon Crée-le.
        const updatedNotes = yield prisma.colorationNote.upsert({
            where: { client_id: Number(id) },
            update: notesData,
            create: Object.assign({ client_id: Number(id) }, notesData),
        });
        res.json(updatedNotes);
    }
    catch (error) {
        console.error("Erreur notes techniques:", error);
        res.status(500).json({ message: "Erreur sauvegarde notes techniques" });
    }
});
exports.updateClientNotes = updateClientNotes;
const getClientNotes = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const notes = yield prisma.colorationNote.findUnique({
            where: { client_id: Number(id) }
        });
        // Si pas de notes, on renvoie un objet vide pour ne pas faire planter le frontend
        res.json(notes || {});
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ message: "Erreur récupération notes" });
    }
});
exports.getClientNotes = getClientNotes;
// 6. SUPPRIMER UN CLIENT
const deleteClient = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        yield prisma.client.delete({ where: { id: Number(id) } });
        res.json({ message: "Client supprimé" });
    }
    catch (error) {
        res.status(500).json({ message: "Impossible de supprimer (a des RDV en cours)" });
    }
});
exports.deleteClient = deleteClient;
