// server/src/services/whatsappService.ts
import { sock } from './whatsappClient';

export const sendWhatsAppMessage = async (phone: string, message: string) => {
  try {
    // 1. Vérifier si WhatsApp est connecté
    if (!sock) {
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
    await new Promise(r => setTimeout(r, 1000)); 

    await sock.sendMessage(jid, { text: message });

    console.log(`✅ Message WhatsApp envoyé à ${cleanPhone}`);
    return true;

  } catch (error) {
    console.error("❌ Erreur lors de l'envoi WhatsApp:", error);
    return false;
  }
};