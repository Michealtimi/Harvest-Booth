// app/layout.tsx
import "./globals.css";
import { ReactNode } from "react";

export const metadata = {
  title: "Harvest AI Booth",
  description: "AI-powered Disney-style harvest photo booth for kids",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-gradient-to-br from-green-50 to-yellow-50 text-gray-900 min-h-screen">
        <header className="p-4 shadow bg-white">
          <h1 className="text-2xl font-bold text-center text-green-700">
            🎉 Happy Harvest Booth 🎉
          </h1>
        </header>
        <main className="p-6">{children}</main>
        <footer className="p-4 text-center text-sm text-gray-500">
          © {new Date().getFullYear()} Ile Adura Mose
        </footer>
      </body>
    </html>
  );
}
