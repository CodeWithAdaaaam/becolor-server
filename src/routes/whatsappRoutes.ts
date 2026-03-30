import { Router } from 'express';
import { getStatus, initWhatsApp } from '../services/whatsappClient';
import fs from 'fs';
import path from 'path';

const router = Router();

// Récupérer le statut (Connecté ou QR Code)
router.get('/status', (req, res) => {
    res.json(getStatus());
});

// Forcer la déconnexion
router.post('/logout', (req, res) => {
    const AUTH_DIR = path.join(__dirname, '../../auth_info_baileys');
    if (fs.existsSync(AUTH_DIR)) {
        fs.rmSync(AUTH_DIR, { recursive: true, force: true });
    }
    initWhatsApp(); // Relance pour générer un nouveau QR
    res.json({ message: "Déconnecté. Nouveau QR généré." });
});

export default router;