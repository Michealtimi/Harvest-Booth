// app/page.tsx
"use client";

import { useState } from "react";

export default function HomePage() {
  const [file, setFile] = useState<File | null>(null);
  const [jobId, setJobId] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [outputUrl, setOutputUrl] = useState<string | null>(null);

  async function handleUpload() {
    if (!file) return;

    const formData = new FormData();
    formData.append("file", file);

    const res = await fetch("/api/upload", {
      method: "POST",
      body: formData,
    });

    const data = await res.json();
    if (data.success) {
      setJobId(data.jobId);
      pollStatus(data.jobId);
    } else {
      alert(data.error || "Upload failed");
    }
  }

  async function pollStatus(id: string) {
    const interval = setInterval(async () => {
      const res = await fetch(`/api/status?jobId=${id}`);
      const data = await res.json();

      if (data.success) {
        setStatus(data.status);
        if (data.status === "done" && data.outputUrl) {
          setOutputUrl(data.outputUrl);
          clearInterval(interval);
        }
        if (data.status === "failed") {
          clearInterval(interval);
        }
      }
    }, 5000);
  }

  return (
    <div className="max-w-xl mx-auto text-center">
      <h2 className="text-xl font-semibold mb-4">
        Upload your photo to join the Harvest Festival 🎊
      </h2>

      <input
        type="file"
        accept="image/*"
        onChange={(e) => setFile(e.target.files?.[0] || null)}
        className="block w-full border rounded p-2 mb-4"
      />

      <button
        onClick={handleUpload}
        disabled={!file}
        className="bg-green-600 text-white px-4 py-2 rounded-lg disabled:opacity-50">
        Upload & Transform
      </button>

      {status && (
        <p className="mt-4 text-sm text-gray-600">
          Status: <span className="font-bold">{status}</span>
        </p>
      )}

      {outputUrl && (
        <div className="mt-6">
          <h3 className="font-semibold mb-2">Your Cartoon Harvest Photo 🎨</h3>
          <img
            src={outputUrl}
            alt="Cartoonized Harvest"
            className="rounded-xl shadow-lg"
          />
          <a
            href={outputUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="block mt-2 text-green-700 underline">
            Download
          </a>
        </div>
      )}
    </div>
  );
}
