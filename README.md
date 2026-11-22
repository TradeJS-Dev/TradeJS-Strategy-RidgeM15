# RidgeM15

`@tradejs/strategy-ridge-m15` is a composite strategy for TradeJS. It collects signals from TrendFollow, DoubleTap, HeadAndShoulders, LiquidityTails, TradingPatterns, and TrendShift. TradingPatterns evaluates native one-hour candles and the other five strategies evaluate 15-minute candles.

Ridge estimates net return per unit of risk. The strategy ranks candidates from the same decision time across all symbols and gives priority to signals accepted by the original filters. It can also admit a TradingPatterns signal rejected for a low AI-gate score if the original quality is at least 2, there is no structural block, and Ridge predicts at least 0.5 R.

An additional entry waits for a full 15-minute confirmation candle. Its body must point in the direction of the trade, and the candle must stay inside the original stop and target. The strategy rechecks the shared position limit and net reward-to-risk ratio at the next open. The replay profile uses 10 USDT of risk for regular entries and sizes each extra entry for 5 USDT inclusive of estimated fees and slippage at the stop. The position limit is three across the portfolio and one per symbol.

## Replay a deployment

Use a TradeJS build with the portfolio strategy API. Install the package in
TradeJS Project and add `@tradejs/strategy-ridge-m15` to the strategy plugins.
Add one enabled strategy to a replay deployment in `tradejs.config.ts`.

```ts
strategies: {
  RidgeM15: { enabled: true, config: {} },
}
```

Run the replay from TradeJS Project with the prepared market snapshot.

```bash
yarn replay --deployment ridge-m15-replay --cacheOnly \
  --portfolioSnapshot data/research/ridge-m15-snapshot \
  --portfolioOutput output/ridge-m15.json
```

The snapshot contains a `window.json` file, 15-minute and hourly Bybit candle
files, and historical funding. The result names each trade's originating
strategy and includes timestamps, prices, quantity, and realized costs.

The supported runtime is historical replay. Live execution needs a
portfolio-aware signals runner.

The model in `src/model.json` is the frozen research artifact with SHA-256 `f3f15135d56df9b03bfa7c7a47763cb65c6ef61736fb515dc19316c4af975970`. Weights are fixed. TradeJS Project resolves the precise versions of the six strategy packages and their peers.

## Package checks

Run `yarn checks` from this repository with Core and Types from the portfolio API build. It checks formatting, types, the admission and sizing rules, and the ESM and CommonJS builds.
