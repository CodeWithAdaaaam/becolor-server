// server/src/controllers/authController.ts
import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || 'ton_secret_jwt_super_securise';

// ============================================================
// 1. INSCRIPTION (Register) AVEC MULTI-RÔLES
// ============================================================
export const register = async (req: Request, res: Response) => {
  try {
    const { 
      nom, 
      prenom, 
      email, 
      password, 
      roles,      // Reçu comme tableau : ["COIFFEUR", "ONGLERIE"]
      color,      
      schedule    
    } = req.body;

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ message: "Cet email est déjà utilisé." });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    // Préparer le planning par défaut si vide
    let scheduleData = schedule;
    if (!scheduleData || !Array.isArray(scheduleData) || scheduleData.length === 0) {
        scheduleData = Array.from({ length: 7 }, (_, i) => ({
            day: i,
            startTime: "09:00",
            endTime: "19:00",
            isWorking: i !== 0 
        }));
    }

    const newUser = await prisma.user.create({
      data: {
        nom,
        prenom,
        email,
        password_hash: hashedPassword,
        // MODIFICATION : Utilise roles (tableau)
        roles: roles && roles.length > 0 ? roles : ['RECEPTIONIST'],
        color: color || '#3b82f6',
        schedules: {
            create: scheduleData.map((s: any) => ({
                day: Number(s.day),
                startTime: s.startTime,
                endTime: s.endTime,
                isWorking: Boolean(s.isWorking)
            }))
        }
      },
      include: {
        schedules: true
      }
    });

    res.status(201).json({ message: "Personnel créé avec succès", user: newUser });
  } catch (error) {
    console.error("Erreur register:", error);
    res.status(500).json({ message: "Erreur lors de l'inscription" });
  }
};

// ============================================================
// 2. CONNEXION (Login)
// ============================================================
export const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return res.status(401).json({ message: "Email ou mot de passe incorrect." });
    }

    const isValid = await bcrypt.compare(password, user.password_hash);
    if (!isValid) {
      return res.status(401).json({ message: "Email ou mot de passe incorrect." });
    }

    const token = jwt.sign(
      { userId: user.id, roles: user.roles }, // Token inclut le tableau des rôles
      JWT_SECRET,
      { expiresIn: '30d' }
    );

    res.json({ 
        token, 
        user: { 
            id: user.id, 
            nom: user.nom, 
            prenom: user.prenom, 
            roles: user.roles // Renvoie le tableau au frontend
        } 
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Erreur de connexion" });
  }
};

// ============================================================
// 3. RÉCUPÉRER LE PERSONNEL (GetStaff)
// ============================================================
export const getStaff = async (req: Request, res: Response) => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        nom: true,
        prenom: true,
        roles: true, // Pluriel
        color: true 
      },
      orderBy: { prenom: 'asc' }
    });
    res.json(users);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Erreur lors de la récupération du personnel" });
  }
};

// ============================================================
// 4. SUPPRIMER UN UTILISATEUR
// ============================================================
export const deleteUser = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    if (Number(id) === 1) {
        return res.status(403).json({ message: "Impossible de supprimer l'administrateur principal." });
    }

    await prisma.userSchedule.deleteMany({ where: { user_id: Number(id) }});
    await prisma.user.delete({ where: { id: Number(id) } });

    res.json({ message: "Utilisateur supprimé avec succès" });
  } catch (error) {
    res.status(500).json({ message: "Impossible de supprimer (données liées)." });
  }
};

// ============================================================
// 5. METTRE À JOUR UN UTILISATEUR
// ============================================================
export const updateUser = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { nom, prenom, email, password, roles, color } = req.body;

    const existingUser = await prisma.user.findUnique({ where: { id: Number(id) } });
    if (!existingUser) {
      return res.status(404).json({ message: "Utilisateur introuvable." });
    }

    let updateData: any = {
      nom,
      prenom,
      email,
      roles, // Met à jour le tableau des rôles
      color
    };

    if (password && password.trim() !== "") {
      const hashedPassword = await bcrypt.hash(password, 10);
      updateData.password_hash = hashedPassword;
    }

    const updatedUser = await prisma.user.update({
      where: { id: Number(id) },
      data: updateData
    });

    res.json({ message: "Mise à jour réussie", user: updatedUser });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Erreur lors de la mise à jour." });
  }
};