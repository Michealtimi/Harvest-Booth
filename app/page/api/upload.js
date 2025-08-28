// pages/api/upload.js
import Replicate from "replicate";
import { PrismaClient } from "@prisma/client";
import cloudinary from "cloudinary";

const prisma = new PrismaClient();

cloudinary.v2.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN,
});

export const config = {
  api: {
    bodyParser: {
      sizeLimit: "20mb",
    },
  },
};

function buildPrompt({ childName, eventBanner }) {
  const name = childName ? `${childName}, ` : "";
  return `${name}High-quality, family-friendly 3D cartoon portrait in a cheerful harvest festival theme. Transform the provided photo into a stylized animated character (rounded soft facial features, expressive eyes, warm smile), placed inside a decorated church harvest scene with palm leaves, glowing lanterns, baskets of fruits, and a banner that reads: "${eventBanner}". Bright, joyful colors, soft rim lighting, head-and-shoulders composition. Do NOT include logos or trademarked characters.`;
}

export default async function handler(req, res) {
  if (req.method !== "POST")
    return res.status(405).json({ error: "Method not allowed" });

  try {
    const { imageBase64, eventId = "default", childName } = req.body;
    if (!imageBase64)
      return res.status(400).json({ error: "imageBase64 required" });

    // 1) upload original to Cloudinary
    const uploadResult = await cloudinary.v2.uploader.upload(
      `data:image/jpeg;base64,${imageBase64}`,
      { folder: `harvest/${eventId}/originals` }
    );

    // 2) create DB job
    const job = await prisma.job.create({
      data: {
        eventId,
        inputUrl: uploadResult.secure_url,
        status: "processing",
      },
    });

    // 3) build prompt
    const eventBanner = "Happy Harvest to the Children of Ile Adura Mose";
    const prompt = buildPrompt({ childName, eventBanner });

    // 4) call Replicate model
    const model = process.env.REPLICATE_MODEL || "flux-kontext-apps/cartoonify";
    let output;
    try {
      const result = await replicate.run(model, {
        input: {
          image: uploadResult.secure_url,
          prompt,
        },
      });
      // replicate.run often returns an array or a single URL
      output = Array.isArray(result) ? result[0] : result;
    } catch (err) {
      // update job as failed
      await prisma.job.update({
        where: { id: job.id },
        data: { status: "failed", prompt },
      });
      console.error("Replicate error:", err);
      return res
        .status(500)
        .json({ error: "Generation failed", details: String(err) });
    }

    // 5) store generated image in Cloudinary (Cloudinary can ingest remote URL)
    const outUpload = await cloudinary.v2.uploader.upload(output, {
      folder: `harvest/${eventId}/generated`,
    });

    // 6) update job
    await prisma.job.update({
      where: { id: job.id },
      data: {
        outputUrl: outUpload.secure_url,
        status: "done",
        prompt,
      },
    });

    // 7) respond with job id and output url
    return res
      .status(200)
      .json({ jobId: job.id, outputUrl: outUpload.secure_url });
  } catch (err) {
    console.error(err);
    return res
      .status(500)
      .json({ error: "Server error", details: String(err) });
  }
}
