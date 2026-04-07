// server/controllers/clientController.ts
import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// 1. LISTER LES CLIENTES (Recherche + Compteur de RDV)
export const getClients = async (req: Request, res: Response) => {
  try {
    const { search } = req.query;

    const whereClause = search ? {
      OR: [
        { nom: { contains: String(search), mode: 'insensitive' as const } },
        { prenom: { contains: String(search), mode: 'insensitive' as const } },
        { tel_principal: { contains: String(search) } }
      ]
    } : {};

    const clients = await prisma.client.findMany({
      where: whereClause,
      orderBy: { updated_at: 'desc' }, // Les plus récemment modifiées en premier
      include: {
        _count: { select: { appointments: true } } // On récupère le nombre de RDV
      }
    });
    
    res.json(clients);
  } catch (error) {
    console.error("Erreur getClients:", error); 
    res.status(500).json({ message: "Erreur récupération clients" });
  }
};

// 2. RÉCUPÉRER UNE FICHE CLIENTE COMPLÈTE
export const getClientById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const client = await prisma.client.findUnique({
      where: { id: Number(id) },
      include: { 
        // RDV
        appointments: {
          include: { services: true, user: true }, 
          orderBy: { date: 'desc' }   
        },
        // Note Générale (Allergies actuelles)
        coloration_notes: true,
        // NOUVEAU : Historique Technique complet
        coloration_history: {
            orderBy: { date_coloration: 'desc' }
        }
      }
    });

    if (!client) return res.status(404).json({ message: 'Cliente non trouvée' });
    res.json(client);
  } catch (error) {
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

// 2. AJOUTE CETTE FONCTION : Sauvegarder l'historique d'un RDV
export const saveAppointmentHistory = async (req: Request, res: Response) => {
  try {
    const { clientId, appointmentId } = req.params;
    const { formule, resultat, technique } = req.body;

    // On crée ou met à jour l'historique pour CE rendez-vous
    // (Note : on utilise findFirst car appointment_id n'est pas @unique dans ton schema initial, 
    // mais logiquement il devrait l'être. On gère ça proprement).
    
    const existing = await prisma.colorationHistory.findFirst({
        where: { appointment_id: Number(appointmentId) }
    });

    if (existing) {
        const updated = await prisma.colorationHistory.update({
            where: { id: existing.id },
            data: { formule_utilisee: formule, resultat, couleur_appliquee: technique }
        });
        return res.json(updated);
    } else {
        const created = await prisma.colorationHistory.create({
            data: {
                client_id: Number(clientId),
                appointment_id: Number(appointmentId),
                date_coloration: new Date(), // Ou la date du RDV si tu préfères
                formule_utilisee: formule,
                resultat: resultat,
                couleur_appliquee: technique
            }
        });
        return res.json(created);
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Erreur sauvegarde historique" });
  }
};

// 3. CRÉER UN CLIENT


// 4. METTRE À JOUR LES INFOS GÉNÉRALES (Nom, Tel...)
export const updateClient = async (req: Request, res: Response) => {
  const { id } = req.params;
  
  // 1. BIEN RÉCUPÉRER 'notes_techniques' depuis le corps de la requête
  const { nom, prenom, tel_principal, email, notes_techniques } = req.body;

  try {
    const updatedClient = await prisma.client.update({
      where: { id: Number(id) },
      data: {
        nom,
        prenom,
        tel_principal,
        email,
        // 2. BIEN L'AJOUTER ICI POUR PRISMA
        notes_techniques: notes_techniques 
      }
    });

    res.json(updatedClient);
  } catch (error) {
    console.error("Erreur mise à jour client:", error);
    res.status(500).json({ message: "Erreur lors de la sauvegarde" });
  }
};

// FAITES LA MÊME CHOSE POUR LA FONCTION createClient
export const createClient = async (req: Request, res: Response) => {
  const { nom, prenom, tel_principal, email, notes_techniques } = req.body;
  try {
    const newClient = await prisma.client.create({
      data: {
        nom,
        prenom,
        tel_principal,
        email,
        notes_techniques // <--- IMPORTANT
      }
    });
    res.status(201).json(newClient);
  } catch (error) {
    res.status(500).json({ message: "Erreur création" });
  }
};

// 5. METTRE À JOUR LA FICHE TECHNIQUE (Le Cerveau du Coiffeur)
export const updateClientNotes = async (req: Request, res: Response) => {
  try {
    const { id } = req.params; // ID de la cliente
    const notesData = req.body;

    // "Upsert" veut dire : Met à jour si ça existe, sinon Crée-le.
    const updatedNotes = await prisma.colorationNote.upsert({
      where: { client_id: Number(id) },
      update: notesData,
      create: {
        client_id: Number(id),
        ...notesData,
      },
    });
    
    res.json(updatedNotes);
  } catch (error) {
    console.error("Erreur notes techniques:", error);
    res.status(500).json({ message: "Erreur sauvegarde notes techniques" });
  }
};

export const getClientNotes = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const notes = await prisma.colorationNote.findUnique({
      where: { client_id: Number(id) }
    });
    // Si pas de notes, on renvoie un objet vide pour ne pas faire planter le frontend
    res.json(notes || {}); 
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Erreur récupération notes" });
  }
};

// 6. SUPPRIMER UN CLIENT
export const deleteClient = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await prisma.client.delete({ where: { id: Number(id) } });
    res.json({ message: "Client supprimé" });
  } catch (error) {
    res.status(500).json({ message: "Impossible de supprimer (a des RDV en cours)" });
  }
};