// server/src/controllers/appointmentController.ts
import { Request, Response } from 'express';
import { PrismaClient, Prisma } from '@prisma/client'; 
import { logActivity } from '../services/logger';
import { sendMessage } from '../services/whatsappClient';

const prisma = new PrismaClient();

// ============================================================
// FONCTION : VÉRIFIE HORAIRES + CONFLITS (AMÉLIORÉE)
// ============================================================
const checkAvailability = async (
  userId: number, 
  start: Date, 
  end: Date, 
  excludeAppointmentId?: number,
  db: any = prisma // FIX: Permet d'utiliser la transaction en cours
): Promise<string | null> => {
  if (!userId) return null;

  const dayOfWeek = start.getDay();

  // 1. RÉCUPÉRER LES HORAIRES DU MAGASIN (Double Session)
  const storeHours = await db.openingHour.findUnique({ 
    where: { day: dayOfWeek } 
  });

  if (!storeHours || !storeHours.isOpen) {
    return "Le salon est fermé ce jour-là.";
  }

  const getMin = (time: string) => {
    const [h, m] = time.split(':').map(Number);
    return h * 60 + m;
  };

  const startMin = start.getHours() * 60 + start.getMinutes();
  const endMin = end.getHours() * 60 + end.getMinutes();

  const mOpen = getMin(storeHours.morningOpen);
  const mClose = getMin(storeHours.morningClose);
  const aOpen = getMin(storeHours.afternoonOpen);
  const aClose = getMin(storeHours.afternoonClose);

  // Vérification des sessions
  const isInMorning = startMin >= mOpen && endMin <= mClose;
  const isOvernight = aClose < aOpen;
  const isInAfternoon = isOvernight
    ? (startMin >= aOpen || startMin < aClose)
    : (startMin >= aOpen && endMin <= aClose);

  if (!isInMorning && !isInAfternoon) {
    if (startMin < mClose && endMin > aOpen) {
      return "Le rendez-vous chevauche la pause déjeuner.";
    }
    return "En dehors des horaires d'ouverture.";
  }

  // 2. VÉRIFIER LE PLANNING PERSONNEL DE L'EMPLOYÉ
  const staffSchedule = await db.userSchedule.findUnique({ 
    where: { user_id_day: { user_id: userId, day: dayOfWeek } } 
  });

  if (staffSchedule && !staffSchedule.isWorking) {
    return "L'employé est en repos ce jour-là.";
  }

  // 3. VÉRIFIER LES CONFLITS (FIX 409 : Exclusion correcte de l'ID)
  console.log(`[DEBUG] Vérification dispo pour user ${userId} | Exclusion ID: ${excludeAppointmentId}`);
  console.log(`[DEBUG] Période demandée : De ${start.toLocaleString()} à ${end.toLocaleString()}`);

  const conflict = await db.appointment.findFirst({
    where: {
      user_id: userId,
      statut: { not: 'ANNULE' },
      id: excludeAppointmentId ? { not: excludeAppointmentId } : undefined,
      AND:[ 
        { heure_debut: { lt: end } }, 
        { heure_fin: { gt: start } } 
      ]
    }
  });

  if (conflict) {
    console.warn(`[ATTENTION] Conflit détecté avec le RDV existant ID: ${conflict.id}`);
    // On renvoie l'ID dans le message pour le voir directement sur le frontend !
    return `Ce créneau est déjà pris par le rendez-vous #${conflict.id}.`;
  }

  return null;
}

// ============================================================
// 1. RÉCUPÉRER LES RDV
// ============================================================
export const getAppointments = async (req: Request, res: Response) => {
  try {
    const { start, end, userId, role } = req.query;
    if (!start || !end) return res.status(400).json({ message: "Dates requises" });

    const whereClause: any = {
      heure_debut: { gte: new Date(start as string) },
      heure_fin: { lte: new Date(end as string) },
      statut: { not: 'ANNULE' }
    };

    if (userId && userId !== 'all') whereClause.user_id = Number(userId);
    
    if (role && (!userId || userId === 'all')) {
      whereClause.user = { roles: { has: role as any } };
    }

    const appointments = await prisma.appointment.findMany({
      where: whereClause,
      include: { client: true, services: true, user: true },
      orderBy: { heure_debut: 'asc' },
    });
    res.json(appointments);
  } catch (error) {
    res.status(500).json({ message: "Erreur récupération des RDV" });
  }
};

// ============================================================
// 2. CRÉER UN RDV (MULTI-SERVICES)
// ============================================================
export const createAppointment = async (req: Request, res: Response) => {
  try {
    const { client_id, service_ids, user_id, heure_debut } = req.body;
    
    if (!user_id || !service_ids || service_ids.length === 0) {
        return res.status(400).json({ message: "Données manquantes (prestataire ou services)." });
    }

    const selectedServices = await prisma.service.findMany({
        where: { id: { in: service_ids.map((id: any) => Number(id)) } }
    });

    const totalDuration = selectedServices.reduce((acc, s) => acc + s.duree + (s.duree_buffer || 0), 0);
    const calculatedPrice = selectedServices.reduce((acc, s) => acc + Number(s.prix), 0);

    const startDate = new Date(heure_debut);
    const endDate = new Date(startDate.getTime() + totalDuration * 60000);

    // Vérification disponibilité (sans ID à exclure car c'est une création)
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
// 3. MISE À JOUR (DASHBOARD + CAISSE + DRAG&DROP)
// ============================================================
export const updateAppointment = async (req: Request, res: Response) => {
  const { id } = req.params;
  // On accepte 'start' et 'end' au cas où le drag&drop du frontend utilise ces clés
  const { heure_debut, start, heure_fin, end, user_id, statut, price, service_ids } = req.body;
  const appointmentId = Number(id);

  try {
    const result = await prisma.$transaction(async (tx) => {
      const currentAppt = await tx.appointment.findUnique({
        where: { id: appointmentId },
        include: { services: true, client: true }
      });

      if (!currentAppt) throw new Error("Rendez-vous introuvable");

      // 1. Gestion du Drag & Drop : Priorité aux données entrantes
      const incomingStart = heure_debut || start;
      const newStart = incomingStart ? new Date(incomingStart) : currentAppt.heure_debut;
      
      const providerId = user_id ? Number(user_id) : currentAppt.user_id;

      // Recalcul des services si modifiés
      let selectedServices = currentAppt.services;
      if (service_ids && Array.isArray(service_ids)) {
        selectedServices = await tx.service.findMany({
          where: { id: { in: service_ids.map((sid: any) => Number(sid)) } }
        });
      }

      // 2. Gestion du Resize (FIX 409) : Si le front envoie une heure de fin manuelle, on l'utilise.
      // Sinon, on calcule avec la durée des prestations.
      const incomingEnd = heure_fin || end;
      let newEnd: Date;
      if (incomingEnd) {
        newEnd = new Date(incomingEnd);
      } else {
        const totalDuration = selectedServices.reduce((acc, s) => acc + s.duree + (s.duree_buffer || 0), 0);
        newEnd = new Date(newStart.getTime() + totalDuration * 60000);
      }

      // FIX : On détermine le statut final AVANT la vérification
      const finalStatut = statut || currentAppt.statut;

      // Vérification disponibilité (On NE VÉRIFIE PAS si le RDV est en cours d'annulation)
      // FIX TIMEOUT: On passe `tx` ici !
      if (providerId && finalStatut !== 'ANNULE') {
          const conflictReason = await checkAvailability(providerId, newStart, newEnd, appointmentId, tx);
          if (conflictReason) {
              const err = new Error(conflictReason);
              (err as any).statusCode = 409;
              throw err;
          }
      }

      // Calcul du prix
      let finalPrice = currentAppt.prix;
      if (price !== undefined) {
          finalPrice = new Prisma.Decimal(price);
      } else if (service_ids) {
          const total = selectedServices.reduce((acc, s) => acc + Number(s.prix), 0);
          finalPrice = new Prisma.Decimal(total);
      }

      const updated = await tx.appointment.update({
        where: { id: appointmentId },
        data: {
          heure_debut: newStart,
          heure_fin: newEnd,
          user_id: providerId,
          statut: finalStatut, // On utilise la variable ici
          date: newStart,
          prix: finalPrice,
          services: service_ids ? {
            set: service_ids.map((sid: any) => ({ id: Number(sid) }))
          } : undefined
        },
        include: { user: true, client: true, services: true }
      });

      // 3. Encaissement auto (FIX 500 : Empêcher le doublon de transaction)
      if (finalStatut === 'TERMINE') {
        const existingTx = await tx.transaction.findFirst({
          where: { appointment_id: updated.id }
        });
        
        if (!existingTx) {
          await tx.transaction.create({
            data: {
              amount: finalPrice,
              type: 'ENTREE',
              category: 'PRESTATION',
              description: `RDV: ${updated.client.prenom}`,
              appointment_id: updated.id
            }
          });
        } else if (price !== undefined) {
          // (Optionnel) Si on modifie le prix d'un RDV déjà terminé, on met à jour la transaction
          await tx.transaction.update({
            where: { id: existingTx.id },
            data: { amount: finalPrice }
          });
        }
      }

      return updated;
    }, {
      maxWait: 5000, // temps max pour se connecter
      timeout: 10000 // temps max pour exécuter la transaction (10s)
    });

    res.json(result);
  } catch (error: any) {
    if (error.statusCode === 409) {
        return res.status(409).json({ message: error.message });
    }
    // J'ajoute un console.error pour que tu voies l'erreur exacte dans tes logs Hostinger si la 500 revient
    console.error("Erreur serveur UpdateAppointment :", error);
    res.status(500).json({ message: "Erreur serveur lors de la mise à jour." });
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
// 5. LISTE COMPLÈTE (DASHBOARD)
// ============================================================
export const getAppointmentsList = async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 15;
    const search = (req.query.search as string) || '';
    const status = (req.query.status as string) || 'ALL';
    const skip = (page - 1) * limit;

    const whereClause: any = {
      OR:[
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