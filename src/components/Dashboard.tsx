"use client";

import {useEffect, useMemo, useState} from "react";
import type {SignalMarket} from "@/lib/types";
import TractionPanel from "@/components/TractionPanel";
import {trackSession, trackTraction, tractionClientId} from "@/lib/traction-client";

type MarketsResponse = {
  markets: SignalMarket[];
  fetchedAt: string;
  mode: "test" | "live";
  sandbox: boolean;
  categories: string[];
  error?: string;
};

type Citation = {title: string; url: string};

type SimpleBrief = {
  title: string;
  bottomLine: string;
  keyPoints: string[];
  uncertainty: string;
  watch: string[];
  confidence: "Low" | "Medium" | "High";
};

type MarketActivity = {
  tradeCount: number;
  yesFlow: number;
  noFlow: number;
  fees: number;
  primaryTrades: number;
  secondaryTrades: number;
  latestBlockTime: number | null;
  recent?: Array<{
    yesAmount: string | number;
    noAmount: string | number;
    isPrimary: boolean;
    blockTime: number | null;
  }>;
};

type PricePoint = {at: number; yes: number};

type Quote = {
  quoteId: string;
  marketId: string;
  shares: string;
  avgPrice: string;
  feeUsdc: string;
  expiresAt: string;
};

type BuildPreview = {
  orderId: string;
  expectedShares: string;
  feeUsdc: string;
  status: string;
  instructionCount: number;
  programIds: string[];
  recentBlockhash: string;
  expiresAt?: string | null;
  signingRequired: boolean;
  broadcasted: boolean;
};

type Position = {
  marketId: string;
  category?: string | null;
  side: string;
  shares: string;
  phase: string;
  claimable: boolean;
  claimed: boolean;
  outcome?: string | null;
};

type HealthResponse = {
  pantaConfigured: boolean;
  openaiConfigured: boolean;
  openaiAuthOk: boolean;
  openaiStatus?: number | null;
};

const usd = (n: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(n);

const pct = (n: number | null) =>
  n == null ? "—" : Math.round(n * 100) + "%";

const marketLabel = (market: SignalMarket) => {
  const title = market.title?.trim();
  if (title) return title;
  const category = (market.category ?? "market").replace(/\b\w/g, (c) => c.toUpperCase());
  return category + " market · " + market.marketId.slice(0, 7) + "…" + market.marketId.slice(-5);
};

const marketDescription = (market: SignalMarket) => {
  const description = market.description?.trim();
  if (description) return description;
  if (market.oracle) return "Panta did not send a text question. Oracle: " + market.oracle;
  return "Panta did not send a text question for this market.";
};

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
  const [brief, setBrief] = useState<SimpleBrief | null>(null);
  const [sources, setSources] = useState<Citation[]>([]);
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [activity, setActivity] = useState<MarketActivity | null>(null);
  const [activityLoading, setActivityLoading] = useState(false);
  const [wallet, setWallet] = useState("");
  const [side, setSide] = useState<"yes" | "no">("yes");
  const [amount, setAmount] = useState("20");
  const [quote, setQuote] = useState<Quote | null>(null);
  const [buildPreview, setBuildPreview] = useState<BuildPreview | null>(null);
  const [buildLoading, setBuildLoading] = useState(false);
  const [positions, setPositions] = useState<Position[]>([]);
  const [positionsLoading, setPositionsLoading] = useState(false);
  const [error, setError] = useState("");
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [priceDeltas, setPriceDeltas] = useState<Record<string, number>>({});
  const [priceHistory, setPriceHistory] = useState<Record<string, PricePoint[]>>({});
  const [watchlist, setWatchlist] = useState<string[]>([]);
  const [watchlistOnly, setWatchlistOnly] = useState(false);
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

      if (typeof window !== "undefined" && Array.isArray(json.markets)) {
        const previousRaw = window.localStorage.getItem("signaldesk:last-prices");
        const previous = previousRaw ? JSON.parse(previousRaw) as Record<string, number> : {};
        const historyRaw = window.localStorage.getItem("signaldesk:price-history:v1");
        const history = historyRaw
          ? JSON.parse(historyRaw) as Record<string, PricePoint[]>
          : {};
        const next: Record<string, number> = {};
        const deltas: Record<string, number> = {};
        const now = Date.now();

        for (const market of json.markets as SignalMarket[]) {
          if (market.yes == null) continue;
          next[market.marketId] = market.yes;

          if (typeof previous[market.marketId] === "number") {
            deltas[market.marketId] = market.yes - previous[market.marketId];
          }

          const points = Array.isArray(history[market.marketId])
            ? history[market.marketId].filter(
                (point) =>
                  Number.isFinite(point?.at) &&
                  Number.isFinite(point?.yes),
              )
            : [];
          const last = points.at(-1);
          if (!last || now - last.at >= 60_000) {
            history[market.marketId] = [
              ...points,
              {at: now, yes: market.yes},
            ].slice(-32);
          } else {
            history[market.marketId] = points;
          }
        }

        setPriceDeltas(deltas);
        setPriceHistory(history);
        window.localStorage.setItem("signaldesk:last-prices", JSON.stringify(next));
        window.localStorage.setItem("signaldesk:price-history:v1", JSON.stringify(history));
      }

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
    if (typeof window !== "undefined") {
      try {
        const saved = JSON.parse(
          window.localStorage.getItem("signaldesk:watchlist") ?? "[]",
        );
        if (Array.isArray(saved)) {
          setWatchlist(saved.filter((item): item is string => typeof item === "string"));
        }
      } catch {
        setWatchlist([]);
      }
    }

    trackSession();
    void refresh();

    void fetch("/api/health", {cache: "no-store"})
      .then((response) => response.json())
      .then((json: HealthResponse) => setHealth(json))
      .catch(() => setHealth(null));
  }, []);

  useEffect(() => {
    if (!selected) return;
    const marketId = selected.marketId;
    const controller = new AbortController();

    async function loadActivity() {
      setActivityLoading(true);
      try {
        const res = await fetch(
          "/api/market-activity?marketId=" + encodeURIComponent(marketId),
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
        String(market.title ?? "").toLowerCase().includes(search) ||
        String(market.description ?? "").toLowerCase().includes(search) ||
        String(market.category ?? "").toLowerCase().includes(search);
      const matchesCategory = category === "all" || market.category === category;
      const matchesPhase = phase === "all" || market.phase === phase;
      const matchesWatchlist = !watchlistOnly || watchlist.includes(market.marketId);
      return matchesSearch && matchesCategory && matchesPhase && matchesWatchlist;
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
  }, [data, query, category, phase, sort, watchlist, watchlistOnly]);

  const totalVolume = useMemo(
    () => data?.markets.reduce((sum, market) => sum + market.volume, 0) ?? 0,
    [data],
  );

  const top = filtered[0] ?? data?.markets[0] ?? null;

  function chooseMarket(market: SignalMarket) {
    setSelected(market);
    void trackTraction("market_opened", {
      category: market.category ?? undefined,
      phase: market.phase,
    });
    setAnalysis("");
    setBrief(null);
    setSources([]);
    setActivity(null);
    setQuote(null);
    setBuildPreview(null);
    requestAnimationFrame(() => {
      document.getElementById("research")?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    });
  }

  function toggleWatchlist(marketId: string) {
    setWatchlist((current) => {
      const next = current.includes(marketId)
        ? current.filter((id) => id !== marketId)
        : [...current, marketId];

      if (typeof window !== "undefined") {
        window.localStorage.setItem("signaldesk:watchlist", JSON.stringify(next));
      }

      if (!current.includes(marketId)) {
        const market = data?.markets.find((item) => item.marketId === marketId);
        void trackTraction("watchlist_add", {
          category: market?.category ?? undefined,
          phase: market?.phase,
        });
      }

      return next;
    });
  }

  async function runResearch(mode: "research" | "move" = "research") {
    if (!selected) return;
    setAnalysisLoading(true);
    setAnalysis("");
    setBrief(null);
    setSources([]);
    setError("");

    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-SignalDesk-Client": tractionClientId(),
        },
        body: JSON.stringify({
          market: selected,
          mode,
          context: mode === "move"
            ? {
                priceDeltaYes: priceDeltas[selected.marketId] ?? null,
                activity,
                observedAt: new Date().toISOString(),
              }
            : undefined,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Research failed");
      setAnalysis(json.analysis);
      setBrief(json.brief ?? null);
      setSources(Array.isArray(json.sources) ? json.sources : []);
      void trackTraction(
        mode === "move" ? "move_research_generated" : "research_generated",
        {
          category: selected.category ?? undefined,
          phase: selected.phase,
        },
      );
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
    setBuildPreview(null);
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
      void trackTraction("quote_generated", {
        category: selected.category ?? undefined,
        phase: selected.phase,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Quote failed";
      setError(
        message === "MARKET_NOT_FOUND"
          ? "Panta currently lists this market as primary, but its live order API is not quoting it yet. Try another priced primary market."
          : message,
      );
    }
  }

  async function buildUnsignedTransaction() {
    if (!quote || !wallet) return;
    setBuildLoading(true);
    setBuildPreview(null);
    setError("");

    try {
      const res = await fetch("/api/build", {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({
          quoteId: quote.quoteId,
          wallet,
          maxSlippageBps: 100,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Transaction build failed");
      setBuildPreview(json);
      void trackTraction("build_generated", {
        category: selected?.category ?? undefined,
        phase: selected?.phase,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Transaction build failed");
    } finally {
      setBuildLoading(false);
    }
  }

  async function loadPositions() {
    if (!wallet) return;
    setPositionsLoading(true);
    setError("");

    try {
      const res = await fetch(
        "/api/positions?wallet=" + encodeURIComponent(wallet),
        {cache: "no-store"},
      );
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Unable to load positions");
      const nextPositions = Array.isArray(json.positions) ? json.positions : [];
      setPositions(nextPositions);
      void trackTraction("positions_loaded", {count: nextPositions.length});
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load positions");
    } finally {
      setPositionsLoading(false);
    }
  }

  function activePositionValue(position: Position) {
    const market = data?.markets.find((item) => item.marketId === position.marketId);
    if (!market || position.outcome || position.claimable) return null;
    const price = position.side.toLowerCase() === "yes" ? market.yes : market.no;
    const shares = Number(position.shares);
    if (price == null || !Number.isFinite(shares)) return null;
    return shares * price;
  }

  const estimatedPortfolio = positions.reduce((sum, position) => {
    const value = activePositionValue(position);
    return value == null ? sum : sum + value;
  }, 0);

  const executionAvailable =
    selected?.phase === "primary" &&
    selected.yes != null &&
    selected.no != null;

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
          <span className={"integrationBadge " + (health?.openaiAuthOk ? "ready" : "offline")}>
            AI {health?.openaiAuthOk ? "READY" : "CHECK"}
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
            <div className="eyebrow">Simple market research</div>
            <h1>Understand a market in 30 seconds.</h1>
            <p className="sub heroCopy">
              Pick a Panta market. SignalDesk checks the facts, explains the situation
              in plain English, and shows what to watch next.
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
          <Metric value={String(data?.markets.length ?? 0)} label="markets" />
          <Metric value={usd(totalVolume)} label="money traded" />
          <Metric value={top?.signalScore.toFixed(0) ?? "—"} label="top priority" />
          <Metric
            value={String(data?.markets.filter((market) => (market.daysToClose ?? -1) >= 0).length ?? 0)}
            label="current markets"
          />
        </div>
      </section>

      {top && (
        <section className="spotlight">
          <div>
            <div className="eyebrow">Start here</div>
            <h2>{marketLabel(top)}</h2>
            <p className="sub">{top.attentionReason} · {daysLabel(top.daysToClose)}</p>
          </div>
          <div className="spotlightStats">
            <div><span>Score</span><strong>{top.signalScore.toFixed(0)}</strong></div>
            <div><span>YES</span><strong>{pct(top.yes)}</strong></div>
            <div><span>Traded</span><strong>{usd(top.volume)}</strong></div>
          </div>
          <button className="btn primary" onClick={() => chooseMarket(top)}>
            Explain this market
          </button>
        </section>
      )}

      {error && <div className="error">{error}</div>}

      <section className="scannerHeader">
        <div className="scannerTitle">
          <div>
            <div className="eyebrow">Choose a market</div>
            <h2>Markets to explore</h2>
          </div>
          <button
            className={"btn watchlistToggle " + (watchlistOnly ? "watching" : "")}
            onClick={() => setWatchlistOnly((value) => !value)}
            aria-pressed={watchlistOnly}
          >
            ★ Watchlist · {watchlist.length}
          </button>
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
            <option value="signal">Sort: priority</option>
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
            <div className="cardTop simpleCardTop">
              <div className="cardTags">
                <span className="categoryTag">{market.category ?? "market"}</span>
                <span className="phase">{market.phase}</span>
                {watchlist.includes(market.marketId) && (
                  <span className="watchFlag">★ saved</span>
                )}
              </div>
              <div className="priorityBadge">
                <span>Priority</span>
                <strong>{market.signalScore.toFixed(0)}</strong>
              </div>
            </div>

            <div className="marketTitle">{marketLabel(market)}</div>
            {market.description?.trim() && market.description.trim() !== market.title?.trim() && (
              <p className="marketDescription">{marketDescription(market)}</p>
            )}

            <div className="probabilityBar" aria-label="Market-implied probability">
              <div style={{width: String(Math.round((market.yes ?? 0.5) * 100)) + "%"}} />
            </div>

            <div className="simpleStats">
              <div><span>YES</span><strong>{pct(market.yes)}</strong></div>
              <div><span>NO</span><strong>{pct(market.no)}</strong></div>
              <div><span>Closes</span><strong>{daysLabel(market.daysToClose)}</strong></div>
            </div>

            <div className="cardFooter">
              <span>{market.attentionReason}</span>
              <span>{usd(market.volume)} traded</span>
            </div>

            {typeof priceDeltas[market.marketId] === "number" && Math.abs(priceDeltas[market.marketId]) >= 0.0001 && (
              <div className={priceDeltas[market.marketId] > 0 ? "deltaUp simpleDelta" : "deltaDown simpleDelta"}>
                YES {priceDeltas[market.marketId] > 0 ? "+" : ""}{(priceDeltas[market.marketId] * 100).toFixed(1)} pts since last scan
              </div>
            )}
          </button>
        ))}

        {!loading && !filtered.length && (
          <div className="empty cardEmpty">
            {watchlistOnly
              ? "No watched markets are in the current live scan."
              : "No markets match the current filters."}
          </div>
        )}
      </section>

      {selected && (
        <section className="drawer" id="research">
          <div className="drawerGrid">
            <div>
              <div className="eyebrow">Simple research</div>
              <h2>{marketLabel(selected)}</h2>
              <p className="sub">
                {marketDescription(selected)}
              </p>

              {!selected.title?.trim() && selected.images?.[0] && (
                <div className="researchImage">
                  <img src={selected.images[0]} alt="" />
                  {!selected.title?.trim() && (
                    <div className="small">
                      Panta returned blank text metadata. The research agent can inspect this market image before searching the web.
                    </div>
                  )}
                </div>
              )}

              <MarketSnapshot
                market={selected}
                activity={activity}
                activityLoading={activityLoading}
                history={priceHistory[selected.marketId] ?? []}
              />

              <div className="controls researchActions">
                <button
                  className="btn primary"
                  onClick={() => runResearch("research")}
                  disabled={analysisLoading}
                >
                  {analysisLoading ? "Checking sources…" : "Get the 30-sec answer"}
                </button>
                <button
                  className="btn"
                  onClick={() => runResearch("move")}
                  disabled={analysisLoading}
                >
                  Explain the move
                </button>
                <button
                  className={"btn " + (watchlist.includes(selected.marketId) ? "watching" : "")}
                  onClick={() => toggleWatchlist(selected.marketId)}
                >
                  {watchlist.includes(selected.marketId) ? "★ Watching" : "☆ Watch"}
                </button>
                {analysis && (
                  <button className="btn quietBtn" onClick={copyResearch}>Copy</button>
                )}
              </div>

              <div className={"analysis simpleAnalysis " + (brief ? "filled" : "")}>
                {brief ? (
                  <SimpleResearchBrief brief={brief} />
                ) : (
                  <div className="researchEmpty">
                    <strong>Get the simple version.</strong>
                    <span>
                      SignalDesk will give you one clear answer, a few facts, the biggest uncertainty,
                      and what to watch next.
                    </span>
                  </div>
                )}
              </div>

              {!!sources.length && (
                <details className="detailsCard sourcesDetails">
                  <summary>{sources.length} source{sources.length === 1 ? "" : "s"} checked</summary>
                  <div className="sourceChips">
                    {sources.map((source, index) => (
                      <a
                        href={source.url}
                        target="_blank"
                        rel="noreferrer"
                        key={source.url}
                        title={source.title}
                      >
                        <span>{index + 1}</span>
                        {sourceDomain(source.url)}
                      </a>
                    ))}
                  </div>
                </details>
              )}
            </div>

            <details className="advancedPanel">
              <summary>
                <span>Advanced</span>
                <strong>Wallet & execution</strong>
              </summary>
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
                  disabled={!wallet || !executionAvailable}
                  onClick={getQuote}
                >
                  Get quote
                </button>
                {quote && (
                  <button
                    className="btn"
                    disabled={buildLoading}
                    onClick={buildUnsignedTransaction}
                  >
                    {buildLoading ? "Building…" : "Build unsigned transaction"}
                  </button>
                )}
              </div>

              {selected.phase !== "primary" ? (
                <p className="small">
                  Quote preview is available for primary markets in this MVP.
                </p>
              ) : !executionAvailable ? (
                <p className="small">
                  This market is listed by Panta as primary, but the live catalog is not
                  exposing executable YES/NO prices for it right now. SignalDesk keeps
                  execution disabled instead of presenting a broken quote flow.
                </p>
              ) : null}

              {quote && (
                <div className="quoteResult">
                  <strong>{quote.shares} shares</strong>
                  <span>Average price {quote.avgPrice}</span>
                  <span>Fee {quote.feeUsdc} USDC</span>
                  <span>Expires {new Date(quote.expiresAt).toLocaleTimeString()}</span>
                </div>
              )}

              {buildPreview && (
                <div className="buildResult">
                  <div className="buildResultTop">
                    <strong>Unsigned Solana transaction ready</strong>
                    <span>{buildPreview.instructionCount} instructions</span>
                  </div>
                  <span>Expected shares {buildPreview.expectedShares}</span>
                  <span>Order {buildPreview.orderId}</span>
                  <span>{buildPreview.programIds.length} program{buildPreview.programIds.length === 1 ? "" : "s"} involved</span>
                  <div className="safetyPill">Wallet signature still required · nothing broadcast</div>
                </div>
              )}

              <div className="portfolioBlock">
                <div className="portfolioHead">
                  <div>
                    <div className="eyebrow">Wallet intelligence</div>
                    <h3>Panta positions</h3>
                  </div>
                  <button
                    className="btn"
                    disabled={!wallet || positionsLoading}
                    onClick={loadPositions}
                  >
                    {positionsLoading ? "Loading…" : "Load positions"}
                  </button>
                </div>

                {!!positions.length && (
                  <div className="portfolioSummary">
                    <strong>{positions.length} position{positions.length === 1 ? "" : "s"}</strong>
                    <span>Active mark-to-market ~{estimatedPortfolio.toFixed(2)} USDC</span>
                  </div>
                )}

                <div className="positionList">
                  {positions.slice(0, 6).map((position) => {
                    const value = activePositionValue(position);
                    return (
                      <div className="positionRow" key={position.marketId + position.side}>
                        <div>
                          <strong>{position.side.toUpperCase()} · {Number(position.shares).toLocaleString()} shares</strong>
                          <span>{position.category ?? "Panta market"} · {position.marketId.slice(0, 7)}…</span>
                        </div>
                        <div className="positionValue">
                          {position.claimable
                            ? "Claimable"
                            : position.outcome
                              ? "Resolved"
                              : value == null
                                ? "—"
                                : "~" + value.toFixed(2) + " USDC"}
                        </div>
                      </div>
                    );
                  })}
                  {!positionsLoading && wallet && positions.length === 0 && (
                    <div className="small portfolioEmpty">
                      Load this public wallet to inspect Panta positions. No keys or signing permissions are requested.
                    </div>
                  )}
                </div>
              </div>
              </div>
            </details>
          </div>
        </section>
      )}

      <TractionPanel />

      <footer className="footer">
        <a href="https://panta.market" target="_blank" rel="noreferrer"><b>Powered by Panta</b></a>
        {" · "}SignalDesk is an independent research interface.
        Research scores prioritize attention; they are not expected-return estimates or financial advice.
      </footer>
    </main>
  );
}

function MarketSnapshot({
  market,
  activity,
  activityLoading,
  history,
}: {
  market: SignalMarket;
  activity: MarketActivity | null;
  activityLoading: boolean;
  history: PricePoint[];
}) {
  const yes = market.yes;
  const no = market.no;
  const yesPercent = yes == null ? null : Math.round(yes * 100);
  const totalFlow = (activity?.yesFlow ?? 0) + (activity?.noFlow ?? 0);
  const yesFlowPercent =
    totalFlow > 0 ? Math.round(((activity?.yesFlow ?? 0) / totalFlow) * 100) : null;

  const stance =
    yesPercent == null
      ? "No live price"
      : yesPercent >= 65
        ? "Market leans YES"
        : yesPercent <= 35
          ? "Market leans NO"
          : "Market is split";

  return (
    <div className="snapshot">
      <div className="snapshotTop">
        <div className="probabilityGauge">
          <svg viewBox="0 0 120 120" role="img" aria-label={"YES probability " + (yesPercent ?? "unknown")}>
            <circle className="gaugeTrack" cx="60" cy="60" r="48" />
            <circle
              className="gaugeValue"
              cx="60"
              cy="60"
              r="48"
              pathLength="100"
              strokeDasharray="100"
              strokeDashoffset={100 - (yesPercent ?? 0)}
            />
          </svg>
          <div className="gaugeCenter">
            <strong>{yesPercent == null ? "—" : yesPercent + "%"}</strong>
            <span>YES</span>
          </div>
        </div>

        <div className="snapshotSummary">
          <div className="snapshotEyebrow">Market snapshot</div>
          <h3>{stance}</h3>
          <p>
            {yesPercent == null
              ? "Panta is not publishing a live YES/NO price for this market yet."
              : "This is the market price right now — not a prediction from SignalDesk."}
          </p>

          <div className="balanceBar" aria-label="YES versus NO market balance">
            <div className="balanceYes" style={{width: (yesPercent ?? 0) + "%"}} />
          </div>
          <div className="balanceLabels">
            <span>YES {pct(yes)}</span>
            <span>NO {pct(no)}</span>
          </div>
        </div>
      </div>

      <div className="snapshotMetrics">
        <div>
          <span>Money traded</span>
          <strong>{usd(market.volume)}</strong>
        </div>
        <div>
          <span>Time left</span>
          <strong>{daysLabel(market.daysToClose)}</strong>
        </div>
        <div>
          <span>Recent trades</span>
          <strong>{activityLoading ? "…" : String(activity?.tradeCount ?? 0)}</strong>
        </div>
        <div>
          <span>Priority</span>
          <strong>{market.signalScore.toFixed(0)}</strong>
        </div>
      </div>

      <div className="visualGrid">
        <div className="visualCard">
          <div className="visualHead">
            <div>
              <span>Why it is interesting</span>
              <strong>Research priority</strong>
            </div>
            <small>{market.signalScore.toFixed(0)}/100</small>
          </div>
          <ScoreBars market={market} />
        </div>

        <div className="visualCard">
          <div className="visualHead">
            <div>
              <span>Market timeline</span>
              <strong>{daysLabel(market.daysToClose)}</strong>
            </div>
            <small>{market.phase}</small>
          </div>
          <MarketTimeline market={market} />
        </div>

        <div className="visualCard">
          <div className="visualHead">
            <div>
              <span>YES price history</span>
              <strong>SignalDesk snapshots</strong>
            </div>
            <small>{history.length} point{history.length === 1 ? "" : "s"}</small>
          </div>
          <PriceSparkline points={history} />
        </div>

        <div className="visualCard">
          <div className="visualHead">
            <div>
              <span>Recent trade flow</span>
              <strong>{yesFlowPercent == null ? "No flow yet" : yesFlowPercent + "% YES"}</strong>
            </div>
            <small>{activity?.tradeCount ?? 0} trades</small>
          </div>

          {yesFlowPercent == null ? (
            <div className="chartEmpty">No recent Panta trade flow to chart.</div>
          ) : (
            <>
              <div className="flowBar" aria-label="Recent YES versus NO trade flow">
                <div style={{width: yesFlowPercent + "%"}} />
              </div>
              <div className="flowLabels">
                <span>YES {yesFlowPercent}%</span>
                <span>NO {100 - yesFlowPercent}%</span>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function ScoreBars({market}: {market: SignalMarket}) {
  const rows = [
    {label: "Activity", value: market.liquidityScore},
    {label: "Uncertainty", value: market.disagreementScore},
    {label: "Timing", value: market.timingScore},
  ];

  return (
    <div className="scoreBars">
      {rows.map((row) => (
        <div className="scoreBarRow" key={row.label}>
          <div className="scoreBarLabel">
            <span>{row.label}</span>
            <strong>{Math.round(row.value)}</strong>
          </div>
          <div className="scoreBarTrack">
            <div style={{width: Math.max(0, Math.min(100, row.value)) + "%"}} />
          </div>
        </div>
      ))}
    </div>
  );
}

function MarketTimeline({market}: {market: SignalMarket}) {
  const start = epochMs(market.startTime);
  const end = epochMs(market.endTime ?? market.resolutionTime);
  const now = Date.now();

  if (start == null || end == null || end <= start) {
    return <div className="chartEmpty">Panta did not provide a complete timeline.</div>;
  }

  const progress = Math.max(0, Math.min(100, ((now - start) / (end - start)) * 100));

  return (
    <div className="timelineChart">
      <div className="timelineTrack">
        <div style={{width: progress + "%"}} />
        <span style={{left: progress + "%"}} />
      </div>
      <div className="timelineLabels">
        <span>Opened<br /><b>{shortDate(start)}</b></span>
        <span>Now</span>
        <span>Closes<br /><b>{shortDate(end)}</b></span>
      </div>
    </div>
  );
}

function epochMs(value?: number | string) {
  if (value == null) return null;
  if (typeof value === "number") return value > 10_000_000_000 ? value : value * 1000;
  const numeric = Number(value);
  if (Number.isFinite(numeric)) return numeric > 10_000_000_000 ? numeric : numeric * 1000;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function shortDate(ms: number) {
  return new Intl.DateTimeFormat("en-US", {month: "short", day: "numeric"}).format(new Date(ms));
}

function PriceSparkline({points}: {points: PricePoint[]}) {
  if (points.length < 2) {
    return (
      <div className="chartEmpty">
        Collecting real price snapshots. Refresh later to build the line.
      </div>
    );
  }

  const values = points.map((point) => point.yes);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const spread = Math.max(max - min, 0.02);
  const width = 320;
  const height = 110;
  const pad = 8;

  const coords = points.map((point, index) => {
    const x =
      pad +
      (index / Math.max(points.length - 1, 1)) *
        (width - pad * 2);
    const normalized = (point.yes - (min - spread * 0.08)) / (spread * 1.16);
    const y = height - pad - normalized * (height - pad * 2);
    return {x, y};
  });

  const path = coords
    .map((point, index) => (index === 0 ? "M" : "L") + point.x.toFixed(1) + " " + point.y.toFixed(1))
    .join(" ");

  return (
    <div className="sparklineWrap">
      <svg className="sparkline" viewBox={"0 0 " + width + " " + height} preserveAspectRatio="none">
        <line x1="0" y1={height / 2} x2={width} y2={height / 2} className="sparkGrid" />
        <path d={path} className="sparkPath" />
        {coords.map((point, index) => (
          <circle
            key={points[index].at}
            cx={point.x}
            cy={point.y}
            r={index === coords.length - 1 ? 3.5 : 2}
            className="sparkPoint"
          />
        ))}
      </svg>
      <div className="sparkMeta">
        <span>{Math.round(values[0] * 100)}%</span>
        <strong>{Math.round(values.at(-1)! * 100)}% now</strong>
      </div>
    </div>
  );
}

function SimpleResearchBrief({brief}: {brief: SimpleBrief}) {
  return (
    <div className="simpleBrief">
      <div className="briefHero">
        <div>
          <div className="briefKicker">Bottom line</div>
          <h3>{brief.title}</h3>
        </div>
        <span className={"confidence confidence" + brief.confidence}>
          Evidence: {brief.confidence}
        </span>
      </div>

      <p className="bottomLine">{brief.bottomLine}</p>

      <details className="deepDive">
        <summary>See evidence & details</summary>
        <div className="deepDiveBody">
          {!!brief.keyPoints.length && (
            <div className="briefSection">
              <h4>What matters</h4>
              <div className="simpleBullets">
                {brief.keyPoints.map((point, index) => (
                  <div key={index}>
                    <span>{index + 1}</span>
                    <p>{point}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="uncertaintyBox">
            <span>?</span>
            <div>
              <strong>Biggest uncertainty</strong>
              <p>{brief.uncertainty}</p>
            </div>
          </div>

          {!!brief.watch.length && (
            <div className="briefSection">
              <h4>Watch next</h4>
              <div className="watchGrid">
                {brief.watch.map((item, index) => (
                  <div key={index}>{item}</div>
                ))}
              </div>
            </div>
          )}
        </div>
      </details>
    </div>
  );
}

function sourceDomain(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "Source";
  }
}

function Metric({value, label}: {value: string; label: string}) {
  return (
    <div className="metric">
      <strong>{value}</strong>
      <span>{label}</span>
    </div>
  );
}
