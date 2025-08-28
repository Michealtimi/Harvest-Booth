import { PrismaClient } from "@prisma/client";

declare global {
  // Trick: avoid multiple instances during hot-reload in dev
  // (Next.js reloads modules a lot)
  // We attach prisma to `globalThis`
  var prisma: PrismaClient | undefined;
}

const prisma =
  global.prisma ||
  new PrismaClient({
    log: ["query", "error", "warn"], // optional: logs in dev
  });

if (process.env.NODE_ENV !== "production") {
  global.prisma = prisma;
}

export default prisma;
