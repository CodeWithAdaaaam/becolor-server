import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// --- UTILITAIRES ---

const getMinutes = (time: string): number => {
    if (!time || !time.includes(':')) return 0;
    const [h, m] = time.split(':').map(Number);
    return h * 60 + m;
};

const formatMinutesToHHMM = (totalMinutes: number): string => {
    const mins = totalMinutes % 1440;
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
};

/**
 * Génère les créneaux pour une plage donnée
 */
const generateSlotsForRange = (start: string, end: string, duration: number, dateStr: string, appointments: any[]) => {
    const slots = [];
    let currentMin = getMinutes(start);
    let endMin = getMinutes(end);

    // Gestion du passage à minuit (ex: 16:00 à 01:00)
    if (endMin <= currentMin) {
        endMin += 1440;
    }

    while (currentMin + duration <= endMin) {
        const currentHHMM = formatMinutesToHHMM(currentMin);
        const slotEndMin = currentMin + duration;
        const endHHMM = formatMinutesToHHMM(slotEndMin);

        const sDate = new Date(`${dateStr}T${currentHHMM}:00`);
        const eDate = new Date(`${dateStr}T${endHHMM}:00`);
        
        if (slotEndMin >= 1440) {
            eDate.setDate(eDate.getDate() + 1);
        }
        
        // Vérification des conflits (chevauchement de dates)
        const conflict = appointments.some((appt: any) => {
            const apptStart = new Date(appt.heure_debut);
            const apptEnd = new Date(appt.heure_fin);
            return (sDate < apptEnd) && (eDate > apptStart);
        });

        if (!conflict) slots.push(currentHHMM);
        currentMin += 15; // Pas de 15 minutes
    }
    return slots;
};

// --- CONTROLEURS ---

/**
 * Récupérer les créneaux (Double Session)
 */
export const getAvailableSlots = async (req: Request, res: Response) => {
  try {
    const { date, serviceId, staffId } = req.query;
    if (!date || !serviceId) return res.status(400).json({ message: "Données manquantes" });

    const selectedDate = new Date(date as string);
    const dayOfWeek = selectedDate.getDay(); 
    const startOfDay = new Date(selectedDate); startOfDay.setHours(0,0,0,0);
    const endOfDay = new Date(selectedDate); endOfDay.setHours(23,59,59,999);

    // 1. Récupération du service (Attention au type Decimal de prix dans le schéma)
    const service = await prisma.service.findUnique({ where: { id: Number(serviceId) } });
    if (!service) return res.status(404).json({ message: "Service introuvable" });
    const totalDuration = service.duree + (service.duree_buffer || 0);

    // 2. Récupération des RDV existants
    const appointments = await prisma.appointment.findMany({
        where: {
            date: { gte: startOfDay, lte: endOfDay },
            statut: { not: 'ANNULE' },
            user_id: (staffId && staffId !== 'any') ? Number(staffId) : undefined
        }
    });

    // 3. Récupération des horaires (Basé sur le modèle OpeningHour du schéma)
    const stdHours = await prisma.openingHour.findUnique({ where: { day: dayOfWeek } });
    
    if (!stdHours || !stdHours.isOpen) return res.json([]);

    let timeRanges: { start: string, end: string }[] = [];
    
    // Session 1 (Matin)
    if (stdHours.morningOpen && stdHours.morningClose) {
        timeRanges.push({ start: stdHours.morningOpen, end: stdHours.morningClose });
    }
    
    // Session 2 (Après-midi/Soir)
    if (stdHours.afternoonOpen && stdHours.afternoonClose) {
        timeRanges.push({ start: stdHours.afternoonOpen, end: stdHours.afternoonClose });
    }

    // 4. Génération des créneaux
    let allSlots: string[] = [];
    for (const range of timeRanges) {
        const rangeSlots = generateSlotsForRange(range.start, range.end, totalDuration, date as string, appointments);
        allSlots = [...allSlots, ...rangeSlots];
    }

    // 5. Filtre sécurité Heure Passée
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    if (date === todayStr) {
        const currentHHMM = formatMinutesToHHMM(now.getHours() * 60 + now.getMinutes());
        allSlots = allSlots.filter(s => s > currentHHMM);
    }

    res.json(allSlots);

  } catch (error) {
    console.error("Erreur getAvailableSlots:", error);
    res.status(500).json({ message: "Erreur serveur" });
  }
};

/**
 * Création RDV (Correction Prisma Relation Multi-Services)
 */
export const createPublicBooking = async (req: Request, res: Response) => {
  try {
    const { client, serviceId, staffId, date, time } = req.body;

    // 1. Identification / Création Client
    let clientDb = await prisma.client.findFirst({ where: { tel_principal: client.tel } });
    if (!clientDb) {
        clientDb = await prisma.client.create({
            data: { 
                nom: client.nom, 
                prenom: client.prenom, 
                tel_principal: client.tel, 
                email: client.email, 
                source: 'public_booking' 
            }
        });
    }

    // 2. Calcul Durée & Prix
    const service = await prisma.service.findUnique({ where: { id: Number(serviceId) } });
    if (!service) return res.status(404).json({ message: "Service introuvable" });
    const totalDuration = service.duree + (service.duree_buffer || 0);

    const startDateTime = new Date(`${date}T${time}:00`);
    const endDateTime = new Date(startDateTime.getTime() + totalDuration * 60000);

    // 3. Création du RDV (Correction structure data selon schema.prisma)
    const newAppointment = await prisma.appointment.create({
      data: {
        client_id: clientDb.id,
        user_id: staffId && staffId !== 'any' ? Number(staffId) : null,
        date: startDateTime,
        heure_debut: startDateTime,
        heure_fin: endDateTime,
        prix: service.prix, // Prisma accepte service.prix car c'est un Decimal
        statut: 'CONFIRME',
        // Utilisation de la relation Many-to-Many
        services: {
            connect: [{ id: Number(serviceId) }]
        }
      },
      include: { 
        client: true, 
        services: true // On inclut 'services' au pluriel
      }
    });

    // 4. Notification WhatsApp
    try {
        const { sendMessage } = await import('../services/whatsappClient');
        if (newAppointment.client.tel_principal) {
            const formattedDate = new Date(startDateTime).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
            const serviceName = newAppointment.services[0]?.nom || "Prestation";
            const message = `🌟 *Confirmation Réservation be COLOR*\n\nBonjour ${newAppointment.client.prenom},\nVotre demande est bien reçue !\n\n🗓️ *${formattedDate}*\n🕒 *${time}*\n💇‍♀️ Prestation : ${serviceName}\n\nÀ très vite !`;
            sendMessage(newAppointment.client.tel_principal, message).catch(e => console.error("Error WS:", e));
        }
    } catch (wsErr) { console.log("WhatsApp skip"); }

    res.status(201).json(newAppointment);

  } catch (error) {
    console.error("Erreur createPublicBooking:", error);
    res.status(500).json({ message: "Erreur lors de l'enregistrement de la réservation." });
  }
};