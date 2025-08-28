-- CreateTable
CREATE TABLE "public"."Job" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "inputUrl" TEXT,
    "outputUrl" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "prompt" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Job_pkey" PRIMARY KEY ("id")
);
