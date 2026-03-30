-- CreateTable
CREATE TABLE "opening_hours" (
    "id" SERIAL NOT NULL,
    "day" INTEGER NOT NULL,
    "open" TEXT NOT NULL DEFAULT '09:00',
    "close" TEXT NOT NULL DEFAULT '19:00',
    "isOpen" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "opening_hours_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "opening_hours_day_key" ON "opening_hours"("day");
