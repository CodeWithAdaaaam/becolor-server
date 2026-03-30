"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const whatsappClient_1 = require("../services/whatsappClient");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const router = (0, express_1.Router)();
// Récupérer le statut (Connecté ou QR Code)
router.get('/status', (req, res) => {
    res.json((0, whatsappClient_1.getStatus)());
});
// Forcer la déconnexion
router.post('/logout', (req, res) => {
    const AUTH_DIR = path_1.default.join(__dirname, '../../auth_info_baileys');
    if (fs_1.default.existsSync(AUTH_DIR)) {
        fs_1.default.rmSync(AUTH_DIR, { recursive: true, force: true });
    }
    (0, whatsappClient_1.initWhatsApp)(); // Relance pour générer un nouveau QR
    res.json({ message: "Déconnecté. Nouveau QR généré." });
});
exports.default = router;
