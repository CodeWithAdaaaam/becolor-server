/*
  Warnings:

  - You are about to drop the `opening_hours` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `ramadan_configs` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropTable
DROP TABLE "opening_hours";

-- DropTable
DROP TABLE "ramadan_configs";

-- CreateTable
CREATE TABLE "OpeningHour" (
    "id" SERIAL NOT NULL,
    "day" INTEGER NOT NULL,
    "morningOpen" TEXT NOT NULL DEFAULT '10:00',
    "morningClose" TEXT NOT NULL DEFAULT '13:00',
    "afternoonOpen" TEXT NOT NULL DEFAULT '14:00',
    "afternoonClose" TEXT NOT NULL DEFAULT '20:00',
    "isOpen" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "OpeningHour_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "OpeningHour_day_key" ON "OpeningHour"("day");
