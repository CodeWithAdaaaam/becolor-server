-- CreateEnum
CREATE TYPE "Role" AS ENUM ('SUPERADMIN', 'RECEPTIONIST');

-- CreateEnum
CREATE TYPE "AppointmentStatus" AS ENUM ('CONFIRME', 'EN_COURS', 'TERMINE', 'ANNULE', 'NO_SHOW');

-- CreateTable
CREATE TABLE "users" (
    "id" SERIAL NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "role" "Role" NOT NULL,
    "nom" TEXT NOT NULL,
    "prenom" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_login" TIMESTAMP(3),

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "clients" (
    "id" SERIAL NOT NULL,
    "nom" TEXT NOT NULL,
    "prenom" TEXT NOT NULL,
    "tel_principal" TEXT NOT NULL,
    "tel_secondaire" TEXT,
    "email" TEXT,
    "date_naissance" TIMESTAMP(3),
    "photo_url" TEXT,
    "source" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "clients_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "services" (
    "id" SERIAL NOT NULL,
    "nom" TEXT NOT NULL,
    "description" TEXT,
    "duree" INTEGER NOT NULL,
    "prix" DECIMAL(65,30) NOT NULL,
    "couleur" TEXT,
    "actif" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "services_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "appointments" (
    "id" SERIAL NOT NULL,
    "client_id" INTEGER NOT NULL,
    "service_id" INTEGER NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "heure_debut" TIMESTAMP(3) NOT NULL,
    "heure_fin" TIMESTAMP(3) NOT NULL,
    "statut" "AppointmentStatus" NOT NULL DEFAULT 'CONFIRME',
    "prix" DECIMAL(65,30) NOT NULL,
    "notes_internes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "appointments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "coloration_notes" (
    "id" SERIAL NOT NULL,
    "client_id" INTEGER NOT NULL,
    "type_coloration" TEXT,
    "formule" TEXT,
    "num_couleur" TEXT,
    "oxydant_pct" TEXT,
    "temps_pause" TEXT,
    "allergies" TEXT,
    "sensibilite_cuir" TEXT,
    "contre_indications" TEXT,
    "marques_preferees" TEXT,
    "notes_libres" TEXT,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "coloration_notes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "coloration_history" (
    "id" SERIAL NOT NULL,
    "client_id" INTEGER NOT NULL,
    "appointment_id" INTEGER NOT NULL,
    "date_coloration" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "couleur_appliquee" TEXT,
    "formule_utilisee" TEXT,
    "photo_avant_url" TEXT,
    "photo_apres_url" TEXT,
    "resultat" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "coloration_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "online_bookings" (
    "id" SERIAL NOT NULL,
    "nom" TEXT NOT NULL,
    "prenom" TEXT NOT NULL,
    "tel" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "service_souhaite" TEXT NOT NULL,
    "date_souhaitee" TIMESTAMP(3) NOT NULL,
    "heure_souhaitee" TEXT NOT NULL,
    "commentaires" TEXT,
    "statut" TEXT NOT NULL DEFAULT 'NOUVELLE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processed_at" TIMESTAMP(3),

    CONSTRAINT "online_bookings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- AddForeignKey
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_service_id_fkey" FOREIGN KEY ("service_id") REFERENCES "services"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "coloration_notes" ADD CONSTRAINT "coloration_notes_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "coloration_history" ADD CONSTRAINT "coloration_history_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "coloration_history" ADD CONSTRAINT "coloration_history_appointment_id_fkey" FOREIGN KEY ("appointment_id") REFERENCES "appointments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
