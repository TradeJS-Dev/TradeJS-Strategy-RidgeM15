import { RidgeM15StrategyDefinition, strategyEntries } from "../index";
import { type RankedCandidate, m15 } from "../policy";

const { portfolio } = RidgeM15StrategyDefinition;
const regular: RankedCandidate = {
  strategy: "TrendFollow",
  symbol: "ETHUSDT",
  direction: "LONG",
  stop: 90,
  target: 120,
  approved: true,
  score: -1,
};
const extra: RankedCandidate = {
  ...regular,
  strategy: "TradingPatterns",
  symbol: "SOLUSDT",
  approved: false,
  score: 0.5,
  reason: "AI_QUALITY_BELOW_MIN (2 < 4)",
  rawQuality: 2,
  explicitHardBlock: false,
};
const confirmation = {
  open: 100,
  close: 103,
  high: 104,
  low: 99,
  turnover: 1,
};

describe("RidgeM15", () => {
  it("exports one entry and resolves the six original child packages", () => {
    expect(strategyEntries.map((entry) => entry.manifest.name)).toEqual([
      "RidgeM15",
    ]);
    const sources = portfolio.resolveSources("PARITY", 10);
    expect(sources.map(({ name, config }) => [name, config.INTERVAL])).toEqual([
      ["TrendFollow", "15"],
      ["DoubleTap", "15"],
      ["HeadAndShoulders", "15"],
      ["LiquidityTails", "15"],
      ["TradingPatterns", "60"],
      ["TrendShift", "15"],
    ]);
    expect(sources.every(({ config }) => config.AI_ENABLED === true)).toBe(
      true,
    );
    expect(sources.every(({ config }) => config.MAX_LOSS_VALUE === 10)).toBe(
      true,
    );
  });

  it("ranks the simultaneous market batch with regular signals first", () => {
    const higher = { ...regular, symbol: "BTCUSDT", score: 0.1 };
    const offers = [extra, regular, higher];
    expect(portfolio.rankCandidates(offers)).toEqual([higher, regular, extra]);
    expect(offers).toEqual([extra, regular, higher]);
    expect(portfolio.hasCapacity(new Set(["ETHUSDT"]), 1, "ETHUSDT", 3)).toBe(
      false,
    );
    expect(portfolio.hasCapacity(new Set(), 3, "ETHUSDT", 3)).toBe(false);
  });

  it("admits only a sufficiently scored soft TradingPatterns gate rejection", () => {
    expect(portfolio.allowsException(extra)).toBe(true);
    expect(portfolio.allowsException({ ...extra, score: 0.49 })).toBe(false);
    expect(portfolio.allowsException({ ...extra, rawQuality: 1 })).toBe(false);
    expect(
      portfolio.allowsException({ ...extra, strategy: "TrendShift" }),
    ).toBe(false);
    expect(
      portfolio.allowsException({ ...extra, explicitHardBlock: true }),
    ).toBe(false);
  });

  it("waits for the next M15 bar and declines an entry on stop or target touch", () => {
    expect(portfolio.confirmationDue(0, 3 * m15, extra, 1)).toBe(2 * m15);
    expect(portfolio.confirmationDue(0, 2 * m15, extra, 1)).toBeUndefined();
    expect(portfolio.confirmationDue(0, 3 * m15, extra, 2)).toBeUndefined();
    expect(portfolio.confirmsEntry(extra, confirmation)).toBe(true);
    expect(
      portfolio.confirmsEntry(extra, { ...confirmation, low: extra.stop }),
    ).toBe(false);
    expect(
      portfolio.confirmsEntry(extra, { ...confirmation, high: extra.target }),
    ).toBe(false);
    expect(
      portfolio.confirmsEntry(
        { ...extra, direction: "SHORT", stop: 120, target: 90 },
        { ...confirmation, open: 103, close: 100 },
      ),
    ).toBe(true);
  });

  it("sizes a delayed fill at five USDT inclusive of stop execution costs", () => {
    const { settings } = portfolio;
    const fill = portfolio.sizeConfirmedEntry(extra, 100, 1, settings);
    expect(fill?.loss).toBeCloseTo(10.1425011, 5);
    expect(fill!.qty * fill!.loss).toBeCloseTo(5);
    expect(
      portfolio.sizeConfirmedEntry(extra, 100, 2, settings),
    ).toBeUndefined();
  });
});
