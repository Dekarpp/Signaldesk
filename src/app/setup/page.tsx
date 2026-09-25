"use client";

import {useState} from "react";

type RegisterResult = {
  userId?: string;
  email?: string;
  name?: string;
  access?: string;
  refresh?: string;
  error?: string;
};

type KeyResult = {
  id?: string;
  prefix?: string;
  env?: string;
  secret?: string;
  createdAt?: string;
  error?: string;
};

export default function SetupPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [access, setAccess] = useState("");
  const [key, setKey] = useState("");
  const [registering, setRegistering] = useState(false);
  const [creatingKey, setCreatingKey] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function register() {
    setRegistering(true);
    setMessage("");
    setError("");
    setKey("");

    try {
      const response = await fetch("/api/panta-register", {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({email, password, name}),
      });
      const data: RegisterResult = await response.json();
      if (!response.ok || !data.access) {
        throw new Error(data.error ?? "Registration failed.");
      }

      setAccess(data.access);
      setPassword("");
      setMessage("Panta developer account created. Now create a test API key.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration failed.");
    } finally {
      setRegistering(false);
    }
  }

  async function createKey() {
    setCreatingKey(true);
    setMessage("");
    setError("");

    try {
      const response = await fetch("/api/panta-create-key", {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({access, name: "signaldesk"}),
      });
      const data: KeyResult = await response.json();
      if (!response.ok || !data.secret) {
        throw new Error(data.error ?? "API key creation failed.");
      }

      setKey(data.secret);
      setMessage("API key created. Copy it now — Panta only shows the full secret once.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "API key creation failed.");
    } finally {
      setCreatingKey(false);
    }
  }

  async function copyKey() {
    if (!key) return;
    await navigator.clipboard.writeText(key);
    setMessage("Copied. Save it somewhere secure, then add it to Vercel as PANTA_API_KEY.");
  }

  return (
    <main className="shell">
      <header className="topbar">
        <a className="brand" href="/">
          <div className="logo">S</div>
          SignalDesk
        </a>
        <div className="badge">Private developer setup</div>
      </header>

      <section className="setupCard">
        <div className="eyebrow">Step 1</div>
        <h1 className="setupTitle">Create Panta developer account</h1>
        <p className="sub">
          This form calls Panta's official public developer API directly. Your password is forwarded to Panta for registration and is not stored by SignalDesk.
        </p>

        <label>Email</label>
        <input
          className="input"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
        />

        <label>Password</label>
        <input
          className="input"
          type="password"
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Minimum 8 characters"
        />

        <label>Name <span className="small">(optional)</span></label>
        <input
          className="input"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Den"
        />

        <div className="controls">
          <button
            className="btn primary"
            onClick={register}
            disabled={registering || !email || password.length < 8}
          >
            {registering ? "Creating account…" : "Create developer account"}
          </button>
        </div>
      </section>

      <section className="setupCard">
        <div className="eyebrow">Step 2</div>
        <h2>Create a Panta test API key</h2>
        <p className="sub">
          After registration succeeds, SignalDesk keeps the returned access token only in this browser page's memory and uses it once to request a <code>pk_test_…</code> key.
        </p>

        <div className="controls">
          <button
            className="btn primary"
            onClick={createKey}
            disabled={creatingKey || !access}
          >
            {creatingKey ? "Creating key…" : "Create test API key"}
          </button>
        </div>

        {key && (
          <div className="secretBox">
            <div className="small">PANTA_API_KEY</div>
            <code>{key}</code>
            <button className="btn" onClick={copyKey}>Copy key</button>
          </div>
        )}
      </section>

      {message && <div className="success">{message}</div>}
      {error && <div className="error">{error}</div>}

      <section className="notice">
        <strong>Security:</strong> do not send the password or API key in chat. After copying the key, store it in your deployment secrets. Refreshing this page clears the access token and displayed key from page memory.
      </section>

      <footer className="footer">
        <b>Powered by Panta</b> · SignalDesk is an independent developer product.
      </footer>
    </main>
  );
}
