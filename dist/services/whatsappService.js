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
exports.sendWhatsAppMessage = void 0;
// server/src/services/whatsappService.ts
const whatsappClient_1 = require("./whatsappClient");
const sendWhatsAppMessage = (phone, message) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        // 1. Vérifier si WhatsApp est connecté
        if (!whatsappClient_1.sock) {
            console.log("⚠️ Le client WhatsApp n'est pas encore initialisé ou connecté.");
            return false;
        }
        // 2. Nettoyer et Formater le numéro de téléphone
        // On enlève tout ce qui n'est pas un chiffre
        let cleanPhone = phone.replace(/\D/g, '');
        // Si le numéro commence par 0 (ex: 06...), on remplace par 212 (Maroc)
        if (cleanPhone.startsWith('0')) {
            cleanPhone = '212' + cleanPhone.substring(1);
        }
        // Format technique requis par WhatsApp (JID)
        const jid = `${cleanPhone}@s.whatsapp.net`;
        // 3. Envoyer le message
        // On ajoute un petit délai d'une seconde pour la stabilité
        yield new Promise(r => setTimeout(r, 1000));
        yield whatsappClient_1.sock.sendMessage(jid, { text: message });
        console.log(`✅ Message WhatsApp envoyé à ${cleanPhone}`);
        return true;
    }
    catch (error) {
        console.error("❌ Erreur lors de l'envoi WhatsApp:", error);
        return false;
    }
});
exports.sendWhatsAppMessage = sendWhatsAppMessage;
