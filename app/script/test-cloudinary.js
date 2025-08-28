// scripts/test-cloudinary.js
import cloudinary from "cloudinary";
import dotenv from "dotenv";
dotenv.config();

cloudinary.v2.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

async function run() {
  try {
    const res = await cloudinary.v2.uploader.upload(
      "https://picsum.photos/200"
    );
    console.log("Cloudinary upload OK:", res.secure_url);
  } catch (err) {
    console.error("Cloudinary upload failed:", err);
  }
}

run();
