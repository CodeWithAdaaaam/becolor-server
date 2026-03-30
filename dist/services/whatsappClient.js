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
exports.startWhatsApp = exports.getStatus = exports.sendMessage = exports.initWhatsApp = exports.sock = void 0;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
// ⚠️ NE RIEN IMPORTER DE BAILEYS ICI EN HAUT ⚠️
const AUTH_DIR = path_1.default.join(__dirname, '../../auth_info_baileys');
let qrCode = null;
let isConnected = false;
const initWhatsApp = () => __awaiter(void 0, void 0, void 0, function* () {
    console.log("🔄 Initialisation WhatsApp...");
    // --- L'ASTUCE MAGIC POUR ÉVITER L'ERREUR ERR_REQUIRE_ESM ---
    // On utilise eval() pour empêcher TypeScript de transformer l'import en require()
    const baileys = yield eval('import("@whiskeysockets/baileys")');
    const boom = yield eval('import("@hapi/boom")');
    // ------------------------------------------------------------
    const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion } = baileys;
    const { Boom } = boom;
    const { state, saveCreds } = yield useMultiFileAuthState(AUTH_DIR);
    const { version } = yield fetchLatestBaileysVersion();
    exports.sock = makeWASocket({
        version,
        printQRInTerminal: true,
        auth: state,
        // On masque le navigateur pour éviter certains bugs
        browser: ["be COLOR Admin", "Chrome", "1.0.0"]
    });
    exports.sock.ev.on('connection.update', (update) => {
        var _a, _b;
        const { connection, lastDisconnect, qr } = update;
        if (qr) {
            qrCode = qr;
            isConnected = false;
            console.log('⚡ QR Code WhatsApp généré (Voir section Paramètres)');
        }
        if (connection === 'close') {
            const shouldReconnect = ((_b = (_a = lastDisconnect === null || lastDisconnect === void 0 ? void 0 : lastDisconnect.error) === null || _a === void 0 ? void 0 : _a.output) === null || _b === void 0 ? void 0 : _b.statusCode) !== DisconnectReason.loggedOut;
            console.log('❌ Connexion WhatsApp fermée. Reconnexion ?', shouldReconnect);
            if (shouldReconnect) {
                (0, exports.initWhatsApp)();
            }
            else {
                console.log("⛔ Déconnecté de WhatsApp. Session terminée.");
                isConnected = false;
            }
        }
        else if (connection === 'open') {
            console.log('✅ WhatsApp Business Connecté ! Prêt à envoyer.');
            qrCode = null;
            isConnected = true;
        }
    });
    exports.sock.ev.on('creds.update', saveCreds);
});
exports.initWhatsApp = initWhatsApp;
const sendMessage = (phone, text) => __awaiter(void 0, void 0, void 0, function* () {
    if (!exports.sock) {
        console.warn("⚠️ WhatsApp n'est pas encore connecté. Message non envoyé.");
        return false;
    }
    if (!phone)
        return false;
    // Nettoyage du numéro
    let formattedPhone = phone.replace(/\D/g, '');
    if (formattedPhone.startsWith('0')) { // Ex: 0612345678 -> 212612345678
        formattedPhone = '212' + formattedPhone.substring(1);
    }
    if (!formattedPhone.endsWith('@s.whatsapp.net')) {
        formattedPhone += '@s.whatsapp.net';
    }
    try {
        yield exports.sock.sendMessage(formattedPhone, { text });
        return true;
    }
    catch (error) {
        console.error("Erreur envoi WhatsApp:", error);
        return false;
    }
});
exports.sendMessage = sendMessage;
const getStatus = () => {
    return { isConnected, qrCode };
};
exports.getStatus = getStatus;
const startWhatsApp = () => {
    if (!fs_1.default.existsSync(AUTH_DIR)) {
        fs_1.default.mkdirSync(AUTH_DIR, { recursive: true });
    }
    // On lance l'initialisation et on attrape les erreurs potentielles
    (0, exports.initWhatsApp)().catch(err => console.error("❌ Échec lancement WhatsApp:", err));
};
exports.startWhatsApp = startWhatsApp;
