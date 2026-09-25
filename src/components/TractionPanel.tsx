"use client";

import {useState} from "react";
import {trackTraction} from "@/lib/traction-client";

export default function TractionPanel() {
  const [rating, setRating] = useState("5");
  const [role, setRole] = useState("prediction-market user");
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState("");
  const [sending, setSending] = useState(false);
  const [copied, setCopied] = useState(false);

  async function submitFeedback() {
    const text = message.trim();
    if (!text) {
      setStatus("Add one short comment first.");
      return;
    }

    setSending(true);
    setStatus("");

    try {
      const ok = await trackTraction("feedback_submitted", {
        rating: Number(rating),
        role,
        message: text,
      });
      if (!ok) throw new Error("Unable to record feedback");
      setMessage("");
      setStatus("Thanks — feedback recorded.");
    } catch {
      setStatus("Could not record feedback. Please try again.");
    } finally {
      setSending(false);
    }
  }

  async function copyDemo() {
    await navigator.clipboard.writeText(window.location.origin + "/?utm_source=shared_beta");
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  }

  return (
    <section className="tractionPanel">
      <div>
        <div className="eyebrow">Early tester feedback</div>
        <h2>Help us validate SignalDesk.</h2>
        <p className="sub">
          Try one research flow, then leave a quick rating. Please do not include
          personal or sensitive information.
        </p>
      </div>

      <div className="tractionGrid">
        <label>
          <span>Your role</span>
          <select className="select" value={role} onChange={(e) => setRole(e.target.value)}>
            <option value="prediction-market user">Prediction-market user</option>
            <option value="crypto user">Crypto user</option>
            <option value="researcher">Researcher</option>
            <option value="builder">Builder</option>
            <option value="other">Other</option>
          </select>
        </label>

        <label>
          <span>Rating</span>
          <select className="select" value={rating} onChange={(e) => setRating(e.target.value)}>
            <option value="5">5 — very useful</option>
            <option value="4">4 — useful</option>
            <option value="3">3 — promising</option>
            <option value="2">2 — needs work</option>
            <option value="1">1 — not useful yet</option>
          </select>
        </label>
      </div>

      <textarea
        className="input feedbackInput"
        value={message}
        onChange={(e) => setMessage(e.target.value.slice(0, 500))}
        placeholder="What was useful, confusing, or missing?"
        rows={4}
      />

      <div className="controls">
        <button className="btn primary" onClick={submitFeedback} disabled={sending}>
          {sending ? "Recording…" : "Send feedback"}
        </button>
        <button className="btn" onClick={copyDemo}>
          {copied ? "Link copied" : "Copy demo link"}
        </button>
        {status && <span className="small">{status}</span>}
      </div>
    </section>
  );
}
