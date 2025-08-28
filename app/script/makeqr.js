// scripts/make-qr.js
import QRCode from "qrcode";
import dotenv from "dotenv";
dotenv.config();

const url = `${process.env.NEXT_PUBLIC_BASE_URL}/booth/ile-adura-2025`;
QRCode.toFile("qr-ile-adura-2025.png", url, { width: 800 }, function (err) {
  if (err) throw err;
  console.log("QR file saved to qr-ile-adura-2025.png");
});
