import model from "./model.json";

export const m15 = 900_000;
export const sourceNames = [
  "TrendFollow",
  "DoubleTap",
  "HeadAndShoulders",
  "LiquidityTails",
  "TradingPatterns",
  "TrendShift",
] as const;

export type SourceName = (typeof sourceNames)[number];
type Direction = "LONG" | "SHORT";

interface Bar {
  open: number;
  close: number;
  high: number;
  low: number;
  turnover: number;
}

export interface Candidate {
  strategy: SourceName;
  symbol: string;
  direction: Direction;
  stop: number;
  target: number;
  approved: boolean;
  reason?: string | null;
  rawQuality?: number | null;
  explicitHardBlock?: boolean;
}

export interface RankedCandidate extends Candidate {
  score: number;
}

export interface RidgeSettings {
  feeRate: number;
  slippageBps: number;
  extraRisk: number;
  maxPositions: number;
}

export const frozenSettings: RidgeSettings = {
  feeRate: 0.00055,
  slippageBps: 2,
  extraRisk: 5,
  maxPositions: 3,
};

const sideOf = (direction: Direction) => (direction === "LONG" ? 1 : -1);
const ordinal = new Map<string, number>(
  sourceNames.map((name, index) => [name, index]),
);

export function candidateFeatures(
  candidate: Candidate,
  symbolBar: (barsAgo: number) => Bar,
  bitcoinBar: (barsAgo: number) => Bar,
): number[] {
  const current = symbolBar(0);
  const side = sideOf(candidate.direction);
  const trend = (bar: (barsAgo: number) => Bar, ago: number) =>
    Math.log(bar(0).close / bar(ago).close);
  let recentTurnover = 0;
  for (let ago = 16; ago >= 1; ago--) {
    recentTurnover += symbolBar(ago).turnover;
  }
  return [
    ...sourceNames.map((name) => Number(name === candidate.strategy)),
    side,
    ...sourceNames.map((name) => (name === candidate.strategy ? side : 0)),
    Math.log1p(
      100 * (Math.abs(current.close - candidate.stop) / current.close),
    ),
    Math.log1p(
      100 * (Math.abs(current.close - candidate.target) / current.close),
    ),
    side * trend(bitcoinBar, 16),
    side * trend(bitcoinBar, 96),
    side * (trend(symbolBar, 16) - trend(bitcoinBar, 16)),
    side * (trend(symbolBar, 96) - trend(bitcoinBar, 96)),
    (current.high - current.low) / current.close,
    Math.log1p(current.turnover / Math.max(1, recentTurnover / 16)),
  ];
}

export function scoreCandidate(features: readonly number[]): number {
  if (
    features.length !== model.mean.length ||
    !features.every(Number.isFinite)
  ) {
    throw new Error("RidgeM15 received invalid model features");
  }
  return features.reduce(
    (score, value, index) =>
      score +
      (model.coefficients[index + 1]! * (value - model.mean[index]!)) /
        model.scale[index]!,
    model.coefficients[0]!,
  );
}

export function allowsException(candidate: RankedCandidate): boolean {
  return (
    !candidate.approved &&
    candidate.strategy === "TradingPatterns" &&
    candidate.reason?.startsWith("AI_QUALITY_BELOW_MIN (") === true &&
    (candidate.rawQuality ?? -Infinity) >= 2 &&
    candidate.explicitHardBlock === false &&
    Number.isFinite(candidate.score) &&
    candidate.score >= model.threshold
  );
}

export function rankCandidates<T extends RankedCandidate>(
  candidates: T[],
): T[] {
  return [...candidates].sort(
    (a, b) =>
      Number(b.approved) - Number(a.approved) ||
      b.score - a.score ||
      ordinal.get(a.strategy)! - ordinal.get(b.strategy)! ||
      a.symbol.localeCompare(b.symbol),
  );
}

export function confirmsEntry(candidate: Candidate, bar: Bar): boolean {
  const side = sideOf(candidate.direction);
  const adverse = side > 0 ? bar.low : bar.high;
  const favorable = side > 0 ? bar.high : bar.low;
  return (
    side * (bar.close - bar.open) > 0 &&
    side * (adverse - candidate.stop) > 0 &&
    side * (candidate.target - favorable) > 0
  );
}

export function sizeConfirmedEntry(
  candidate: Candidate,
  openingPrice: number,
  minNetRR: number,
  settings: RidgeSettings,
): { loss: number; qty: number } | undefined {
  const { direction, stop, target } = candidate;
  const side = sideOf(direction);
  const slip = settings.slippageBps / 10_000;
  const entry = openingPrice * (1 + side * slip);
  const stopped = stop * (1 - side * slip);
  const taken = target * (1 - side * slip);
  const loss = side * (entry - stopped) + settings.feeRate * (entry + stopped);
  const reward = side * (taken - entry) - settings.feeRate * (entry + taken);
  const qty = settings.extraRisk / loss;
  if (
    [entry, loss, reward, qty, stop, target].every(Number.isFinite) &&
    stop > 0 &&
    target > 0 &&
    side * (entry - stop) > 0 &&
    loss > 0 &&
    reward / loss > Math.max(0, minNetRR || 0)
  ) {
    return { loss, qty };
  }
}
