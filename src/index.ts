import { defineStrategyPlugin } from "@tradejs/core/config";
import { createCostIsolatedStrategyConfigParser } from "@tradejs/strategy-kit/config";
import type { StrategyConfig, StrategyRegistryEntry } from "@tradejs/types";
import { sourceDefinitions, resolveSources } from "./children";
import {
  allowsException,
  candidateFeatures,
  confirmationDue,
  confirmsEntry,
  frozenSettings,
  hasCapacity,
  rankCandidates,
  scoreCandidate,
  sizeConfirmedEntry,
} from "./policy";

const defaults: StrategyConfig = {
  ...sourceDefinitions.TrendFollow.defaults,
  INTERVAL: "15",
  AI_ENABLED: false,
};

export const RidgeM15StrategyDefinition = {
  manifest: { name: "RidgeM15" },
  defaults,
  parseConfig: createCostIsolatedStrategyConfigParser({
    strategyName: "RidgeM15",
    defaults,
  }),
  createCore() {
    throw new Error(
      "RidgeM15 requires a host that coordinates a portfolio decision tick",
    );
  },
  portfolio: {
    resolveSources,
    settings: frozenSettings,
    candidateFeatures,
    scoreCandidate,
    allowsException,
    rankCandidates,
    confirmationDue,
    confirmsEntry,
    sizeConfirmedEntry,
    hasCapacity,
  },
} satisfies StrategyRegistryEntry & { portfolio: object };

export const strategyEntries = [RidgeM15StrategyDefinition];

export default defineStrategyPlugin({ strategyEntries });
export type { Candidate, RankedCandidate } from "./policy";
