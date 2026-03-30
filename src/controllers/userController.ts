import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs'; // <--- AJOUT IMPORTANT

const prisma = new PrismaClient();

// --- RÉCUPÉRER TOUT LE STAFF ---
export const getAllStaff = async (req: Request, res: Response) => {
  try {
    const staff = await prisma.user.findMany({
      select: {
        id: true,
        nom: true,
        prenom: true,
        email: true, // J'ai ajouté l'email car on en a besoin pour l'édition
        roles: true,
        color: true
      },
      orderBy: { prenom: 'asc' }
    });
    
    console.log(`✅ Staff chargé : ${staff.length} employés trouvés.`);
    res.json(staff);
  } catch (error) {
    console.error("Erreur getAllStaff:", error);
    res.status(500).json({ message: "Impossible de récupérer le personnel" });
  }
};

// --- RÉCUPÉRER LE PLANNING D'UN USER ---
export const getUserSchedule = async (req: Request, res: Response) => {
  try {
    const userId = Number(req.params.id);

    const schedule = await prisma.userSchedule.findMany({
      where: { user_id: userId },
      orderBy: { day: 'asc' }
    });

    res.json(schedule);
  } catch (error) {
    res.status(500).json({ message: "Erreur récupération planning" });
  }
};

// --- METTRE À JOUR JUSTE LE PLANNING (EXISTANT) ---
export const updateUserSchedule = async (req: Request, res: Response) => {
  try {
    const userId = Number(req.params.id);
    const days = req.body; 

    await prisma.$transaction(
      days.map((dayData: any) => 
        prisma.userSchedule.upsert({
          where: {
            user_id_day: { user_id: userId, day: dayData.day }
          },
          update: {
            startTime: dayData.startTime,
            endTime: dayData.endTime,
            isWorking: dayData.isWorking
          },
          create: {
            user_id: userId,
            day: dayData.day,
            startTime: dayData.startTime,
            endTime: dayData.endTime,
            isWorking: dayData.isWorking
          }
        })
      )
    );

    res.json({ message: "Planning mis à jour avec succès" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Erreur sauvegarde planning" });
  }
};

// --- AJOUT : METTRE À JOUR UN UTILISATEUR COMPLET (PUT) ---
export const updateUser = async (req: Request, res: Response) => {
  const userId = Number(req.params.id);
  const { nom, prenom, email, roles, color, password, schedule } = req.body;

  try {
    // 1. Préparer les données de l'utilisateur
    const updateData: any = {
      nom,
      prenom,
      email,
      roles,
      color
    };

    // 2. Si un nouveau mot de passe est envoyé, on le hash
    if (password && password.trim() !== '') {
      const salt = await bcrypt.genSalt(10);
      updateData.password = await bcrypt.hash(password, salt);
    }

    // 3. Transaction : Update User + Update Schedule
    await prisma.$transaction(async (tx) => {
      // A. Mise à jour des infos de base
      await tx.user.update({
        where: { id: userId },
        data: updateData
      });

      // B. Mise à jour du planning (si fourni)
      if (schedule && Array.isArray(schedule)) {
        await Promise.all(schedule.map((day: any) => 
          tx.userSchedule.upsert({
            where: {
              user_id_day: { user_id: userId, day: day.day }
            },
            update: {
              startTime: day.startTime,
              endTime: day.endTime,
              isWorking: day.isWorking
            },
            create: {
              user_id: userId,
              day: day.day,
              startTime: day.startTime,
              endTime: day.endTime,
              isWorking: day.isWorking
            }
          })
        ));
      }
    });

    res.json({ message: "Utilisateur mis à jour avec succès" });

  } catch (error) {
    console.error("Erreur update user:", error);
    res.status(500).json({ message: "Erreur lors de la mise à jour de l'utilisateur" });
  }
};

// --- AJOUT : SUPPRIMER UN UTILISATEUR (DELETE) ---
// (Au cas où tu en aurais besoin aussi pour la fonction handleDelete du frontend)
export const deleteUser = async (req: Request, res: Response) => {
    const userId = Number(req.params.id);
    try {
        // Supprimer d'abord les dépendances si nécessaire (ex: planning)
        // Prisma le fait souvent auto si "Cascade" est activé, sinon :
        await prisma.userSchedule.deleteMany({ where: { user_id: userId } });
        
        await prisma.user.delete({ where: { id: userId } });
        res.json({ message: "Utilisateur supprimé" });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Impossible de supprimer (Utilisateur lié à des RDV ?)" });
    }
};