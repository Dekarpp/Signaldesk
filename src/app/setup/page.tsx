"use client";

import {useState} from "react";

type AuthResult = {access?: string; error?: string};
type KeyResult = {secret?: string; verified?: boolean; verifyError?: string | null; error?: string};

export default function SetupPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [access, setAccess] = useState("");
  const [key, setKey] = useState("");
  const [verified, setVerified] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function auth(mode: "register" | "login") {
    setBusy(true);
    setMessage("");
    setError("");
    setKey("");
    setVerified(null);

    try {
      const endpoint = mode === "register" ? "/api/panta-register" : "/api/panta-login";
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({email, password, name}),
      });
      const data: AuthResult = await response.json();
      if (!response.ok || !data.access) {
        throw new Error(data.error ?? (mode === "register" ? "Registration failed." : "Login failed."));
      }

      setAccess(data.access);
      setPassword("");
      setMessage(mode === "register"
        ? "Developer account created. Now create a fresh test API key."
        : "Signed in. Now create a fresh test API key.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Authentication failed.");
    } finally {
      setBusy(false);
    }
  }

  async function createKey() {
    setBusy(true);
    setMessage("");
    setError("");
    setKey("");
    setVerified(null);

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
      setVerified(Boolean(data.verified));

      if (data.verified) {
        setMessage("API key created and verified against Panta. Copy this key into Vercel.");
      } else {
        setError(`Panta created the key, but immediately rejected it: ${data.verifyError ?? "authentication required or invalid"}`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "API key creation failed.");
    } finally {
      setBusy(false);
    }
  }

  async function copyKey() {
    if (!key) return;
    await navigator.clipboard.writeText(key);
    setMessage(verified
      ? "Verified key copied. Replace PANTA_API_KEY in Vercel with this exact value."
      : "Key copied, but it did not verify. Do not use it in Vercel yet.");
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
        <h1 className="setupTitle">Connect your Panta developer account</h1>
        <p className="sub">
          Already registered? Sign in with the same email and password. Your password is forwarded to Panta and is not stored by SignalDesk.
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
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Your Panta developer password"
        />

        <label>Name <span className="small">(only used for new registration)</span></label>
        <input
          className="input"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Den"
        />

        <div className="controls">
          <button
            className="btn primary"
            onClick={() => auth("login")}
            disabled={busy || !email || password.length < 8}
          >
            {busy ? "Working…" : "Sign in"}
          </button>
          <button
            className="btn"
            onClick={() => auth("register")}
            disabled={busy || !email || password.length < 8}
          >
            Create new account
          </button>
        </div>
      </section>

      <section className="setupCard">
        <div className="eyebrow">Step 2</div>
        <h2>Create and verify a fresh Panta test key</h2>
        <p className="sub">
          SignalDesk now checks the key against Panta immediately after creation, so we know it works before putting it into Vercel.
        </p>

        <div className="controls">
          <button
            className="btn primary"
            onClick={createKey}
            disabled={busy || !access}
          >
            {busy ? "Working…" : "Create & verify test API key"}
          </button>
        </div>

        {key && (
          <div className="secretBox">
            <div className="small">PANTA_API_KEY {verified ? "· VERIFIED" : "· NOT VERIFIED"}</div>
            <code>{key}</code>
            <button className="btn" onClick={copyKey}>Copy key</button>
          </div>
        )}
      </section>

      {message && <div className="success">{message}</div>}
      {error && <div className="error">{error}</div>}

      <section className="notice">
        <strong>Security:</strong> do not send your password or API key in chat. Refreshing this page clears the access token and displayed key from page memory.
      </section>

      <footer className="footer">
        <b>Powered by Panta</b> · SignalDesk is an independent developer product.
      </footer>
    </main>
  );
}
