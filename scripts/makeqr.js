// scripts/makeqr.js
// Generates a QR code that links to your app.

const QRCode = require("qrcode");

// 1. Use the URL from arguments, or default to your Vercel deployment
const url = process.argv[2] || "https://ile-adura-harvest-booth.vercel.app/";

// 2. Print QR code in the terminal (ASCII style)
QRCode.toString(url, { type: "terminal" }, (err, qr) => {
  if (err) throw err;
  console.log("📱 Scan this QR code with your phone:\n");
  console.log(qr);
});

// 3. Save a PNG version inside /public (so Next.js can serve it)
QRCode.toFile("public/qr.png", url, (err) => {
  if (err) throw err;
  console.log(`✅ QR code saved at public/qr.png for: ${url}`);
  console.log(`👉 You can open it at: ${url}qr.png`);
});
