/*
  Warnings:

  - You are about to drop the `ramadan_config` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropTable
DROP TABLE "ramadan_config";

-- CreateTable
CREATE TABLE "ramadan_configs" (
    "id" SERIAL NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "schedules" JSONB NOT NULL DEFAULT '[]',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ramadan_configs_pkey" PRIMARY KEY ("id")
);
