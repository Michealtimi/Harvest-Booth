"use client";

import { useParams } from "next/navigation";
import React, { useRef, useState } from "react";
import Webcam from "react-webcam";

export default function Booth() {
  const params = useParams();
  const eventId = params.eventId; // ✅ from dynamic route /booth/[eventId]

  const webcamRef = useRef(null);

  // ✅ Component state
  const [consent, setConsent] = useState(false);
  const [status, setStatus] = useState("");
  const [resultUrl, setResultUrl] = useState(null);

  async function captureAndUpload() {
    if (!consent) {
      alert("Parental consent is required.");
      return;
    }

    setStatus("capturing");

    // ✅ Guard: wait until webcam is mounted
    if (!webcamRef.current) {
      setStatus("error");
      alert("Webcam not ready.");
      return;
    }

    const imgSrc = (webcamRef.current as any)?.getScreenshot(); // returns data:image/jpeg;base64,...
    if (!imgSrc) {
      setStatus("error");
      alert("Could not capture image.");
      return;
    }

    // ✅ Remove prefix "data:image/jpeg;base64,"
    const b64 = imgSrc.replace(/^data:image\/\w+;base64,/, "");

    setStatus("uploading");

    try {
      const resp = await fetch("/api/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageBase64: b64, eventId, childName: "" }),
      });

      const json = await resp.json();

      if (!resp.ok) {
        setStatus("error");
        alert(json.error || "Upload failed");
        return;
      }

      // ✅ Handle response with or without immediate output
      if (json.outputUrl) {
        setResultUrl(json.outputUrl);
        setStatus("done");
        return;
      }

      const jobId = json.jobId;
      setStatus("processing");

      // ✅ Poll backend until status changes
      const poll = setInterval(async () => {
        try {
          const s = await fetch(`/api/status?jobId=${jobId}`);
          const j = await s.json();
          if (j.status === "done") {
            clearInterval(poll);
            setResultUrl(j.outputUrl);
            setStatus("done");
          } else if (j.status === "failed") {
            clearInterval(poll);
            setStatus("failed");
            alert("Generation failed, please try again.");
          }
        } catch (err) {
          clearInterval(poll);
          setStatus("failed");
          alert("Error checking job status.");
        }
      }, 2000);
    } catch (err) {
      setStatus("error");
      alert("Upload request failed.");
    }
  }

  return (
    <div style={{ padding: 16, maxWidth: 600, margin: "0 auto" }}>
      <h1>Harvest Photo Booth</h1>
      <p>Event: {eventId}</p>

      {/* ✅ Consent checkbox */}
      <label style={{ display: "block", marginBottom: 8 }}>
        <input
          type="checkbox"
          checked={consent}
          onChange={(e) => setConsent(e.target.checked)}
        />{" "}
        I am a parent/guardian and consent to taking and sharing this photo.
      </label>

      {/* ✅ Webcam preview */}
      <div style={{ border: "1px solid #ddd", padding: 8 }}>
        <Webcam
          audio={false} // This prop is not directly available on the Webcam component itself.
          ref={webcamRef}
          screenshotFormat="image/jpeg" // must be "image/jpeg", not just "jpg"
          width={360} // You can adjust width and height as needed
        />
      </div>

      <div style={{ marginTop: 12 }}>
        <button onClick={captureAndUpload}>Take Photo & Transform</button>
      </div>

      {/* ✅ Status output */}
      <div style={{ marginTop: 12 }}>
        <strong>Status:</strong> {status}
      </div>

      {/* ✅ Show result if available */}
      {resultUrl && (
        <div style={{ marginTop: 12 }}>
          <h3>Your cartoon</h3>
          <img src={resultUrl} style={{ maxWidth: "100%", borderRadius: 8 }} />
          <div>
            <a href={resultUrl} download>
              Download
            </a>
            <button onClick={() => navigator.share?.({ url: resultUrl })}>
              Share
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
