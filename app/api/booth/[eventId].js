// pages/booth/[eventId].js
import { useRouter } from "next/router";
import dynamic from "next/dynamic";
import React, { useRef, useState } from "react";
const Webcam = dynamic(() => import("react-webcam"), { ssr: false });

export default function Booth() {
  const router = useRouter();
  const { eventId } = router.query;
  const webcamRef = useRef(null);
  const [consent, setConsent] = useState(false);
  const [status, setStatus] = useState("");
  const [resultUrl, setResultUrl] = useState(null);

  async function captureAndUpload() {
    if (!consent) return alert("Parental consent is required.");
    setStatus("capturing");
    const imgSrc = webcamRef.current.getScreenshot(); // data:image/jpeg;base64,...
    const b64 = imgSrc.replace(/^data:image\/\w+;base64,/, "");

    setStatus("uploading");
    const resp = await fetch("/api/upload", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ imageBase64: b64, eventId, childName: "" }),
    });
    const json = await resp.json();
    if (!resp.ok) {
      setStatus("error");
      return alert(json.error || "Upload failed");
    }

    // If generation returned immediate outputUrl, show it. Otherwise poll.
    const jobId = json.jobId;
    if (json.outputUrl) {
      setResultUrl(json.outputUrl);
      setStatus("done");
      return;
    }

    setStatus("processing");
    const poll = setInterval(async () => {
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
    }, 2000);
  }

  return (
    <div style={{ padding: 16, maxWidth: 600, margin: "0 auto" }}>
      <h1>Harvest Photo Booth</h1>
      <p>Event: {eventId}</p>

      <label style={{ display: "block", marginBottom: 8 }}>
        <input
          type="checkbox"
          checked={consent}
          onChange={(e) => setConsent(e.target.checked)}
        />{" "}
        I am a parent/guardian and consent to taking and sharing this photo.
      </label>

      <div style={{ border: "1px solid #ddd", padding: 8 }}>
        <Webcam
          audio={false}
          ref={webcamRef}
          screenshotFormat="image/jpeg"
          width={360}
        />
      </div>

      <div style={{ marginTop: 12 }}>
        <button onClick={captureAndUpload}>Take Photo & Transform</button>
      </div>

      <div style={{ marginTop: 12 }}>
        <strong>Status:</strong> {status}
      </div>

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
