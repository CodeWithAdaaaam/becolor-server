// server/src/controllers/appointmentController.ts
import { Request, Response } from 'express';
import { PrismaClient, Prisma } from '@prisma/client'; // Import de Prisma pour les types Decimal
import { logActivity } from '../services/logger';
import { sendMessage } from '../services/whatsappClient';

const prisma = new PrismaClient();

// ============================================================
// FONCTION : VÉRIFIE HORAIRES + CONFLITS
// ============================================================
const checkAvailability = async (userId: number, start: Date, end: Date, excludeAppointmentId?: number): Promise<string | null> => {
  if (!userId) return null;

  const dayOfWeek = start.getDay();
  const schedule = await prisma.userSchedule.findUnique({ 
    where: { user_id_day: { user_id: userId, day: dayOfWeek } } 
  });

  if (schedule) {
    if (!schedule.isWorking) return "L'employé ne travaille pas ce jour-là (Repos).";
    const [startHour, startMin] = schedule.startTime.split(':').map(Number);
    const [endHour, endMin] = schedule.endTime.split(':').map(Number);
    
    const workStart = new Date(start); workStart.setHours(startHour, startMin, 0, 0);
    const workEnd = new Date(start); workEnd.setHours(endHour, endMin, 0, 0);
    
    if (start < workStart || end > workEnd) {
        return `L'employé travaille uniquement de ${schedule.startTime} à ${schedule.endTime}.`;
    }
  }

  const conflict = await prisma.appointment.findFirst({
    where: {
      user_id: userId,
      id: excludeAppointmentId ? { not: excludeAppointmentId } : undefined,
      statut: { not: 'ANNULE' },
      AND: [ { heure_debut: { lt: end } }, { heure_fin: { gt: start } } ]
    }
  });

  if (conflict) return "Ce créneau est déjà pris par un autre rendez-vous.";
  return null;
};

// ============================================================
// 1. RÉCUPÉRER LES RDV
// ============================================================
export const getAppointments = async (req: Request, res: Response) => {
  try {
    const { start, end, userId, role } = req.query;
    if (!start || !end) return res.status(400).json({ message: "Dates requises" });

    const whereClause: any = {
      date: { gte: new Date(start as string), lte: new Date(end as string) },
      statut: { not: 'ANNULE' }
    };

    if (userId && userId !== 'all') whereClause.user_id = Number(userId);
    
    if (role && (!userId || userId === 'all')) {
      whereClause.user = { roles: { has: role as any } };
    }

    const appointments = await prisma.appointment.findMany({
      where: whereClause,
      include: { 
        client: true, 
        services: true, 
        user: true 
      },
      orderBy: { heure_debut: 'asc' },
    });
    res.json(appointments);
  } catch (error) {
    console.error("Erreur getAppointments:", error);
    res.status(500).json({ message: "Erreur récupération des RDV" });
  }
};

// ============================================================
// 2. CRÉER UN RDV (MULTI-SERVICES)
// ============================================================
export const createAppointment = async (req: Request, res: Response) => {
  try {
    const { client_id, service_ids, user_id, heure_debut } = req.body;
    
    if (!user_id) return res.status(400).json({ message: "Prestataire obligatoire." });
    if (!service_ids || !Array.isArray(service_ids) || service_ids.length === 0) {
        return res.status(400).json({ message: "Au moins une prestation est requise." });
    }

    const selectedServices = await prisma.service.findMany({
        where: { id: { in: service_ids.map(id => Number(id)) } }
    });

    const totalDuration = selectedServices.reduce((acc, s) => acc + s.duree + (s.duree_buffer || 0), 0);
    const calculatedPrice = selectedServices.reduce((acc, s) => acc + Number(s.prix), 0);

    const startDate = new Date(heure_debut);
    const endDate = new Date(startDate.getTime() + totalDuration * 60000);

    const conflictReason = await checkAvailability(Number(user_id), startDate, endDate);
    if (conflictReason) return res.status(409).json({ message: conflictReason }); 

    const newAppointment = await prisma.appointment.create({
      data: {
        client_id: Number(client_id),
        user_id: Number(user_id),
        date: startDate,
        heure_debut: startDate,
        heure_fin: endDate,
        prix: new Prisma.Decimal(calculatedPrice),
        statut: 'CONFIRME',
        services: {
            connect: selectedServices.map(s => ({ id: s.id }))
        }
      },
      include: { client: true, services: true }
    });

    // Envoi WhatsApp
    try {
      if (newAppointment.client.tel_principal) {
        const formattedDate = new Date(startDate).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
        const formattedTime = new Date(startDate).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
        const serviceNames = newAppointment.services.map(s => s.nom).join(', ');
        
        const message = `🌟 *Confirmation RDV be COLOR*\n\nBonjour ${newAppointment.client.prenom},\nRDV confirmé !\n\n🗓️ *${formattedDate}*\n🕒 *${formattedTime}*\n💅 Prestation(s) : ${serviceNames}\n💰 Total : ${calculatedPrice} MAD\n\nÀ très vite !`;
        sendMessage(newAppointment.client.tel_principal, message);
      }
    } catch (e) {}

    res.status(201).json(newAppointment);
  } catch (error) {
    res.status(500).json({ message: "Erreur création" });
  }
};

// ============================================================
// 3. MISE À JOUR (DASHBOARD + CAISSE)
// ============================================================
export const updateAppointment = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { heure_debut, user_id, statut, price, service_ids } = req.body;
  const appointmentId = Number(id);

  try {
    const result = await prisma.$transaction(async (tx) => {
        const currentAppt = await tx.appointment.findUnique({ 
            where: { id: appointmentId }, 
            include: { services: true, client: true } 
        });

        if (!currentAppt) throw new Error("RDV introuvable");

        const newStart = heure_debut ? new Date(heure_debut) : currentAppt.heure_debut;
        const providerId = user_id ? Number(user_id) : currentAppt.user_id;

        // Gestion des services si fournis
        let newServices = currentAppt.services;
        if (service_ids && Array.isArray(service_ids)) {
             newServices = await tx.service.findMany({
                 where: { id: { in: service_ids.map((s: any) => Number(s)) } }
             });
        }

        const totalDuration = newServices.reduce((acc, s) => acc + s.duree + (s.duree_buffer || 0), 0);
        const newEnd = new Date(newStart.getTime() + totalDuration * 60000);

        if (heure_debut || (user_id && user_id !== currentAppt.user_id)) {
            if (providerId) { 
                const conflictReason = await checkAvailability(providerId, newStart, newEnd, appointmentId);
                if (conflictReason) throw new Error(conflictReason);
            }
        }

        // Prix final (saisie manuelle ou calcul auto)
        let finalPrice = Number(currentAppt.prix);
        if (price !== undefined) {
            finalPrice = Number(price);
        } else if (service_ids) {
            finalPrice = newServices.reduce((acc, s) => acc + Number(s.prix), 0);
        }

        const updatedAppointment = await tx.appointment.update({
            where: { id: appointmentId },
            data: { 
                heure_debut: newStart, 
                heure_fin: newEnd, 
                user_id: providerId, 
                statut: statut || currentAppt.statut, 
                date: newStart,
                prix: new Prisma.Decimal(finalPrice),
                services: service_ids ? {
                    set: newServices.map(s => ({ id: s.id }))
                } : undefined
            },
            include: { user: true, client: true, services: true }
        });

        // ENCAISSEMENT : Création de la transaction
        if (statut === 'TERMINE') {
            await tx.transaction.create({
                data: {
                    amount: new Prisma.Decimal(finalPrice),
                    type: 'ENTREE',
                    category: 'PRESTATION',
                    description: `Encaissement RDV: ${updatedAppointment.client.prenom}`,
                    appointment_id: updatedAppointment.id
                }
            });
        }

        return updatedAppointment;
    });
    
    res.json(result);

  } catch (error: any) {
    if (error.message && (error.message.includes("conflit") || error.message.includes("déjà pris"))) {
        return res.status(409).json({ message: error.message });
    }
    res.status(500).json({ message: "Erreur mise à jour" });
  }
};

// ============================================================
// 4. SUPPRESSION
// ============================================================
export const deleteAppointment = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const appt = await prisma.appointment.findUnique({ where: { id: Number(id) }, include: { client: true } });
    await prisma.appointment.delete({ where: { id: Number(id) } });
    if (appt) await logActivity(1, 'SUPPRESSION_RDV', `RDV de ${appt.client.prenom} supprimé.`);
    res.json({ message: "RDV supprimé" });
  } catch (error) {
    res.status(500).json({ message: "Erreur suppression" });
  }
};

// ============================================================
// 5. LISTE COMPLÈTE (PAGINÉE)
// ============================================================
export const getAppointmentsList = async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 15;
    const search = (req.query.search as string) || '';
    const status = (req.query.status as string) || 'ALL';
    const skip = (page - 1) * limit;

    const whereClause: any = {
      OR: [
        { client: { nom: { contains: search, mode: 'insensitive' } } },
        { client: { prenom: { contains: search, mode: 'insensitive' } } },
      ],
    };

    if (status !== 'ALL') whereClause.statut = status;

    const [appointments, total] = await prisma.$transaction([
      prisma.appointment.findMany({
        where: whereClause,
        include: { client: true, services: true, user: true },
        orderBy: { date: 'desc' },
        skip,
        take: limit,
      }),
      prisma.appointment.count({ where: whereClause }),
    ]);

    res.json({
      data: appointments,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    res.status(500).json({ message: "Erreur liste" });
  }
};