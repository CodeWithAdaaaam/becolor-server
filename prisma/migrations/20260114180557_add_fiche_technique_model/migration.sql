-- CreateEnum
CREATE TYPE "StatutClient" AS ENUM ('PREMIERE_VISITE', 'FIDELE', 'OCCASIONNELLE');

-- CreateEnum
CREATE TYPE "TypeCheveux" AS ENUM ('RAIDES', 'ONDULES', 'BOUCLES', 'CREPUS');

-- CreateEnum
CREATE TYPE "EpaisseurCheveux" AS ENUM ('FINS', 'MOYENS', 'EPAIS');

-- CreateEnum
CREATE TYPE "DensiteCheveux" AS ENUM ('FAIBLE', 'MOYENNE', 'FORTE');

-- CreateEnum
CREATE TYPE "CuirChevelu" AS ENUM ('NORMAL', 'SEC', 'GRAS', 'PELLICULES', 'SENSIBLE');

-- CreateEnum
CREATE TYPE "LongueurCheveux" AS ENUM ('COURT', 'MI_LONG', 'LONG');

-- CreateEnum
CREATE TYPE "PorositeCheveux" AS ENUM ('FAIBLE', 'MOYENNE', 'FORTE');

-- CreateEnum
CREATE TYPE "ElasticiteCheveux" AS ENUM ('BONNE', 'MOYENNE', 'FAIBLE');

-- CreateEnum
CREATE TYPE "TestMecheResultat" AS ENUM ('RESISTANT', 'FRAGILE', 'REACTION_ANORMALE');

-- CreateTable
CREATE TABLE "fiches_techniques" (
    "id" SERIAL NOT NULL,
    "client_id" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "statut_client" "StatutClient",
    "type_cheveux" "TypeCheveux",
    "epaisseur" "EpaisseurCheveux",
    "densite" "DensiteCheveux",
    "cuir_chevelu" "CuirChevelu",
    "longueur" "LongueurCheveux",
    "longueur_racines_cm" TEXT,
    "porosite" "PorositeCheveux",
    "elasticite" "ElasticiteCheveux",
    "historique_chimique" TEXT,
    "problemes_constates" TEXT,
    "style_souhaite" TEXT,
    "couleur_desiree" TEXT,
    "couleur_appliquee" TEXT,
    "evenement_particulier" TEXT,
    "test_meche" BOOLEAN,
    "resultat_test" "TestMecheResultat",
    "produits_recommandes" TEXT,
    "temps_pose_estime" TEXT,
    "precautions" TEXT,
    "service_prevu" TEXT,
    "duree_estimee_h" TEXT,
    "produits_utilises" TEXT,
    "resultat_obtenu" TEXT,
    "conseils_post_service" TEXT,
    "prochain_rdv_conseille" TEXT,
    "remarques" TEXT,

    CONSTRAINT "fiches_techniques_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "fiches_techniques_client_id_key" ON "fiches_techniques"("client_id");

-- AddForeignKey
ALTER TABLE "fiches_techniques" ADD CONSTRAINT "fiches_techniques_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;
