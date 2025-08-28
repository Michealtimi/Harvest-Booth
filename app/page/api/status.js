// pages/api/status.js
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

export default async function handler(req, res) {
  const { jobId } = req.query;
  if (!jobId) return res.status(400).json({ error: "jobId required" });

  const job = await prisma.job.findUnique({ where: { id: jobId } });
  if (!job) return res.status(404).json({ error: "not found" });

  return res.status(200).json({
    id: job.id,
    status: job.status,
    inputUrl: job.inputUrl,
    outputUrl: job.outputUrl,
    prompt: job.prompt,
    createdAt: job.createdAt,
  });
}
