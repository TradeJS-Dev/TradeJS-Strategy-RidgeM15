import { DoubleTapStrategyDefinition } from "@tradejs/strategy-double-tap";
import { HeadAndShouldersStrategyDefinition } from "@tradejs/strategy-head-and-shoulders";
import { LiquidityTailsStrategyDefinition } from "@tradejs/strategy-liquidity-tails";
import { TradingPatternsStrategyDefinition } from "@tradejs/strategy-trading-patterns";
import { TrendFollowStrategyDefinition } from "@tradejs/strategy-trend-follow";
import { TrendShiftStrategyDefinition } from "@tradejs/strategy-trend-shift";
import type { StrategyRegistryEntry } from "@tradejs/types";
import frozenChildren from "./children-config.json";
import { sourceNames, type SourceName } from "./policy";

export const sourceDefinitions: Record<SourceName, StrategyRegistryEntry> = {
  TrendFollow: TrendFollowStrategyDefinition,
  DoubleTap: DoubleTapStrategyDefinition,
  HeadAndShoulders: HeadAndShouldersStrategyDefinition,
  LiquidityTails: LiquidityTailsStrategyDefinition,
  TradingPatterns: TradingPatternsStrategyDefinition,
  TrendShift: TrendShiftStrategyDefinition,
};

export function resolveSources(environment: "PARITY", risk: number) {
  return sourceNames.map((name) => {
    const entry = sourceDefinitions[name];
    const config = entry.parseConfig({
      ...frozenChildren[name],
      ENV: environment,
      MAKE_ORDERS: true,
      MAX_LOSS_VALUE: risk,
    });
    return { name, entry, config };
  });
}
