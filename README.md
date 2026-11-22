# RidgeM15

`@tradejs/strategy-ridge-m15` is a composite strategy for TradeJS. It collects signals from TrendFollow, DoubleTap, HeadAndShoulders, LiquidityTails, TradingPatterns, and TrendShift. TradingPatterns evaluates native one-hour candles and the other five strategies evaluate 15-minute candles.

Ridge estimates net return per unit of risk. The strategy ranks candidates from the same decision time across all symbols and gives priority to signals accepted by the original filters. It can also admit a TradingPatterns signal rejected for a low AI-gate score if the original quality is at least 2, there is no structural block, and Ridge predicts at least 0.5 R.

An additional entry waits for a full 15-minute confirmation candle. Its body must point in the direction of the trade, and the candle must stay inside the original stop and target. The strategy rechecks the shared position limit and net reward-to-risk ratio at the next open. The replay profile uses 10 USDT of risk for regular entries and sizes each extra entry for 5 USDT inclusive of estimated fees and slippage at the stop. The position limit is three across the portfolio and one per symbol.

## Run the research build

Use the portfolio replay harness with the module exported in `strategyEntries` as `RidgeM15`. Its `portfolio` field exposes the frozen rules and child definitions to the host. The host supplies the closed-candle batch, child strategy runtimes and execution. The current single-symbol TradeJS runner has no batch handoff and rejects the strategy at initialization.

The model in `src/model.json` is the frozen research artifact with SHA-256 `f3f15135d56df9b03bfa7c7a47763cb65c6ef61736fb515dc19316c4af975970`. Weights are fixed. TradeJS Project resolves the precise versions of the six strategy packages and their peers.

## Package checks

Run `yarn checks` from this repository. It checks formatting, types, the admission and sizing rules, and the ESM and CommonJS builds.
