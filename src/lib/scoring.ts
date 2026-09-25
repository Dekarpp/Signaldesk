import type {PantaMarket, SignalMarket} from "./types";

const clamp = (n: number, min = 0, max = 100) => Math.max(min, Math.min(max, n));

function toNumber(value?: string | null) {
  const n = Number(value ?? NaN);
  return Number.isFinite(n) ? n : null;
}

export function scoreMarket(market: PantaMarket, nowSec = Date.now() / 1000): SignalMarket {
  const volume = Number(market.volumeUsdc ?? 0) || 0;
  const yes = toNumber(market.yesPrice ?? market.primaryYesPrice ?? market.secondaryYesPrice);
  const no = toNumber(market.noPrice ?? market.primaryNoPrice ?? market.secondaryNoPrice);

  const liquidityScore = clamp(Math.log10(volume + 1) * 24);
  const disagreementScore = yes == null ? 35 : clamp(100 - Math.abs(yes - 0.5) * 200);

  const end = market.endTime ?? market.resolutionTime;
  let timingScore = 45;
  if (end) {
    const days = (end - nowSec) / 86400;
    if (days < 0) timingScore = 10;
    else if (days <= 2) timingScore = 90;
    else if (days <= 14) timingScore = 100;
    else if (days <= 45) timingScore = 80;
    else if (days <= 120) timingScore = 60;
    else timingScore = 35;
  }

  const phaseBonus = market.phase === "secondary" ? 8 : market.phase === "primary" ? 5 : -25;
  const signalScore = clamp(
    liquidityScore * 0.42 +
      disagreementScore * 0.33 +
      timingScore * 0.25 +
      phaseBonus,
  );

  return {
    ...market,
    volume,
    yes,
    no,
    liquidityScore,
    disagreementScore,
    timingScore,
    signalScore,
  };
}
