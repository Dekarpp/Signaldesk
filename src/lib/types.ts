export type PantaMarket = {
  marketId: string;
  category: string | null;
  title: string;
  description: string;
  phase: "primary" | "secondary" | "resolved" | "cancelled" | string;
  startTime?: number;
  endTime?: number;
  resolutionTime?: number;
  status?: string;
  volumeUsdc?: string;
  yesPrice?: string | null;
  noPrice?: string | null;
  primaryYesPrice?: string | null;
  primaryNoPrice?: string | null;
  secondaryYesPrice?: string | null;
  secondaryNoPrice?: string | null;
};

export type SignalMarket = PantaMarket & {
  signalScore: number;
  liquidityScore: number;
  disagreementScore: number;
  timingScore: number;
  volume: number;
  yes: number | null;
  no: number | null;
};
