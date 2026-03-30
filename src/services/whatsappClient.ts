import fs from 'fs';
import path from 'path';

// ⚠️ NE RIEN IMPORTER DE BAILEYS ICI EN HAUT ⚠️

const AUTH_DIR = path.join(__dirname, '../../auth_info_baileys');

export let sock: any; 
let qrCode: string | null = null;
let isConnected = false;

export const initWhatsApp = async () => {
    console.log("🔄 Initialisation WhatsApp...");

    // --- L'ASTUCE MAGIC POUR ÉVITER L'ERREUR ERR_REQUIRE_ESM ---
    // On utilise eval() pour empêcher TypeScript de transformer l'import en require()
    const baileys = await (eval('import("@whiskeysockets/baileys")') as Promise<any>);
    const boom = await (eval('import("@hapi/boom")') as Promise<any>);
    // ------------------------------------------------------------

    const { 
        default: makeWASocket, 
        useMultiFileAuthState, 
        DisconnectReason, 
        fetchLatestBaileysVersion 
    } = baileys;

    const { Boom } = boom;

    const { state, saveCreds } = await useMultiFileAuthState(AUTH_DIR);
    const { version } = await fetchLatestBaileysVersion();

    sock = makeWASocket({
        version,
        printQRInTerminal: true,
        auth: state,
        // On masque le navigateur pour éviter certains bugs
        browser: ["be COLOR Admin", "Chrome", "1.0.0"]
    });

    sock.ev.on('connection.update', (update: any) => {
        const { connection, lastDisconnect, qr } = update;

        if (qr) {
            qrCode = qr;
            isConnected = false;
            console.log('⚡ QR Code WhatsApp généré (Voir section Paramètres)');
        }

        if (connection === 'close') {
            const shouldReconnect = (lastDisconnect?.error as any)?.output?.statusCode !== DisconnectReason.loggedOut;
            console.log('❌ Connexion WhatsApp fermée. Reconnexion ?', shouldReconnect);
            
            if (shouldReconnect) {
                initWhatsApp();
            } else {
                console.log("⛔ Déconnecté de WhatsApp. Session terminée.");
                isConnected = false;
            }
        } else if (connection === 'open') {
            console.log('✅ WhatsApp Business Connecté ! Prêt à envoyer.');
            qrCode = null;
            isConnected = true;
        }
    });

    sock.ev.on('creds.update', saveCreds);
};

export const sendMessage = async (phone: string, text: string) => {
    if (!sock) {
        console.warn("⚠️ WhatsApp n'est pas encore connecté. Message non envoyé.");
        return false;
    }
    
    if (!phone) return false;

    // Nettoyage du numéro
    let formattedPhone = phone.replace(/\D/g, ''); 
    if (formattedPhone.startsWith('0')) { // Ex: 0612345678 -> 212612345678
        formattedPhone = '212' + formattedPhone.substring(1);
    }
    if (!formattedPhone.endsWith('@s.whatsapp.net')) {
        formattedPhone += '@s.whatsapp.net';
    }

    try {
        await sock.sendMessage(formattedPhone, { text });
        return true;
    } catch (error) {
        console.error("Erreur envoi WhatsApp:", error);
        return false;
    }
};

export const getStatus = () => {
    return { isConnected, qrCode };
};

export const startWhatsApp = () => {
    if (!fs.existsSync(AUTH_DIR)) {
        fs.mkdirSync(AUTH_DIR, { recursive: true });
    }
    // On lance l'initialisation et on attrape les erreurs potentielles
    initWhatsApp().catch(err => console.error("❌ Échec lancement WhatsApp:", err));
}; 