import type {PantaMarket, SignalMarket} from "./types";

const clamp = (n: number, min = 0, max = 100) =>
  Math.max(min, Math.min(max, n));

function toNumber(value?: string | null) {
  const n = Number(value ?? NaN);
  return Number.isFinite(n) ? n : null;
}

function toEpochSeconds(value?: number | string) {
  if (value == null) return null;
  if (typeof value === "number") {
    return value > 10_000_000_000 ? value / 1000 : value;
  }

  const numeric = Number(value);
  if (Number.isFinite(numeric)) {
    return numeric > 10_000_000_000 ? numeric / 1000 : numeric;
  }

  const ms = Date.parse(value);
  return Number.isFinite(ms) ? ms / 1000 : null;
}

export function scoreMarket(
  market: PantaMarket,
  nowSec = Date.now() / 1000,
): SignalMarket {
  const activeVolume = Number(market.volumeUsdc ?? 0) || 0;
  const totalVolume = Number(market.totalVolumeUsdc ?? 0) || 0;
  const volume = Math.max(activeVolume, totalVolume);
  const yes = toNumber(
    market.yesPrice ?? market.primaryYesPrice ?? market.secondaryYesPrice,
  );
  const no = toNumber(
    market.noPrice ?? market.primaryNoPrice ?? market.secondaryNoPrice,
  );

  const liquidityScore = clamp(Math.log10(volume + 1) * 22);
  const disagreementScore =
    yes == null ? 35 : clamp(100 - Math.abs(yes - 0.5) * 200);

  const end =
    toEpochSeconds(market.endTime) ?? toEpochSeconds(market.resolutionTime);
  const daysToClose = end == null ? null : (end - nowSec) / 86_400;

  let timingScore = 45;
  if (daysToClose != null) {
    if (daysToClose < 0) timingScore = 5;
    else if (daysToClose <= 2) timingScore = 88;
    else if (daysToClose <= 14) timingScore = 100;
    else if (daysToClose <= 45) timingScore = 82;
    else if (daysToClose <= 120) timingScore = 62;
    else timingScore = 38;
  }

  const phaseBonus =
    market.phase === "secondary" ? 8 : market.phase === "primary" ? 5 : -25;

  const signalScore = clamp(
    liquidityScore * 0.4 +
      disagreementScore * 0.34 +
      timingScore * 0.26 +
      phaseBonus,
  );

  const attentionReason =
    liquidityScore >= 70
      ? "High activity"
      : disagreementScore >= 80
        ? "High uncertainty"
        : timingScore >= 85
          ? "Time-sensitive"
          : "Worth monitoring";

  return {
    ...market,
    volume,
    yes,
    no,
    liquidityScore,
    disagreementScore,
    timingScore,
    signalScore,
    daysToClose,
    attentionReason,
  };
}
