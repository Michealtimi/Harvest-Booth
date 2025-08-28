import type { NextApiRequest, NextApiResponse } from "next";
import prisma from "@/app/lib/prisma";

// In-memory rate limiter for polling
const pollMap = new Map<string, { count: number; ts: number }>();
const MAX_POLLS = 10; // max polls per minute
const POLL_WINDOW_MS = 60 * 1000;

type ApiResponse =
  | {
      success: true;
      jobId: string;
      status: string;
      inputUrl?: string;
      outputUrl?: string;
      prompt?: string;
    }
  | {
      success: false;
      error: string;
      step: string;
    };

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse>
) {
  if (req.method !== "GET") {
    return res.status(405).json({
      success: false,
      error: "Method not allowed",
      step: "method",
    });
  }

  try {
    // --- Step 1. Rate limit ---
    const ip =
      req.headers["x-forwarded-for"]?.toString() ||
      req.socket.remoteAddress ||
      "unknown";

    const now = Date.now();
    const entry = pollMap.get(ip);

    if (!entry || now - entry.ts > POLL_WINDOW_MS) {
      pollMap.set(ip, { count: 1, ts: now });
    } else {
      if (entry.count >= MAX_POLLS) {
        return res.status(429).json({
          success: false,
          error: "Too many status checks, slow down",
          step: "rate-limit",
        });
      }
      entry.count++;
    }

    // --- Step 2. Validate input ---
    const { jobId } = req.query;
    if (!jobId || typeof jobId !== "string") {
      return res.status(400).json({
        success: false,
        error: "Missing or invalid jobId",
        step: "validation",
      });
    }

    // --- Step 3. Fetch job from DB ---
    let job;
    try {
      job = await prisma.job.findUnique({
        where: { id: jobId },
      });
    } catch (err: any) {
      console.error("DB error fetching job:", err);
      return res.status(500).json({
        success: false,
        error: "Database query failed",
        step: "db-fetch",
      });
    }

    if (!job) {
      return res.status(404).json({
        success: false,
        error: "Job not found",
        step: "not-found",
      });
    }

    // --- Step 4. Return job info ---
    return res.status(200).json({
      success: true,
      jobId: job.id,
      status: job.status,
      inputUrl: job.inputUrl ?? undefined, // ✅ safe null handling
      outputUrl: job.outputUrl ?? undefined, // ✅ safe null handling
      prompt: job.prompt ?? undefined, // ✅ safe null handling
    });
  } catch (err: any) {
    console.error("Unexpected error in /api/status:", err);
    return res.status(500).json({
      success: false,
      error: "Unexpected server error",
      step: "catch-all",
    });
  }
}
