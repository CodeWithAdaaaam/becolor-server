const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs'); // Ou 'bcrypt' selon ce que tu as installé

const prisma = new PrismaClient();

// --- LISTE COMPLÈTE DES SERVICES ---
const services = [
    // --- COIFFAGE ---
    {
        nom: "Brushing cheveux courts",
        category: "Coiffage",
        prix: 50,
        duree: 30,
        description: "Femme. Shampooing + soin protecteur avant styling."
    },
    {
        nom: "Brushing cheveux mi-longs",
        category: "Coiffage",
        prix: 60,
        duree: 30,
        description: "Femme. Shampooing + soin protecteur avant styling."
    },
    {
        nom: "Brushing cheveux longs",
        category: "Coiffage",
        prix: 80,
        duree: 30,
        description: "Femme. Shampooing + soin protecteur avant styling."
    },
    {
        nom: "Brushing Wavy",
        category: "Coiffage",
        prix: 120,
        duree: 60,
        description: "Femme. Shampooing + soin protecteur avant styling + Serum + fixation."
    },
    // --- COUPE ---
    {
        nom: "Coupe simple",
        category: "Coupe",
        prix: 200,
        duree: 60,
        description: "Femme. Coupe d'entretien ou égalisation."
    },
    {
        nom: "Coupe transformation",
        category: "Coupe",
        prix: 250,
        duree: 60,
        description: "Femme. Changement de style / Look."
    },
    {
        nom: "Coupe des pointes",
        category: "Coupe",
        prix: 80,
        duree: 30,
        description: "Femme. Entretien des pointes uniquement."
    },
    // --- MAINS ET PIEDS (Onglerie) ---
    {
        nom: "Manucure Simple",
        category: "MainsPieds",
        prix: 60,
        duree: 45,
        description: "Femme. Soin des mains classique."
    },
    {
        nom: "Manucure Simple avec French",
        category: "MainsPieds",
        prix: 80,
        duree: 60,
        description: "Femme."
    },
    {
        nom: "Manucure SPA",
        category: "MainsPieds",
        prix: 100,
        duree: 60,
        description: "Femme. Avec gommage + masque."
    },
    {
        nom: "Pédicure Simple",
        category: "MainsPieds",
        prix: 100,
        duree: 60,
        description: "Femme."
    },
    {
        nom: "Pédicure SPA",
        category: "MainsPieds",
        prix: 150,
        duree: 60,
        description: "Mixte. Soin complet des pieds."
    },
    {
        nom: "Pose vernis avec limage",
        category: "MainsPieds",
        prix: 40,
        duree: 45,
        description: "Femme."
    },
    {
        nom: "Pose vernis semi-permanent",
        category: "MainsPieds",
        prix: 100,
        duree: 60,
        description: "Femme. Tenue longue durée."
    },
    {
        nom: "Pose vernis simple",
        category: "MainsPieds",
        prix: 30,
        duree: 30,
        description: "Femme."
    },
    {
        nom: "Pose French",
        category: "MainsPieds",
        prix: 50,
        duree: 30,
        description: "Femme."
    },
    {
        nom: "Pose de faux ongles",
        category: "MainsPieds",
        prix: 100,
        duree: 60,
        description: "Femme."
    },
    // --- ÉPILATION ---
    {
        nom: "Épilation demi-jambes",
        category: "Epilation",
        prix: 60,
        duree: 30,
        description: "Femme."
    },
    {
        nom: "Épilation jambes complètes",
        category: "Epilation",
        prix: 100,
        duree: 45,
        description: "Femme."
    },
    {
        nom: "Épilation des bras",
        category: "Epilation",
        prix: 60,
        duree: 30,
        description: "Femme."
    },
    {
        nom: "Épilation du duvet",
        category: "Epilation",
        prix: 20,
        duree: 15,
        description: "Femme."
    },
    {
        nom: "Épilation des aisselles",
        category: "Epilation",
        prix: 40,
        duree: 15,
        description: "Femme."
    },
    {
        nom: "Épilation du visage",
        category: "Epilation",
        prix: 70,
        duree: 30,
        description: "Femme."
    },
    {
        nom: "Épilation des sourcils",
        category: "Epilation",
        prix: 30,
        duree: 15,
        description: "Femme."
    },
    // --- MAKE-UP ---
    {
        nom: "Make-Up du jour",
        category: "Maquillage",
        prix: 150,
        duree: 60,
        description: "Femme. Mise en beauté naturelle."
    },
    {
        nom: "Make-Up soirées",
        category: "Maquillage",
        prix: 250,
        duree: 60,
        description: "Femme. Maquillage sophistiqué."
    },
    // --- COLORATION ---
    {
        nom: "Coloration Complète",
        category: "Coloration",
        prix: 300,
        duree: 120,
        description: "Femme. L'Oreal / Schwarzkopf / Wella + Soin hydratant."
    },
    {
        nom: "Coloration Racines",
        category: "Coloration",
        prix: 200,
        duree: 60,
        description: "Femme. L'Oreal / Schwarzkopf / Wella + Soin hydratant."
    },
    {
        nom: "Coloration Sans Ammoniaque",
        category: "Coloration",
        prix: 400,
        duree: 120,
        description: "Femme. Inoa / Biokera + Soin hydratant."
    },
    {
        nom: "Coloration Racines Sans Ammoniaque",
        category: "Coloration",
        prix: 300,
        duree: 60,
        description: "Femme. Inoa / Biokera + Soin hydratant."
    },
    {
        nom: "Coloration Végane",
        category: "Coloration",
        prix: 450,
        duree: 90,
        description: "Femme. Biokera + Soin hydratant."
    },
    // --- BALAYAGE ---
    {
        nom: "Balayage / Ombré",
        category: "Balayages",
        prix: 1200,
        duree: 240,
        description: "Femme. Inclus Plex + Patinage. Prix à partir de."
    },
    {
        nom: "Air Touch Balayage",
        category: "Balayages",
        prix: 1500,
        duree: 240,
        description: "Femme. Technique Air Touch + Plex + Patinage. Prix à partir de."
    },
    // --- SOINS CHEVEUX ---
    {
        nom: "Soin hydratant au Bac",
        category: "SoinCheveux",
        prix: 60,
        duree: 20,
        description: "Femme. Shampooing hydratant + masque hydratant."
    },
    {
        nom: "Soin hydratant Premium",
        category: "SoinCheveux",
        prix: 100,
        duree: 45,
        description: "Femme. Shampooing clarifiant + masque (sous Climazon 15')."
    },
    {
        nom: "Soin Détoxinant",
        category: "SoinCheveux",
        prix: 400,
        duree: 90,
        description: "Femme."
    },
    // --- SOINS VISAGE ---
    {
        nom: "Soin Peaux Sèches",
        category: "SoinVisage",
        prix: 350,
        duree: 60,
        description: "Femme. Soin esthétique."
    },
    {
        nom: "Soin Purifiant",
        category: "SoinVisage",
        prix: 350,
        duree: 60,
        description: "Femme. Soin esthétique."
    }
];

async function main() {
    console.log('🚀 Démarrage du seed unifié (JS)...');

    // --------------------------------------------------------
    // 1. GESTION DE L'ADMINISTRATEUR
    // --------------------------------------------------------
    const adminEmail = 'admin@becolor.ma';
    const passwordHash = await bcrypt.hash('admin123', 10);

    await prisma.user.upsert({
        where: { email: adminEmail },
        update: {}, 
        create: {
            email: adminEmail,
            password_hash: passwordHash,
            // MODIFICATION ICI : role -> roles (en tableau)
            roles: ['SUPERADMIN'], 
            nom: 'Admin',
            prenom: 'System',
            color: '#000000'
        },
    });
    console.log('👤 Administrateur vérifié.');

    // --------------------------------------------------------
    // 2. GESTION DES HORAIRES (NOUVEAU)
    // --------------------------------------------------------
    console.log('🕒 Initialisation des horaires...');
    for (let i = 0; i < 7; i++) {
        await prisma.openingHour.upsert({
            where: { day: i },
            update: {}, // On ne modifie pas si existe déjà (pour garder tes réglages)
            create: {
                day: i,
                open: "09:00",
                close: "19:00",
                isOpen: i !== 0 // Fermé le dimanche (0) par défaut
            }
        });
    }
    console.log('✅ Horaires initialisés !');

    // --------------------------------------------------------
    // 3. GESTION DES SERVICES (Anti-doublon)
    // --------------------------------------------------------
    console.log(`🛠 Vérification des services...`);

    for (const s of services) {
        const existing = await prisma.service.findFirst({
            where: { nom: s.nom }
        });

        if (!existing) {
            await prisma.service.create({
                data: {
                    nom: s.nom,
                    category: s.category,
                    prix: s.prix,
                    duree: s.duree,
                    description: s.description,
                    actif: true,
                    couleur: '#000000'
                }
            });
            console.log(`✅ Ajouté : ${s.nom}`);
        } else {
            console.log(`⏩ Ignoré : ${s.nom}`);
        }
    }

    console.log('🎉 Seed terminé avec succès !');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });