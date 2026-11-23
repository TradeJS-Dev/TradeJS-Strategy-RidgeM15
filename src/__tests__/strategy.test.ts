import {
  RidgeM15StrategyDefinition as portfolio,
  strategyEntries,
} from "../index";
import type { PortfolioEntryCandidate } from "@tradejs/types";

const regular: PortfolioEntryCandidate = {
  id: "regular",
  strategy: "TrendFollow",
  symbol: "ETHUSDT",
  direction: "LONG",
  stop: 90,
  targets: [120],
  gate: {
    approved: true,
    reason: null,
    rawQuality: 4,
    explicitHardBlock: false,
  },
};
const extra: PortfolioEntryCandidate = {
  ...regular,
  id: "extra",
  strategy: "TradingPatterns",
  symbol: "SOLUSDT",
  gate: {
    approved: false,
    reason: "AI_QUALITY_BELOW_MIN (2 < 4)",
    rawQuality: 2,
    explicitHardBlock: false,
  },
};
const candle = {
  timestamp: 900_000,
  open: 100,
  close: 103,
  high: 104,
  low: 99,
  volume: 1,
  turnover: 1,
};

it("registers one strategy with the six original child packages", () => {
  expect(strategyEntries).toEqual([
    expect.objectContaining({
      kind: "portfolio",
      manifest: { name: "RidgeM15" },
    }),
  ]);
  const sources = portfolio.resolveChildren(portfolio.parseConfig({}));
  expect(
    sources.map(({ entry, config }) => [entry.manifest.name, config.INTERVAL]),
  ).toEqual([
    ["TrendFollow", "15"],
    ["DoubleTap", "15"],
    ["HeadAndShoulders", "15"],
    ["LiquidityTails", "15"],
    ["TradingPatterns", "60"],
    ["TrendShift", "15"],
  ]);
  expect(
    sources.every(
      ({ config }) =>
        config.AI_ENABLED === true && config.MAX_LOSS_VALUE === 10,
    ),
  ).toBe(true);
  expect(() => portfolio.parseConfig({ INTERVAL: "60" })).toThrow();
});

it("keeps a hard-blocked signal out of both lists", () => {
  const blocked = {
    ...extra,
    gate: { ...extra.gate, explicitHardBlock: true },
  };
  const result = portfolio.selectEntries({
    closedAt: 900_000,
    candidates: [blocked, regular],
    market: { candle: () => candle },
  });
  expect(result).toEqual({ ranked: ["regular"], pending: [] });
});

it("checks the closed M15 and sizes the extra trade with its stop costs", () => {
  const input = {
    candidate: extra,
    candle,
    openingPrice: 100,
    minNetRewardToRisk: 1,
  };
  const fill = portfolio.confirmEntry(input);
  expect(fill?.risk).toBe(5);
  expect(fill!.qty).toBeCloseTo(5 / 10.1425011, 8);
  expect(
    portfolio.confirmEntry({ ...input, candle: { ...candle, low: 90 } }),
  ).toBeNull();
  expect(
    portfolio.confirmEntry({ ...input, minNetRewardToRisk: 2 }),
  ).toBeNull();
});

it("skips only candidates missing their own feature history", () => {
  const ready = { ...regular, id: "ready", symbol: "BNBUSDT" };
  const result = portfolio.selectEntries({
    closedAt: 900_000,
    candidates: [regular, ready],
    market: {
      candle: (symbol, ago) =>
        symbol === regular.symbol && ago === 96 ? undefined : candle,
    },
  });
  expect(result).toEqual({ ranked: ["ready"], pending: [] });
});

it("queues the qualifying TradingPatterns short for the next M15 close", () => {
  const eligible: PortfolioEntryCandidate = {
    ...extra,
    direction: "SHORT",
    stop: 110,
    targets: [80],
    gate: { ...extra.gate, rawQuality: 3 },
  };
  const tooLow = {
    ...eligible,
    id: "too-low",
    gate: { ...eligible.gate, rawQuality: 1 },
  };
  const multipleTargets = { ...eligible, id: "multi", targets: [85, 80] };
  expect(
    portfolio.selectEntries({
      closedAt: 900_000,
      candidates: [eligible, tooLow, multipleTargets],
      market: { candle: () => ({ ...candle, close: 100 }) },
    }),
  ).toEqual({
    ranked: [],
    pending: [{ candidateId: eligible.id, confirmAt: 1_800_000 }],
  });
});

it("breaks equal scores by symbol within one source strategy", () => {
  const first = { ...regular, id: "first", symbol: "BTCUSDT" };
  expect(
    portfolio.selectEntries({
      closedAt: 900_000,
      candidates: [regular, first],
      market: { candle: () => candle },
    }).ranked,
  ).toEqual(["first", "regular"]);
});
