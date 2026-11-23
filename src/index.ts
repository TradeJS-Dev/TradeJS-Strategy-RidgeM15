import {
  definePortfolioStrategy,
  defineStrategyPlugin,
} from "@tradejs/core/config";
import {
  createCostIsolatedStrategyConfigParser,
  StrategyConfigValidationError,
} from "@tradejs/strategy-kit/config";
import type { PortfolioEntryCandidate, StrategyConfig } from "@tradejs/types";
import { resolveSources } from "./children";
import {
  allowsException,
  candidateFeatures,
  confirmsEntry,
  frozenSettings,
  m15,
  rankCandidates,
  scoreCandidate,
  sizeConfirmedEntry,
  sourceNames,
  type Candidate,
  type SourceName,
} from "./policy";

const defaults: StrategyConfig = {
  INTERVAL: "15",
  UNIVERSE: "crypto",
  MAX_LOSS_VALUE: 10,
};

const baseParser = createCostIsolatedStrategyConfigParser({
  strategyName: "RidgeM15",
  defaults,
});

function modelCandidate(candidate: PortfolioEntryCandidate): Candidate {
  const strategy = candidate.strategy as SourceName;
  if (!sourceNames.includes(strategy)) {
    throw new Error(`Unexpected RidgeM15 child: ${candidate.strategy}`);
  }
  return {
    strategy,
    symbol: candidate.symbol,
    direction: candidate.direction,
    stop: candidate.stop,
    target: candidate.targets[0] ?? NaN,
    ...candidate.gate,
  };
}

export const RidgeM15StrategyDefinition = definePortfolioStrategy({
  manifest: { name: "RidgeM15" },
  defaults,
  parseConfig(input) {
    const config = baseParser(input);
    if (
      config.INTERVAL !== "15" ||
      config.UNIVERSE !== "crypto" ||
      !Number.isFinite(config.MAX_LOSS_VALUE) ||
      config.MAX_LOSS_VALUE <= 0
    ) {
      throw new StrategyConfigValidationError("RidgeM15", [
        "RidgeM15 requires crypto, a 15-minute base interval and positive MAX_LOSS_VALUE",
      ]);
    }
    return config;
  },
  resolveChildren(config) {
    return resolveSources("PARITY", config.MAX_LOSS_VALUE);
  },
  execution: frozenSettings,
  selectEntries({ candidates, market, closedAt }) {
    const ranked = rankCandidates(
      candidates.flatMap((candidate) => {
        const model = modelCandidate(candidate);
        if (!Number.isFinite(model.stop) || !Number.isFinite(model.target)) {
          return [{ ...model, candidate, score: -Infinity }];
        }
        const features = candidateFeatures(
          model,
          (ago) => market.candle(model.symbol, ago),
          (ago) => market.candle("BTCUSDT", ago),
        );
        return features
          ? [{ ...model, candidate, score: scoreCandidate(features) }]
          : [];
      }),
    );
    return {
      ranked: ranked
        .filter((candidate) => candidate.approved)
        .map(({ candidate }) => candidate.id),
      pending: ranked
        .filter(
          (candidate) =>
            candidate.candidate.targets.length === 1 &&
            allowsException(candidate),
        )
        .map(({ candidate }) => ({
          candidateId: candidate.id,
          confirmAt: closedAt + m15,
        })),
    };
  },
  confirmEntry({ candidate, candle, openingPrice, minNetRewardToRisk }) {
    const model = modelCandidate(candidate);
    if (!confirmsEntry(model, candle)) return null;
    const sized = sizeConfirmedEntry(
      model,
      openingPrice,
      minNetRewardToRisk,
      frozenSettings,
    );
    return sized ? { qty: sized.qty, risk: frozenSettings.extraRisk } : null;
  },
});

export const strategyEntries = [RidgeM15StrategyDefinition];
export default defineStrategyPlugin({ strategyEntries });
