"use client";

import {useEffect, useMemo, useState} from "react";
import type {SignalMarket} from "@/lib/types";

type MarketsResponse = {
  markets: SignalMarket[];
  fetchedAt: string;
  error?: string;
};

type Quote = {
  shares: string;
  avgPrice: string;
  feeUsdc: string;
  expiresAt: string;
};

const usd = (n: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(n);

const pct = (n: number | null) =>
  n == null ? "—" : `${Math.round(n * 100)}%`;

export default function Dashboard() {
  const [data, setData] = useState<MarketsResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<SignalMarket | null>(null);
  const [analysis, setAnalysis] = useState("");
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [wallet, setWallet] = useState("");
  const [side, setSide] = useState<"yes" | "no">("yes");
  const [amount, setAmount] = useState("20");
  const [quote, setQuote] = useState<Quote | null>(null);
  const [error, setError] = useState("");

  async function refresh() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/markets", {cache: "no-store"});
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Unable to load markets");
      setData(json);
      if (!selected && json.markets?.length) setSelected(json.markets[0]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load markets");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void refresh();
  }, []);

  const totalVolume = useMemo(
    () => data?.markets.reduce((sum, market) => sum + market.volume, 0) ?? 0,
    [data],
  );

  async function runResearch() {
    if (!selected) return;
    setAnalysisLoading(true);
    setAnalysis("");
    setError("");

    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify(selected),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Research failed");
      setAnalysis(json.analysis);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Research failed");
    } finally {
      setAnalysisLoading(false);
    }
  }

  async function getQuote() {
    if (!selected || !wallet) return;
    setQuote(null);
    setError("");

    try {
      const res = await fetch("/api/quote", {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({
          wallet,
          marketId: selected.marketId,
          side,
          amountUsdc: amount,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Quote failed");
      setQuote(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Quote failed");
    }
  }

  return (
    <main className="shell">
      <header className="topbar">
        <div className="brand">
          <div className="logo">S</div>
          SignalDesk
        </div>
        <div className="badge">Research-first · human-confirmed actions</div>
      </header>

      <section className="hero">
        <div className="heroCard">
          <div>
            <div className="eyebrow">AI + prediction markets</div>
            <h1>Find the market worth understanding.</h1>
            <p className="sub">
              SignalDesk ranks live Panta markets by information value,
              liquidity and timing, then generates a fresh research brief
              before any action.
            </p>
          </div>
          <div className="controls">
            <button className="btn primary" onClick={refresh} disabled={loading}>
              {loading ? "Scanning…" : "Scan Panta"}
            </button>
            <span className="small">No wallet required to research.</span>
          </div>
        </div>

        <div className="heroCard metrics">
          <Metric value={String(data?.markets.length ?? 0)} label="markets scored" />
          <Metric value={usd(totalVolume)} label="visible volume" />
          <Metric
            value={data?.markets[0]?.signalScore.toFixed(0) ?? "—"}
            label="top signal score"
          />
          <Metric
            value={String(
              data?.markets.filter((market) => market.phase === "secondary").length ?? 0,
            )}
            label="secondary markets"
          />
        </div>
      </section>

      {error && <div className="error">{error}</div>}

      <section className="panel">
        <div className="tableHead">
          <div>Signal</div>
          <div>Market</div>
          <div>YES</div>
          <div>NO</div>
          <div>Volume</div>
          <div>Phase</div>
        </div>

        {(data?.markets ?? []).map((market) => (
          <button
            className="row"
            key={market.marketId}
            onClick={() => {
              setSelected(market);
              setAnalysis("");
              setQuote(null);
            }}
          >
            <div className="score">{market.signalScore.toFixed(0)}</div>
            <div className="marketCell">
              <div className="title">{market.title}</div>
              <div className="meta">
                {market.category ?? "general"} · disagreement{" "}
                {market.disagreementScore.toFixed(0)} · timing{" "}
                {market.timingScore.toFixed(0)}
              </div>
            </div>
            <div className="price">{pct(market.yes)}</div>
            <div className="price">{pct(market.no)}</div>
            <div>{usd(market.volume)}</div>
            <div>
              <span className="phase">{market.phase}</span>
            </div>
          </button>
        ))}

        {!loading && !data?.markets.length && (
          <div className="empty">
            No active markets returned yet. Add PANTA_API_KEY to the deployment.
          </div>
        )}
      </section>

      {selected && (
        <section className="drawer">
          <div className="drawerGrid">
            <div>
              <div className="eyebrow">Research agent</div>
              <h2>{selected.title}</h2>
              <p className="sub">
                {selected.description || "No description provided."}
              </p>

              <div className="controls">
                <button
                  className="btn primary"
                  onClick={runResearch}
                  disabled={analysisLoading}
                >
                  {analysisLoading ? "Researching web…" : "Generate research brief"}
                </button>
              </div>

              <div className="analysis">
                {analysis ||
                  "Run the research agent to collect fresh context, uncertainty and watch triggers. This is market intelligence, not a recommendation to buy or sell."}
              </div>
            </div>

            <div className="quoteBox">
              <div className="eyebrow">Human confirmation lane</div>
              <h3>Preview a primary-market quote</h3>
              <p className="small">
                SignalDesk requests a quote only. Signing and broadcasting remain
                a separate explicit wallet action.
              </p>

              <label>Solana wallet</label>
              <input
                className="input"
                value={wallet}
                onChange={(event) => setWallet(event.target.value)}
                placeholder="Public wallet address"
              />

              <label>Side</label>
              <div className="controls">
                <button
                  className={`btn ${side === "yes" ? "primary" : ""}`}
                  onClick={() => setSide("yes")}
                >
                  YES
                </button>
                <button
                  className={`btn ${side === "no" ? "primary" : ""}`}
                  onClick={() => setSide("no")}
                >
                  NO
                </button>
              </div>

              <label>USDC amount</label>
              <input
                className="input"
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
                inputMode="decimal"
              />

              <div className="controls">
                <button
                  className="btn"
                  disabled={!wallet || selected.phase !== "primary"}
                  onClick={getQuote}
                >
                  Get quote
                </button>
              </div>

              {selected.phase !== "primary" && (
                <p className="small">
                  Quote preview is available for primary markets in this MVP.
                </p>
              )}

              {quote && (
                <div className="quoteResult">
                  <strong>{quote.shares} shares</strong>
                  <span>Avg price {quote.avgPrice}</span>
                  <span>Fee {quote.feeUsdc} USDC</span>
                  <span>Expires {new Date(quote.expiresAt).toLocaleTimeString()}</span>
                </div>
              )}
            </div>
          </div>
        </section>
      )}

      <footer className="footer">
        <b>Powered by Panta</b> · SignalDesk is an independent research interface.
        Market prices are not guarantees or financial advice.
      </footer>
    </main>
  );
}

function Metric({value, label}: {value: string; label: string}) {
  return (
    <div className="metric">
      <strong>{value}</strong>
      <span>{label}</span>
    </div>
  );
}
