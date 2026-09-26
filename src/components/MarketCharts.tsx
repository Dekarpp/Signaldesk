"use client";

import type {SignalMarket} from "@/lib/types";

export type ChartPricePoint = {
  at: number;
  yes: number;
};

export type EvidenceSignal =
  | "leans_yes"
  | "balanced"
  | "leans_no"
  | "unclear"
  | "not_assessed";

type ActivitySummary = {
  tradeCount: number;
  yesFlow: number;
  noFlow: number;
};

const percent = (value: number | null) =>
  value == null ? "—" : Math.round(value * 100) + "%";

const money = (value: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);

function closeLabel(days: number | null) {
  if (days == null) return "No deadline";
  if (days < 0) return "Closed";
  if (days < 1) return "Today";
  if (days < 2) return "1 day";
  if (days < 30) return Math.ceil(days) + " days";
  return Math.ceil(days / 30) + " mo";
}

export function CurrentQuotesChart({
  market,
  activity,
  activityLoading,
  priceDelta,
}: {
  market: SignalMarket;
  activity: ActivitySummary | null;
  activityLoading: boolean;
  priceDelta?: number;
}) {
  const hasPrice = market.yes != null && market.no != null;
  const yesPct = market.yes == null ? null : Math.round(market.yes * 100);
  const noPct = market.no == null ? null : Math.round(market.no * 100);
  const change =
    typeof priceDelta === "number" && Math.abs(priceDelta) >= 0.0001
      ? priceDelta * 100
      : null;

  return (
    <section className="terminalChart quoteTerminal" aria-label="Current Panta quotes">
      <div className="terminalChartHead">
        <div>
          <span className="terminalEyebrow">Current quotes</span>
          <h3>Panta market pricing</h3>
        </div>
        <div className={"livePricePill " + (hasPrice ? "isLive" : "")}>
          <i />
          {hasPrice ? "LIVE PRICE" : "NO LIVE PRICE"}
        </div>
      </div>

      <div className="quoteCards">
        <div className="quoteSide quoteYes">
          <div className="quoteSideHead">
            <span>YES</span>
            {change != null && (
              <small className={change >= 0 ? "quoteUp" : "quoteDown"}>
                {change >= 0 ? "▲ " : "▼ "}
                {Math.abs(change).toFixed(1)} pts
              </small>
            )}
          </div>
          <strong>{percent(market.yes)}</strong>
          <div className="quoteMiniTrack">
            <div style={{width: (yesPct ?? 0) + "%"}} />
          </div>
          <small>Market-implied YES</small>
        </div>

        <div className="quoteVs">VS</div>

        <div className="quoteSide quoteNo">
          <div className="quoteSideHead">
            <span>NO</span>
          </div>
          <strong>{percent(market.no)}</strong>
          <div className="quoteMiniTrack quoteMiniTrackNo">
            <div style={{width: (noPct ?? 0) + "%"}} />
          </div>
          <small>Market-implied NO</small>
        </div>
      </div>

      <div className={"quoteBalance " + (!hasPrice ? "quoteBalanceEmpty" : "")}>
        {hasPrice ? (
          <>
            <div className="quoteBalanceYes" style={{width: (yesPct ?? 0) + "%"}} />
            <span className="quoteBalanceMid" />
          </>
        ) : (
          <span className="quoteBalanceMessage">
            Panta is not publishing executable YES/NO pricing for this market right now.
          </span>
        )}
      </div>

      <div className="terminalStats">
        <div>
          <span>Money traded</span>
          <strong>{money(market.volume)}</strong>
        </div>
        <div>
          <span>Time left</span>
          <strong>{closeLabel(market.daysToClose)}</strong>
        </div>
        <div>
          <span>Recent trades</span>
          <strong>{activityLoading ? "…" : String(activity?.tradeCount ?? 0)}</strong>
        </div>
        <div>
          <span>Priority</span>
          <strong>{Math.round(market.signalScore)}/100</strong>
        </div>
      </div>
    </section>
  );
}

export function MarketVsEvidenceChart({
  marketYes,
  signal,
  strength,
}: {
  marketYes: number | null;
  signal: EvidenceSignal;
  strength: "Low" | "Medium" | "High";
}) {
  const evidencePosition =
    signal === "leans_no"
      ? 18
      : signal === "leans_yes"
        ? 82
        : signal === "balanced"
          ? 50
          : null;

  const evidenceLabel =
    signal === "leans_yes"
      ? "Leans YES"
      : signal === "leans_no"
        ? "Leans NO"
        : signal === "balanced"
          ? "Balanced"
          : signal === "not_assessed"
            ? "Neutral factual view"
            : "Unclear";

  return (
    <div className="marketEvidenceChart" aria-label="Market versus evidence comparison">
      <div className="marketEvidenceLegend">
        <span><i className="legendMarket" /> Market {marketYes == null ? "—" : Math.round(marketYes * 100) + "% YES"}</span>
        <span><i className="legendEvidence" /> Evidence · {evidenceLabel}</span>
      </div>

      {signal === "not_assessed" ? (
        <div className="neutralEvidenceState">
          Directional evidence scoring is disabled for political markets.
        </div>
      ) : (
        <>
          <div className="marketEvidencePlot">
            <div className="marketEvidenceGrid">
              <i />
              <i />
              <i />
              <i />
              <i />
            </div>
            <div className="marketEvidenceTrack">
              <span className="marketEvidenceZone marketEvidenceNo">NO</span>
              <span className="marketEvidenceZone marketEvidenceBalanced">BALANCED</span>
              <span className="marketEvidenceZone marketEvidenceYes">YES</span>

              {marketYes != null && (
                <div
                  className="comparisonPoint comparisonPointMarket"
                  style={{left: Math.max(2, Math.min(98, marketYes * 100)) + "%"}}
                >
                  <b>{Math.round(marketYes * 100)}%</b>
                  <small>Market</small>
                </div>
              )}

              {evidencePosition != null && (
                <div
                  className="comparisonPoint comparisonPointEvidence"
                  style={{left: evidencePosition + "%"}}
                >
                  <b>{evidenceLabel}</b>
                  <small>{strength} evidence</small>
                </div>
              )}
            </div>
          </div>
          <div className="marketEvidenceAxis">
            <span>0%</span>
            <span>25%</span>
            <span>50%</span>
            <span>75%</span>
            <span>100%</span>
          </div>
        </>
      )}

      <p className="marketEvidenceFoot">
        Market is a Panta price. Evidence is a qualitative research direction — not a second probability forecast.
      </p>
    </div>
  );
}

export function PriceHistoryChart({
  points,
}: {
  points: ChartPricePoint[];
}) {
  if (points.length < 2) {
    return (
      <div className="priceHistoryEmpty">
        <div className="emptyChartGrid">
          <i /><i /><i /><i />
        </div>
        <strong>Building real price history</strong>
        <span>
          SignalDesk only plots observed Panta snapshots. Refresh later to extend the line.
        </span>
      </div>
    );
  }

  const values = points.map((point) => point.yes);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const spread = Math.max(max - min, 0.02);
  const width = 640;
  const height = 190;
  const padX = 20;
  const padY = 18;

  const coords = points.map((point, index) => {
    const x =
      padX +
      (index / Math.max(points.length - 1, 1)) *
        (width - padX * 2);
    const paddedMin = min - spread * 0.12;
    const paddedMax = max + spread * 0.12;
    const normalized = (point.yes - paddedMin) / (paddedMax - paddedMin);
    const y = height - padY - normalized * (height - padY * 2);
    return {x, y};
  });

  const line = coords
    .map((point, index) =>
      (index === 0 ? "M" : "L") +
      point.x.toFixed(1) +
      " " +
      point.y.toFixed(1),
    )
    .join(" ");

  const area =
    line +
    " L " +
    coords.at(-1)!.x.toFixed(1) +
    " " +
    (height - padY) +
    " L " +
    coords[0].x.toFixed(1) +
    " " +
    (height - padY) +
    " Z";

  const start = values[0];
  const end = values.at(-1)!;
  const delta = (end - start) * 100;

  return (
    <div className="priceHistoryChart">
      <div className="priceHistoryMeta">
        <div>
          <span>Observed YES</span>
          <strong>{Math.round(end * 100)}%</strong>
        </div>
        <small className={delta >= 0 ? "quoteUp" : "quoteDown"}>
          {delta >= 0 ? "▲ " : "▼ "}
          {Math.abs(delta).toFixed(1)} pts
        </small>
      </div>

      <svg
        viewBox={"0 0 " + width + " " + height}
        preserveAspectRatio="none"
        role="img"
        aria-label="Observed Panta YES price history"
      >
        {[0.25, 0.5, 0.75].map((fraction) => (
          <line
            key={fraction}
            x1={padX}
            x2={width - padX}
            y1={padY + (height - padY * 2) * fraction}
            y2={padY + (height - padY * 2) * fraction}
            className="terminalGridLine"
          />
        ))}
        <path d={area} className="historyArea" />
        <path d={line} className="historyLine" />
        {coords.map((point, index) => (
          <circle
            key={points[index].at}
            cx={point.x}
            cy={point.y}
            r={index === coords.length - 1 ? 4.2 : 2.1}
            className="historyPoint"
          />
        ))}
      </svg>

      <div className="priceHistoryLabels">
        <span>{new Date(points[0].at).toLocaleTimeString([], {hour: "2-digit", minute: "2-digit"})}</span>
        <span>SignalDesk snapshots</span>
        <span>{new Date(points.at(-1)!.at).toLocaleTimeString([], {hour: "2-digit", minute: "2-digit"})}</span>
      </div>
    </div>
  );
}
