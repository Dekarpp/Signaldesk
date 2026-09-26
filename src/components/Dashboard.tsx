"use client";

import {useEffect, useMemo, useState} from "react";
import type {SignalMarket} from "@/lib/types";
import TractionPanel from "@/components/TractionPanel";
import {
  CurrentQuotesChart,
  MarketVsEvidenceChart,
  PriceHistoryChart,
} from "@/components/MarketCharts";
import {trackSession, trackTraction, tractionClientId} from "@/lib/traction-client";

type MarketsResponse = {
  markets: SignalMarket[];
  fetchedAt: string;
  mode: "test" | "live";
  sandbox: boolean;
  categories: string[];
  dataQuality?: {
    catalogItemsFetched: number;
    catalogPagesFetched: number;
    currentOrUpcoming: number;
    recentlyClosed: number;
    withReadableTitle: number;
    withReportedVolume: number;
    reportedVolumeUsdc: number;
    volumeCoveragePct: number;
    executionReady: number;
  };
  error?: string;
};

type Citation = {title: string; url: string};

type DecisionLens = {
  signal: "leans_yes" | "balanced" | "leans_no" | "unclear" | "not_assessed";
  strength: "Low" | "Medium" | "High";
  summary: string;
  supporting: string[];
  counter: string[];
  changesView: string[];
};

type SimpleBrief = {
  title: string;
  bottomLine: string;
  keyPoints: string[];
  uncertainty: string;
  watch: string[];
  confidence: "Low" | "Medium" | "High";
  decision: DecisionLens;
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

const oracleSourceNames = (oracle?: string) =>
  String(oracle ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean)
    .map((item) => {
      const raw = item.split("-").at(-1) ?? item;
      if (raw.toLowerCase() === "premiumtimes") return "Premium Times";
      return raw.replace(/\b\w/g, (c) => c.toUpperCase());
    });

const marketLabel = (market: SignalMarket) => {
  const title = market.title?.trim();
  if (title) return title;
  return "Market question unavailable";
};

const marketDescription = (market: SignalMarket) => {
  const description = market.description?.trim();
  if (description) return description;

  const sources = oracleSourceNames(market.oracle);
  if (sources.length) {
    return "Panta has not provided readable question text yet. Sources: " +
      sources.slice(0, 4).join(", ") +
      ".";
  }

  return "Panta has not provided readable question text for this market yet.";
};

const marketResearchReady = (market: SignalMarket) =>
  Boolean(market.title?.trim()) ||
  Boolean(market.description?.trim()) ||
  Boolean(market.images?.[0]);

const politicalMarket = (market: SignalMarket) => {
  const text = [
    market.category,
    market.title,
    market.description,
    market.question,
    market.oracle,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  return /\b(politic|election|electoral|candidate|president|prime minister|parliament|congress|senate|senator|governor|mayor|referendum|ballot|democrat|republican|labour|conservative|party leader|cabinet|government vote)\b/.test(text);
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
        const preferred =
          (json.markets as SignalMarket[]).find(
            (market) =>
              (market.daysToClose ?? -1) >= 0 &&
              marketResearchReady(market) &&
              !politicalMarket(market),
          ) ??
          (json.markets as SignalMarket[]).find(
            (market) =>
              (market.daysToClose ?? -1) >= 0 &&
              marketResearchReady(market),
          ) ??
          json.markets[0];

        setSelected((current) => {
          if (!current) return preferred;
          return json.markets.find((m: SignalMarket) => m.marketId === current.marketId) ?? preferred;
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
      if (sort === "volume") {
        const availableDelta =
          Number(b.volumeAvailable) - Number(a.volumeAvailable);
        if (availableDelta !== 0) return availableDelta;
        return b.volume - a.volume;
      }
      if (sort === "deadline") {
        return (a.daysToClose ?? Number.MAX_SAFE_INTEGER) -
          (b.daysToClose ?? Number.MAX_SAFE_INTEGER);
      }

      const researchReadyDelta =
        Number(marketResearchReady(b)) - Number(marketResearchReady(a));
      if (researchReadyDelta !== 0) return researchReadyDelta;

      const nonPoliticalDelta =
        Number(!politicalMarket(b)) - Number(!politicalMarket(a));
      if (nonPoliticalDelta !== 0) return nonPoliticalDelta;

      return b.signalScore - a.signalScore;
    });

    return items;
  }, [data, query, category, phase, sort, watchlist, watchlistOnly]);

  const currentMarketCount =
    data?.markets.filter(
      (market) =>
        (market.phase === "primary" || market.phase === "secondary") &&
        (market.daysToClose ?? -1) >= 0,
    ).length ?? 0;

  const currentFiltered = filtered.filter(
    (market) =>
      (market.phase === "primary" || market.phase === "secondary") &&
      (market.daysToClose ?? -1) >= 0,
  );

  const recentlyClosedFiltered = filtered
    .filter(
      (market) =>
        !(
          (market.phase === "primary" || market.phase === "secondary") &&
          (market.daysToClose ?? -1) >= 0
        ) &&
        (
          market.daysToClose == null
            ? market.phase === "resolved" || market.phase === "cancelled"
            : market.daysToClose < 0 && market.daysToClose >= -30
        ),
    )
    .sort(
      (a, b) =>
        (b.daysToClose ?? Number.NEGATIVE_INFINITY) -
        (a.daysToClose ?? Number.NEGATIVE_INFINITY),
    );

  const phaseValues = useMemo(
    () =>
      [...new Set((data?.markets ?? []).map((market) => market.phase).filter(Boolean))]
        .sort(),
    [data],
  );

  const highestPriority =
    data?.markets.length
      ? Math.max(...data.markets.map((market) => market.signalScore))
      : null;

  const selectedFilteredIndex = selected
    ? filtered.findIndex((market) => market.marketId === selected.marketId)
    : -1;
  const previousMarket =
    selectedFilteredIndex > 0 ? filtered[selectedFilteredIndex - 1] : null;
  const nextMarket =
    selectedFilteredIndex >= 0 && selectedFilteredIndex < filtered.length - 1
      ? filtered[selectedFilteredIndex + 1]
      : null;

  function chooseMarket(market: SignalMarket, scrollToResearch = true) {
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

    if (scrollToResearch) {
      const fullCatalog =
        typeof document !== "undefined"
          ? document.querySelector<HTMLDetailsElement>(".allCatalog")
          : null;
      if (fullCatalog) fullCatalog.open = false;

      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          document.getElementById("research")?.scrollIntoView({
            behavior: "smooth",
            block: "start",
          });
        });
      });
    }
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

  const researchAvailable = selected ? marketResearchReady(selected) : false;

  const moveAvailable =
    Boolean(selected) &&
    (
      Math.abs(priceDeltas[selected!.marketId] ?? 0) >= 0.0001 ||
      (activity?.tradeCount ?? 0) > 0
    );

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
            <div className="eyebrow">Market vs evidence</div>
            <h1>Market signals. Real evidence. Better decisions.</h1>
            <p className="sub heroCopy">
              SignalDesk turns Panta prices into a fast decision-support view:
              market odds, evidence direction, counterevidence, and what could change the picture.
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
          <Metric value={String(currentMarketCount)} label="current" />
          <Metric value={String(data?.markets.length ?? 0)} label="catalog" />
          <Metric
            value={
              (data?.dataQuality?.withReportedVolume ?? 0) > 0
                ? usd(data?.dataQuality?.reportedVolumeUsdc ?? 0)
                : "—"
            }
            label={
              "reported volume · " +
              String(data?.dataQuality?.volumeCoveragePct ?? 0) +
              "% coverage"
            }
          />
          <Metric value={highestPriority == null ? "—" : highestPriority.toFixed(0)} label="highest priority" />
        </div>
      </section>

      {error && <div className="error">{error}</div>}

      <section className="scannerHeader" id="markets">
        <div className="scannerTitle">
          <div>
            <div className="eyebrow">Choose a market</div>
            <h2>Markets to explore</h2>
          </div>
          <div className="scannerToggles">
            <button
              className={"btn watchlistToggle " + (watchlistOnly ? "watching" : "")}
              onClick={() => setWatchlistOnly((value) => !value)}
              aria-pressed={watchlistOnly}
            >
              ★ Watchlist · {watchlist.length}
            </button>
          </div>
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
            <option value="all">All statuses</option>
            {phaseValues.map((item) => (
              <option value={item} key={item}>{item}</option>
            ))}
          </select>
          <select className="select" value={sort} onChange={(event) => setSort(event.target.value as typeof sort)}>
            <option value="signal">Sort: useful now</option>
            <option value="volume">Sort: volume</option>
            <option value="deadline">Sort: deadline</option>
          </select>
        </div>
      </section>

      <section className="catalogSection">
        <div className="catalogSectionHead">
          <div>
            <div className="eyebrow">Live now</div>
            <h2>Current markets</h2>
            <p className="sub">Open Panta markets that can still change.</p>
          </div>
          <span className="catalogCount">{currentFiltered.length}</span>
        </div>

        <div className="marketGrid">
          {currentFiltered.map((market) => (
            <MarketCard
              key={market.marketId}
              market={market}
              selectedId={selected?.marketId ?? null}
              watchlist={watchlist}
              priceDelta={priceDeltas[market.marketId]}
              onSelect={chooseMarket}
            />
          ))}

          {!loading && !currentFiltered.length && (
            <div className="empty cardEmpty">
              {watchlistOnly
                ? "No current watched markets match these filters."
                : "No current markets match these filters."}
            </div>
          )}
        </div>
      </section>

      {!!recentlyClosedFiltered.length && (
        <section className="catalogSection">
          <div className="catalogSectionHead">
            <div>
              <div className="eyebrow">Recent outcomes</div>
              <h2>Recently closed</h2>
              <p className="sub">Useful for reviewing how markets resolved and how SignalDesk reads completed events.</p>
            </div>
            <span className="catalogCount">{recentlyClosedFiltered.length}</span>
          </div>

          <div className="compactMarketList">
            {recentlyClosedFiltered.slice(0, 8).map((market) => (
              <CompactMarketRow
                key={market.marketId}
                market={market}
                onSelect={chooseMarket}
              />
            ))}
          </div>
        </section>
      )}

      <details className="allCatalog">
        <summary>
          <div>
            <div className="eyebrow">Full Panta catalog</div>
            <strong>All Panta markets</strong>
            <span>Browse every catalog row returned by the API, including older and incomplete markets.</span>
          </div>
          <span className="catalogCount">{filtered.length}</span>
        </summary>

        <div className="compactMarketList allCatalogList">
          {filtered.map((market) => (
            <CompactMarketRow
              key={market.marketId}
              market={market}
              onSelect={chooseMarket}
            />
          ))}
          {!loading && !filtered.length && (
            <div className="empty">No Panta markets match these filters.</div>
          )}
        </div>
      </details>

      {selected && (
        <section className="drawer" id="research">
          <div className="researchNavigator">
            <button
              className="researchNavBtn"
              disabled={!previousMarket}
              onClick={() => previousMarket && chooseMarket(previousMarket, false)}
            >
              <span>←</span>
              <b>Previous</b>
            </button>

            <button
              className="researchNavCenter"
              onClick={() =>
                document.getElementById("markets")?.scrollIntoView({
                  behavior: "smooth",
                  block: "start",
                })
              }
            >
              <span>Markets</span>
              <small>
                {selectedFilteredIndex >= 0
                  ? String(selectedFilteredIndex + 1) + " / " + String(filtered.length)
                  : String(filtered.length) + " markets"}
              </small>
            </button>

            <button
              className="researchNavBtn researchNavNext"
              disabled={!nextMarket}
              onClick={() => nextMarket && chooseMarket(nextMarket, false)}
            >
              <b>Next</b>
              <span>→</span>
            </button>
          </div>

          <div className="drawerGrid">
            <div>
              <div className="eyebrow">Simple research</div>
              <h2>{marketLabel(selected)}</h2>
              <p className="sub">
                {marketDescription(selected)}
              </p>

              <MarketVisual market={selected} variant="hero" />

              {!selected.title?.trim() && selected.images?.[0] && (
                <div className="small mediaNote">
                  Panta returned the market question as image metadata; SignalDesk can inspect it before research.
                </div>
              )}

              <MarketSnapshot
                market={selected}
                activity={activity}
                activityLoading={activityLoading}
                history={priceHistory[selected.marketId] ?? []}
                priceDelta={priceDeltas[selected.marketId]}
              />

              <div className="controls researchActions">
                <button
                  className="btn primary"
                  onClick={() => runResearch("research")}
                  disabled={analysisLoading || !researchAvailable}
                >
                  {analysisLoading ? "Checking sources…" : "Analyze the evidence"}
                </button>
                <button
                  className="btn"
                  onClick={() => runResearch("move")}
                  disabled={analysisLoading || !moveAvailable}
                  title={moveAvailable ? "Research plausible drivers of the observed move" : "Available after SignalDesk observes a price move or recent Panta trades"}
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

              {!researchAvailable && (
                <div className="dataNotice">
                  Panta has not supplied enough question metadata to research this market safely yet.
                </div>
              )}

              <div className={"analysis simpleAnalysis " + (brief ? "filled" : "")}>
                {brief ? (
                  <SimpleResearchBrief brief={brief} marketYes={selected.yes} />
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

            <details className="advancedPanel developerPanel">
              <summary>
                <span>Panta API</span>
                <strong>Integration demo</strong>
                <small>For judges & developers · wallet, quote, unsigned build</small>
              </summary>
              <div className="quoteBox">
              <p className="developerIntro">
                Advanced Panta integration. This is not needed for the main research experience.
              </p>
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

function MarketVisual({
  market,
  variant,
}: {
  market: SignalMarket;
  variant: "card" | "thumb" | "hero";
}) {
  const [imageFailed, setImageFailed] = useState(false);
  const image = market.images?.[0];
  const category = String(market.category ?? "market").toLowerCase();
  const label = marketLabel(market);

  const categoryMark =
    category.includes("gaming")
      ? "GAME"
      : category.includes("weather")
        ? "WX"
        : category.includes("politic")
          ? "CIVIC"
          : category.includes("crypto")
            ? "CRYPTO"
            : category.includes("stock")
              ? "MARKET"
              : category.includes("finance")
                ? "FIN"
                : category.includes("commod")
                  ? "METALS"
                  : category.includes("sport")
                    ? "SPORT"
                    : category.includes("business")
                      ? "BIZ"
                      : category.includes("world")
                        ? "WORLD"
                        : "PANTA";

  return (
    <div className={"marketVisual marketVisual-" + variant + " visual-" + category.replace(/[^a-z0-9_-]/g, "-")}>
      {image && !imageFailed ? (
        <img
          src={image}
          alt={label}
          loading={variant === "hero" ? "eager" : "lazy"}
          onError={() => setImageFailed(true)}
        />
      ) : (
        <div className="marketVisualFallback" aria-label={category + " market visual"}>
          <span>{categoryMark}</span>
          <i />
          <i />
          <i />
        </div>
      )}
      {variant !== "thumb" && (
        <div className="marketVisualShade">
          <span>{market.category ?? "Panta market"}</span>
          {image && !imageFailed ? <small>Image from Panta</small> : <small>SignalDesk visual</small>}
        </div>
      )}
    </div>
  );
}

function MarketCard({
  market,
  selectedId,
  watchlist,
  priceDelta,
  onSelect,
}: {
  market: SignalMarket;
  selectedId: string | null;
  watchlist: string[];
  priceDelta?: number;
  onSelect: (market: SignalMarket) => void;
}) {
  return (
    <button
      className={"marketCard " + (selectedId === market.marketId ? "selected" : "")}
      onClick={() => onSelect(market)}
    >
      <MarketVisual market={market} variant="card" />
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

      <div
        className={"probabilityBar " + (market.yes == null ? "noPrice" : "")}
        aria-label={market.yes == null ? "No live market price" : "Market-implied probability"}
      >
        <div style={{width: market.yes == null ? "0%" : String(Math.round(market.yes * 100)) + "%"}} />
        {market.yes == null && <span>No live price</span>}
      </div>

      <div className="simpleStats">
        <div><span>YES</span><strong>{pct(market.yes)}</strong></div>
        <div><span>NO</span><strong>{pct(market.no)}</strong></div>
        <div><span>Closes</span><strong>{daysLabel(market.daysToClose)}</strong></div>
      </div>

      <div className="cardFooter">
        <span>{market.attentionReason}</span>
        <span>{market.volumeAvailable ? usd(market.volume) + " reported" : "Volume unavailable"}</span>
      </div>

      {typeof priceDelta === "number" && Math.abs(priceDelta) >= 0.0001 && (
        <div className={priceDelta > 0 ? "deltaUp simpleDelta" : "deltaDown simpleDelta"}>
          YES {priceDelta > 0 ? "+" : ""}{(priceDelta * 100).toFixed(1)} pts since last scan
        </div>
      )}
    </button>
  );
}

function CompactMarketRow({
  market,
  onSelect,
}: {
  market: SignalMarket;
  onSelect: (market: SignalMarket) => void;
}) {
  return (
    <button className="compactMarketRow" onClick={() => onSelect(market)}>
      <MarketVisual market={market} variant="thumb" />
      <div className="compactMarketMain">
        <div className="compactTags">
          <span>{market.category ?? "market"}</span>
          <span>{market.phase}</span>
        </div>
        <strong>{marketLabel(market)}</strong>
      </div>
      <div className="compactMarketStats">
        <span>YES <b>{pct(market.yes)}</b></span>
        <span>{daysLabel(market.daysToClose)}</span>
        <span>{market.volumeAvailable ? usd(market.volume) : "Volume —"}</span>
      </div>
    </button>
  );
}

function MarketSnapshot({
  market,
  activity,
  activityLoading,
  history,
  priceDelta,
}: {
  market: SignalMarket;
  activity: MarketActivity | null;
  activityLoading: boolean;
  history: PricePoint[];
  priceDelta?: number;
}) {
  const totalFlow = (activity?.yesFlow ?? 0) + (activity?.noFlow ?? 0);
  const yesFlowPercent =
    totalFlow > 0 ? Math.round(((activity?.yesFlow ?? 0) / totalFlow) * 100) : null;

  return (
    <div className="snapshot snapshotTerminal">
      <CurrentQuotesChart
        market={market}
        activity={activity}
        activityLoading={activityLoading}
        priceDelta={priceDelta}
      />

      <div className="visualGrid terminalVisualGrid">
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

        {history.length >= 2 && (
          <div className="visualCard visualCardWide priceHistoryPanel">
            <div className="visualHead">
              <div>
                <span>YES price history</span>
                <strong>Real observed Panta snapshots</strong>
              </div>
              <small>{history.length} points</small>
            </div>
            <PriceHistoryChart points={history} />
          </div>
        )}

        {yesFlowPercent != null && (
          <div className="visualCard">
            <div className="visualHead">
              <div>
                <span>Recent trade flow</span>
                <strong>{yesFlowPercent}% YES</strong>
              </div>
              <small>{activity?.tradeCount ?? 0} trades</small>
            </div>
            <div className="flowBar" aria-label="Recent YES versus NO trade flow">
              <div style={{width: yesFlowPercent + "%"}} />
            </div>
            <div className="flowLabels">
              <span>YES {yesFlowPercent}%</span>
              <span>NO {100 - yesFlowPercent}%</span>
            </div>
          </div>
        )}

        {(history.length < 2 || yesFlowPercent == null) && (
          <div className={"dataAvailability " + (history.length < 2 && yesFlowPercent == null ? "dataAvailabilityWide" : "")}>
            <div>
              <span>Data availability</span>
              <strong>
                {history.length < 2 && yesFlowPercent == null
                  ? "No chartable history or recent trade flow"
                  : history.length < 2
                    ? "Price history is still building"
                    : "No recent Panta trade flow"}
              </strong>
            </div>
            <small>
              SignalDesk only draws charts from observed Panta data. Missing data is never simulated.
            </small>
          </div>
        )}
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

function SimpleResearchBrief({
  brief,
  marketYes,
}: {
  brief: SimpleBrief;
  marketYes: number | null;
}) {
  return (
    <div className="simpleBrief">
      <DecisionLensCard decision={brief.decision} marketYes={marketYes} />

      <div className="briefHero compactBriefHero">
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
        <summary>See why</summary>
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

          <DecisionEvidence decision={brief.decision} />

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

function DecisionLensCard({
  decision,
  marketYes,
}: {
  decision: DecisionLens;
  marketYes: number | null;
}) {
  const label =
    decision.signal === "leans_yes"
      ? "Evidence leans YES"
      : decision.signal === "leans_no"
        ? "Evidence leans NO"
        : decision.signal === "balanced"
          ? "Evidence is balanced"
          : decision.signal === "not_assessed"
            ? "Neutral factual view"
            : "Evidence is unclear";

  return (
    <div className={"decisionLens decision-" + decision.signal}>
      <div className="decisionLensTop">
        <div>
          <div className="briefKicker">Decision lens</div>
          <h3>{label}</h3>
        </div>
        <span className={"decisionStrength strength" + decision.strength}>
          {decision.strength} evidence
        </span>
      </div>

      <MarketVsEvidenceChart
        marketYes={marketYes}
        signal={decision.signal}
        strength={decision.strength}
      />

      <p>{decision.summary}</p>
      <div className="decisionNote">
        This is an evidence summary, not a trade recommendation or a forecast guarantee.
      </div>
    </div>
  );
}

function DecisionEvidence({decision}: {decision: DecisionLens}) {
  if (
    !decision.supporting.length &&
    !decision.counter.length &&
    !decision.changesView.length
  ) {
    return null;
  }

  return (
    <div className="decisionEvidence">
      {!!decision.supporting.length && (
        <div>
          <h4>{decision.signal === "not_assessed" ? "Key evidence" : "Supports this view"}</h4>
          {decision.supporting.map((item, index) => (
            <p key={"support-" + index}>+ {item}</p>
          ))}
        </div>
      )}

      {!!decision.counter.length && (
        <div>
          <h4>What pushes back</h4>
          {decision.counter.map((item, index) => (
            <p key={"counter-" + index}>− {item}</p>
          ))}
        </div>
      )}

      {!!decision.changesView.length && (
        <div>
          <h4>What could change the view</h4>
          {decision.changesView.map((item, index) => (
            <p key={"change-" + index}>→ {item}</p>
          ))}
        </div>
      )}
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
