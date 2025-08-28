// scripts/makeqr.js
// Generates a QR code that anyone can scan on their phone.
// For testing, pass in your ngrok or localhost URL.

const QRCode = require("qrcode");

// 1. Take the URL from arguments or default to localhost
const url = process.argv[2] || "http://localhost:3000";

// 2. Print QR in terminal (ASCII style)
QRCode.toString(url, { type: "terminal" }, (err, qr) => {
  if (err) throw err;
  console.log("📱 Scan this QR in your phone camera:\n");
  console.log(qr);
});

// 3. Save a PNG version in /public (so your Next.js app can serve it)
QRCode.toFile("public/qr.png", url, (err) => {
  if (err) throw err;
  console.log(`✅ QR code saved at public/qr.png for: ${url}`);
});
