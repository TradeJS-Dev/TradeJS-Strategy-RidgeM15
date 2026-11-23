# RidgeM15

`@tradejs/strategy-ridge-m15` is a TradeJS portfolio strategy for crypto markets. It collects signals from TrendFollow, DoubleTap, HeadAndShoulders, LiquidityTails, TradingPatterns, and TrendShift. TradingPatterns evaluates one-hour candles and the other five strategies evaluate 15-minute candles.

Ridge regression estimates net return per unit of risk and ranks signals from the same candle close across symbols. Signals accepted by their source filters can enter without an extra confirmation candle. RidgeM15 can also consider a TradingPatterns signal with one target that the AI gate rejected for low quality. The original quality must be at least 2, the signal must pass the structural checks, and Ridge must estimate a net return of at least 0.5 times the initial risk.

An additional entry waits for the next 15-minute candle to close in the trade direction without touching the stop or target. At the following open, the portfolio checks available capacity and requires the reward-to-risk ratio after costs to exceed the source strategy's minimum. Regular entries use `MAX_LOSS_VALUE`, which defaults to 10 USDT. Additional entries size for 5 USDT of risk including estimated costs at the stop. The portfolio allows three open positions and one per symbol.

The model weights are fixed. The SHA-256 of `src/model.json` is `f3f15135d56df9b03bfa7c7a47763cb65c6ef61736fb515dc19316c4af975970`.

## Connect to TradeJS Project

Use TradeJS with the portfolio strategy API. This version of RidgeM15 requires `@tradejs/core` and `@tradejs/types` at `3.1.29-beta.307`. TradeJS Project supplies the exact package versions listed in `peerDependencies`.

Install the package from a build of this repository. Add `@tradejs/strategy-ridge-m15` to the top-level `strategies` list in `tradejs.config.ts`. Inside the deployment's `strategies` map, enable one entry.

```ts
RidgeM15: { enabled: true, config: {} },
```

## Replay a deployment

Use a deployment with RidgeM15 as its only enabled strategy. Run the replay from TradeJS Project with a prepared Bybit USDT market snapshot. Replace `ridge-m15-replay` with your deployment ID and choose an output path that does not already exist.

```bash
yarn replay --deployment ridge-m15-replay --cacheOnly \
  --portfolioSnapshot data/research/ridge-m15-snapshot \
  --portfolioOutput output/ridge-m15.json
```

The snapshot contains a `window.json` file, 15-minute and hourly Bybit candle
files, and historical funding. The result names each trade's originating
strategy and includes timestamps, prices, quantity, and realized costs.

## Run in shadow mode

Configure a separate Bybit deployment with an explicit list of USDT contracts. Run this command from TradeJS Project with that deployment's ID.

```bash
yarn exec tradejs signals-daemon --deployment ridge-m15-shadow --portfolioShadow
```

The daemon evaluates signals after candle close and tracks pending confirmations and simulated occupancy across restarts. Shadow mode records entry decisions and places no exchange orders. The package currently supports historical replay and shadow mode.

## Package checks

Run `yarn install --immutable` and `yarn checks` from this repository. The checks cover formatting, types, strategy tests, and the ESM and CommonJS builds. After building, run `yarn pack --out ridge-m15.tgz` to create an archive you can install in TradeJS Project.
