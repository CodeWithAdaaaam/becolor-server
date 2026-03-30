import { PrismaClient } from '@prisma/client';
import { sendMessage } from '../services/whatsappClient';
import { Request, Response } from 'express';

const prisma = new PrismaClient();

// ============================================================
// 1. JOB D'ENVOI DE RAPPELS AUTOMATIQUES
// ============================================================
export async function startReminderJob() {
  try {
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const appointments = await prisma.appointment.findMany({
      where: {
        date: {
          gte: now,
          lte: tomorrow
        },
        statut: 'CONFIRME',
        reminder_sent: false
      },
      include: {
        client: true,
        services: true, // ✅ CORRECTION : pluriel
        user: true
      }
    });

    for (const appointment of appointments) {
      const timeUntilAppointment = appointment.date.getTime() - now.getTime();
      const hoursUntilAppointment = timeUntilAppointment / (1000 * 60 * 60);

      // Envoyer un rappel entre 12h et 24h avant
      if (hoursUntilAppointment <= 24 && hoursUntilAppointment > 12) {
        
        // ✅ CORRECTION : On regroupe les noms des services s'il y en a plusieurs
        const servicesList = appointment.services.map(s => s.nom).join(', ');

        const message = `🔔 *Rappel be COLOR*\n\n` +
          `Bonjour ${appointment.client.prenom},\n` +
          `Vous avez un rendez-vous demain à ${appointment.date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}.\n` +
          `Prestation(s) : ${servicesList}\n` +
          `Coiffeur(se): ${appointment.user?.prenom || 'Non attribué'}\n\n` +
          `Merci de nous prévenir en cas d'empêchement.`;

        try {
          if (appointment.client.tel_principal) {
            await sendMessage(appointment.client.tel_principal, message);
            
            await prisma.appointment.update({
              where: { id: appointment.id },
              data: { reminder_sent: true }
            });
          }
        } catch (error) {
          console.error(`Erreur d'envoi de rappel pour le RDV ${appointment.id}:`, error);
        }
      }
    }
  } catch (error) {
    console.error('Erreur dans le job de rappel:', error);
  }
}

// Planifier le job pour qu'il s'exécute toutes les heures
setInterval(startReminderJob, 60 * 60 * 1000);

// ============================================================
// 2. RÉSERVATION PUBLIQUE (UTILISÉ PAR LE SITE WEB)
// ============================================================
export const createPublicBooking = async (req: Request, res: Response) => {
  try {
    const { client, serviceId, staffId, date, time } = req.body;

    // 1. Gestion Client
    let clientDb = await prisma.client.findFirst({
        where: { tel_principal: client.tel }
    });

    if (!clientDb) {
        clientDb = await prisma.client.create({
            data: {
                nom: client.nom,
                prenom: client.prenom,
                tel_principal: client.tel,
                email: client.email
            }
        });
    }

    // 2. Service
    const service = await prisma.service.findUnique({ where: { id: Number(serviceId) } });
    if (!service) return res.status(404).json({ message: "Service introuvable" });

    // 3. Dates
    const startDateTime = new Date(`${date}T${time}:00`);
    const endDateTime = new Date(startDateTime.getTime() + service.duree * 60000);

    // 4. Création du RDV
    const newAppointment = await prisma.appointment.create({
      data: {
        client_id: clientDb.id,
        user_id: staffId ? Number(staffId) : null,
        date: startDateTime,
        heure_debut: startDateTime,
        heure_fin: endDateTime,
        prix: service.prix,
        statut: 'CONFIRME',
        // ✅ CORRECTION : Relation plusieurs-à-plusieurs
        services: {
            connect: [{ id: Number(serviceId) }]
        }
      },
      include: {
        client: true,
        services: true // ✅ CORRECTION : pluriel
      }
    });

    // 5. Envoi WhatsApp
    try {
        if (newAppointment.client && newAppointment.client.tel_principal) {
            const formattedDate = new Date(startDateTime).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
            
            // ✅ CORRECTION : On récupère le nom du premier service
            const serviceName = newAppointment.services[0]?.nom || "Prestation";

            const message = `🌟 *Confirmation Réservation be COLOR*\n\nBonjour ${newAppointment.client.prenom},\nVotre demande est bien reçue !\n\n🗓️ *${formattedDate}*\n🕒 *${time}*\n💇‍♀️ Prestation : ${serviceName}\n\nÀ très vite !`;

            sendMessage(newAppointment.client.tel_principal, message).catch(err => console.error("Erreur envoi message:", err));
        }
    } catch (whatsappError) {
        console.error("Erreur module WhatsApp:", whatsappError);
    }

    res.status(201).json(newAppointment);

  } catch (error) {
    console.error("Erreur createPublicBooking:", error);
    res.status(500).json({ message: "Erreur lors de la réservation." });
  }
};