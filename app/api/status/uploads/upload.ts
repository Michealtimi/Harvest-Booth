import type { NextApiRequest, NextApiResponse } from "next";
import prisma from "@/app/lib/prisma";
import cloudinary from "@/app/lib/cloudinary";
import replicate from "@/app/lib/replicate";

// Simple in-memory rate limiter (per IP)
const rateLimitMap = new Map<string, { count: number; ts: number }>();

const MAX_REQUESTS = 5; // max uploads
const WINDOW_MS = 60 * 1000; // per 1 minute

type ApiResponse =
  | { success: true; jobId: string; outputUrl?: string }
  | { success: false; error: string; step: string };

function isValidBase64Image(str: string) {
  return /^data:image\/(png|jpg|jpeg);base64,/.test(str);
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse>
) {
  if (req.method !== "POST") {
    return res.status(405).json({
      success: false,
      error: "Method not allowed",
      step: "method",
    });
  }

  try {
    const ip =
      req.headers["x-forwarded-for"]?.toString() ||
      req.socket.remoteAddress ||
      "unknown";
    const now = Date.now();
    const entry = rateLimitMap.get(ip);

    if (!entry || now - entry.ts > WINDOW_MS) {
      rateLimitMap.set(ip, { count: 1, ts: now });
    } else {
      if (entry.count >= MAX_REQUESTS) {
        return res.status(429).json({
          success: false,
          error: "Too many uploads, please slow down",
          step: "rate-limit",
        });
      }
      entry.count++;
    }

    const { imageBase64, eventId } = req.body;

    if (!imageBase64 || !eventId) {
      return res.status(400).json({
        success: false,
        error: "Missing imageBase64 or eventId",
        step: "validation",
      });
    }

    // --- Step 1. Validate image format ---
    if (!isValidBase64Image(imageBase64)) {
      return res.status(400).json({
        success: false,
        error: "Only JPG or PNG base64 images are allowed",
        step: "validation-format",
      });
    }

    // Approximate base64 size check
    const base64SizeKB = Math.ceil((imageBase64.length * 3) / 4 / 1024);
    if (base64SizeKB > 5000) {
      return res.status(400).json({
        success: false,
        error: "Image too large (max 5MB)",
        step: "validation-size",
      });
    }

    // --- Step 2. Upload to Cloudinary ---
    let uploadRes;
    try {
      uploadRes = await cloudinary.uploader.upload(imageBase64, {
        folder: `harvest/${eventId}/uploads`,
      });
    } catch (err: any) {
      console.error("Cloudinary upload error:", err);
      return res.status(500).json({
        success: false,
        error: "Failed to upload image to Cloudinary",
        step: "cloudinary-upload",
      });
    }

    // --- Step 3. Create DB job ---
    let job;
    try {
      job = await prisma.job.create({
        data: {
          eventId,
          inputUrl: uploadRes.secure_url,
          status: "processing",
        },
      });
    } catch (err: any) {
      console.error("Prisma job creation error:", err);
      return res.status(500).json({
        success: false,
        error: "Failed to create job in database",
        step: "db-create-job",
      });
    }

    // --- Step 4. Generate cartoon with Replicate ---
    const prompt = `Disney-style 3D cartoon of a happy child celebrating harvest inside a decorated church, with palm leaves, fruits, glowing lanterns, and a festive banner saying 'Happy Harvest to the Children of Ile Adura Mose'. Bright, joyful colors.`;

    let genUrl;
    try {
      const output = await replicate.run(
        "flux-kontext-apps/cartoonify:latest",
        {
          input: {
            image: uploadRes.secure_url,
            prompt,
          },
        }
      );

      genUrl = Array.isArray(output) ? output[0] : output;
      if (!genUrl) throw new Error("No output URL from Replicate");
    } catch (err: any) {
      console.error("Replicate generation error:", err);
      await prisma.job.update({
        where: { id: job.id },
        data: { status: "failed" },
      });
      return res.status(500).json({
        success: false,
        error: "Failed to generate cartoon image",
        step: "replicate-generate",
      });
    }

    // --- Step 5. Upload generated to Cloudinary ---
    let outUpload;
    try {
      outUpload = await cloudinary.uploader.upload(genUrl, {
        folder: `harvest/${eventId}/generated`,
      });
    } catch (err: any) {
      console.error("Cloudinary generated upload error:", err);
      await prisma.job.update({
        where: { id: job.id },
        data: { status: "failed" },
      });
      return res.status(500).json({
        success: false,
        error: "Failed to upload generated image to Cloudinary",
        step: "cloudinary-upload-generated",
      });
    }

    // --- Step 6. Update DB ---
    try {
      await prisma.job.update({
        where: { id: job.id },
        data: {
          outputUrl: outUpload.secure_url,
          status: "done",
          prompt,
        },
      });
    } catch (err: any) {
      console.error("Prisma job update error:", err);
      return res.status(500).json({
        success: false,
        error: "Failed to update job in database",
        step: "db-update-job",
      });
    }

    return res.status(200).json({
      success: true,
      jobId: job.id,
      outputUrl: outUpload.secure_url,
    });
  } catch (err: any) {
    console.error("Unexpected error:", err);
    return res.status(500).json({
      success: false,
      error: "Unexpected server error",
      step: "catch-all",
    });
  }
}
