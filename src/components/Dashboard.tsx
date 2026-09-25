"use client";

import {useEffect, useMemo, useState} from "react";
import type {SignalMarket} from "@/lib/types";

type MarketsResponse = {
  markets: SignalMarket[];
  fetchedAt: string;
  mode: "test" | "live";
  sandbox: boolean;
  categories: string[];
  error?: string;
};

type Citation = {title: string; url: string};

type MarketActivity = {
  tradeCount: number;
  yesFlow: number;
  noFlow: number;
  fees: number;
  primaryTrades: number;
  secondaryTrades: number;
  latestBlockTime: number | null;
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
  n == null ? "—" : Math.round(n * 100) + "%";

const daysLabel = (days: number | null) => {
  if (days == null) return "No deadline";
  if (days < 0) return "Closed";
  if (days < 1) return "Closes today";
  if (days < 2) return "1 day left";
  if (days < 30) return Math.ceil(days) + " days left";
  return Math.ceil(days / 30) + " mo left";
};

export default function Dashboard() {
  const [data, setData] = useState<MarketsResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<SignalMarket | null>(null);
  const [analysis, setAnalysis] = useState("");
  const [sources, setSources] = useState<Citation[]>([]);
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [activity, setActivity] = useState<MarketActivity | null>(null);
  const [activityLoading, setActivityLoading] = useState(false);
  const [wallet, setWallet] = useState("");
  const [side, setSide] = useState<"yes" | "no">("yes");
  const [amount, setAmount] = useState("20");
  const [quote, setQuote] = useState<Quote | null>(null);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");
  const [phase, setPhase] = useState("all");
  const [sort, setSort] = useState<"signal" | "volume" | "deadline">("signal");

  async function refresh() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/markets", {cache: "no-store"});
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Unable to load markets");
      setData(json);
      if (json.markets?.length) {
        setSelected((current) => {
          if (!current) return json.markets[0];
          return json.markets.find((m: SignalMarket) => m.marketId === current.marketId) ?? json.markets[0];
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load markets");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void refresh();
  }, []);

  useEffect(() => {
    if (!selected) return;
    const controller = new AbortController();

    async function loadActivity() {
      setActivityLoading(true);
      try {
        const res = await fetch(
          "/api/market-activity?marketId=" + encodeURIComponent(selected.marketId),
          {cache: "no-store", signal: controller.signal},
        );
        const json = await res.json();
        if (res.ok) setActivity(json);
        else setActivity(null);
      } catch {
        if (!controller.signal.aborted) setActivity(null);
      } finally {
        if (!controller.signal.aborted) setActivityLoading(false);
      }
    }

    void loadActivity();
    return () => controller.abort();
  }, [selected?.marketId]);

  const filtered = useMemo(() => {
    const items = [...(data?.markets ?? [])].filter((market) => {
      const search = query.trim().toLowerCase();
      const matchesSearch =
        !search ||
        market.title.toLowerCase().includes(search) ||
        market.description?.toLowerCase().includes(search) ||
        market.category?.toLowerCase().includes(search);
      const matchesCategory = category === "all" || market.category === category;
      const matchesPhase = phase === "all" || market.phase === phase;
      return matchesSearch && matchesCategory && matchesPhase;
    });

    items.sort((a, b) => {
      if (sort === "volume") return b.volume - a.volume;
      if (sort === "deadline") {
        return (a.daysToClose ?? Number.MAX_SAFE_INTEGER) -
          (b.daysToClose ?? Number.MAX_SAFE_INTEGER);
      }
      return b.signalScore - a.signalScore;
    });

    return items;
  }, [data, query, category, phase, sort]);

  const totalVolume = useMemo(
    () => data?.markets.reduce((sum, market) => sum + market.volume, 0) ?? 0,
    [data],
  );

  const top = filtered[0] ?? data?.markets[0] ?? null;

  function chooseMarket(market: SignalMarket) {
    setSelected(market);
    setAnalysis("");
    setSources([]);
    setActivity(null);
    setQuote(null);
    requestAnimationFrame(() => {
      document.getElementById("research")?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    });
  }

  async function runResearch() {
    if (!selected) return;
    setAnalysisLoading(true);
    setAnalysis("");
    setSources([]);
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
      setSources(Array.isArray(json.sources) ? json.sources : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Research failed");
    } finally {
      setAnalysisLoading(false);
    }
  }

  async function copyResearch() {
    if (!analysis) return;
    await navigator.clipboard.writeText(analysis);
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
          <div>
            <div>SignalDesk</div>
            <div className="brandSub">Prediction-market intelligence</div>
          </div>
        </div>
        <div className="statusRow">
          <span className={"statusDot " + (data ? "online" : "")} />
          <span>{data ? "Panta connected" : "Connecting…"}</span>
          <span className={"modeBadge " + (data?.sandbox ? "sandbox" : "live")}>
            {data?.sandbox ? "SANDBOX" : "LIVE"}
          </span>
        </div>
      </header>

      {data?.sandbox && (
        <section className="sandboxBanner">
          <strong>Sandbox mode.</strong>
          <span>
            Your pk_test key is connected correctly. Panta is returning fixture markets,
            so no real funds or mainnet markets are involved yet.
          </span>
        </section>
      )}

      <section className="hero">
        <div className="heroCard">
          <div>
            <div className="eyebrow">Research before execution</div>
            <h1>Turn market noise into a research queue.</h1>
            <p className="sub heroCopy">
              SignalDesk scans Panta, prioritizes markets by activity, uncertainty
              and timing, then uses an AI research agent to explain what matters and
              what to verify next.
            </p>
          </div>
          <div className="controls">
            <button className="btn primary" onClick={refresh} disabled={loading}>
              {loading ? "Scanning Panta…" : "Refresh scanner"}
            </button>
            <span className="small">
              Last sync {data?.fetchedAt ? new Date(data.fetchedAt).toLocaleTimeString() : "—"}
            </span>
          </div>
        </div>

        <div className="heroCard metrics">
          <Metric value={String(data?.markets.length ?? 0)} label="markets scored" />
          <Metric value={usd(totalVolume)} label="visible volume" />
          <Metric value={top?.signalScore.toFixed(0) ?? "—"} label="top research score" />
          <Metric
            value={String(data?.markets.filter((market) => market.phase === "secondary").length ?? 0)}
            label="secondary markets"
          />
        </div>
      </section>

      {top && (
        <section className="spotlight">
          <div>
            <div className="eyebrow">Highest-priority research</div>
            <h2>{top.title}</h2>
            <p className="sub">{top.attentionReason} · {daysLabel(top.daysToClose)}</p>
          </div>
          <div className="spotlightStats">
            <div><span>Score</span><strong>{top.signalScore.toFixed(0)}</strong></div>
            <div><span>YES</span><strong>{pct(top.yes)}</strong></div>
            <div><span>Volume</span><strong>{usd(top.volume)}</strong></div>
          </div>
          <button className="btn primary" onClick={() => chooseMarket(top)}>
            Research this market
          </button>
        </section>
      )}

      {error && <div className="error">{error}</div>}

      <section className="scannerHeader">
        <div>
          <div className="eyebrow">Market scanner</div>
          <h2>Research queue</h2>
        </div>
        <div className="filterGrid">
          <input
            className="input filterInput"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search markets"
          />
          <select className="select" value={category} onChange={(event) => setCategory(event.target.value)}>
            <option value="all">All categories</option>
            {(data?.categories ?? []).map((item) => <option value={item} key={item}>{item}</option>)}
          </select>
          <select className="select" value={phase} onChange={(event) => setPhase(event.target.value)}>
            <option value="all">All phases</option>
            <option value="primary">Primary</option>
            <option value="secondary">Secondary</option>
          </select>
          <select className="select" value={sort} onChange={(event) => setSort(event.target.value as typeof sort)}>
            <option value="signal">Sort: research score</option>
            <option value="volume">Sort: volume</option>
            <option value="deadline">Sort: deadline</option>
          </select>
        </div>
      </section>

      <section className="marketGrid">
        {filtered.map((market) => (
          <button
            className={"marketCard " + (selected?.marketId === market.marketId ? "selected" : "")}
            key={market.marketId}
            onClick={() => chooseMarket(market)}
          >
            <div className="cardTop">
              <div className="score">{market.signalScore.toFixed(0)}</div>
              <div className="cardTags">
                <span className="phase">{market.phase}</span>
                <span className="reasonTag">{market.attentionReason}</span>
              </div>
            </div>

            <div className="marketTitle">{market.title}</div>
            <p className="marketDescription">
              {market.description || "No market description provided."}
            </p>

            <div className="probabilityBar" aria-label="Market-implied probability">
              <div style={{width: String(Math.round((market.yes ?? 0.5) * 100)) + "%"}} />
            </div>

            <div className="priceRow">
              <div><span>YES</span><strong>{pct(market.yes)}</strong></div>
              <div><span>NO</span><strong>{pct(market.no)}</strong></div>
              <div><span>VOL</span><strong>{usd(market.volume)}</strong></div>
            </div>

            <div className="scoreBreakdown">
              <span>Activity {market.liquidityScore.toFixed(0)}</span>
              <span>Uncertainty {market.disagreementScore.toFixed(0)}</span>
              <span>Timing {market.timingScore.toFixed(0)}</span>
            </div>
            <div className="deadline">{daysLabel(market.daysToClose)}</div>
          </button>
        ))}

        {!loading && !filtered.length && (
          <div className="empty cardEmpty">
            No markets match the current filters.
          </div>
        )}
      </section>

      {selected && (
        <section className="drawer" id="research">
          <div className="drawerGrid">
            <div>
              <div className="eyebrow">AI research agent</div>
              <h2>{selected.title}</h2>
              <p className="sub">
                {selected.description || "No description provided."}
              </p>

              <div className="researchMeta">
                <span>Research score <b>{selected.signalScore.toFixed(0)}</b></span>
                <span>Implied YES <b>{pct(selected.yes)}</b></span>
                <span>{daysLabel(selected.daysToClose)}</span>
                <span>
                  {activityLoading ? "Loading activity…" : "Recent trades "}
                  {!activityLoading && <b>{activity?.tradeCount ?? 0}</b>}
                </span>
              </div>

              {activity && (
                <div className="activityStrip">
                  <div><span>YES flow</span><strong>{activity.yesFlow.toFixed(2)}</strong></div>
                  <div><span>NO flow</span><strong>{activity.noFlow.toFixed(2)}</strong></div>
                  <div><span>Primary</span><strong>{activity.primaryTrades}</strong></div>
                  <div><span>Secondary</span><strong>{activity.secondaryTrades}</strong></div>
                </div>
              )}

              <div className="controls">
                <button
                  className="btn primary"
                  onClick={runResearch}
                  disabled={analysisLoading}
                >
                  {analysisLoading ? "Researching the web…" : "Generate research brief"}
                </button>
                {analysis && (
                  <button className="btn" onClick={copyResearch}>Copy brief</button>
                )}
              </div>

              <div className={"analysis " + (analysis ? "filled" : "")}>
                {analysis ? (
                  <ResearchBrief text={analysis} />
                ) : (
                  "The agent will separate facts from uncertainty, inspect catalysts and resolution mechanics, and produce watch triggers. It does not choose a trade for you."
                )}
              </div>

              {!!sources.length && (
                <div className="sources">
                  <div className="small sourceLabel">Sources used</div>
                  {sources.map((source) => (
                    <a href={source.url} target="_blank" rel="noreferrer" key={source.url}>
                      {source.title}
                    </a>
                  ))}
                </div>
              )}
            </div>

            <div className="quoteBox">
              <div className="eyebrow">Execution preview</div>
              <h3>Preview a primary-market quote</h3>
              <p className="small">
                SignalDesk requests a quote only. It never signs or broadcasts a
                transaction automatically.
              </p>

              <div className="safetyPill">Human confirmation required</div>

              <label>Solana wallet</label>
              <input
                className="input"
                value={wallet}
                onChange={(event) => setWallet(event.target.value)}
                placeholder="Public wallet address"
              />

              <label>Side</label>
              <div className="controls tight">
                <button
                  className={"btn " + (side === "yes" ? "primary" : "")}
                  onClick={() => setSide("yes")}
                >
                  YES
                </button>
                <button
                  className={"btn " + (side === "no" ? "primary" : "")}
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
                  <span>Average price {quote.avgPrice}</span>
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
        Research scores prioritize attention; they are not expected-return estimates or financial advice.
      </footer>
    </main>
  );
}

function ResearchBrief({text}: {text: string}) {
  return (
    <div className="brief">
      {text.split("\n").map((line, index) => {
        const trimmed = line.trim();
        if (!trimmed) return <div className="briefSpace" key={index} />;
        if (trimmed.startsWith("## ")) {
          return <h3 key={index}>{trimmed.slice(3)}</h3>;
        }
        if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
          return <div className="briefBullet" key={index}>{trimmed.slice(2)}</div>;
        }
        return <p key={index}>{trimmed}</p>;
      })}
    </div>
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
