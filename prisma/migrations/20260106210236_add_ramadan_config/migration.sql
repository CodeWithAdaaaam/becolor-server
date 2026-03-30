-- CreateTable
CREATE TABLE "ramadan_config" (
    "id" SERIAL NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "schedules" JSONB,

    CONSTRAINT "ramadan_config_pkey" PRIMARY KEY ("id")
);
