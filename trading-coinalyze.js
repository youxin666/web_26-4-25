export const COINALYZE_ASSETS = ['BTC', 'ETH', 'SOL'];
export const COINALYZE_EXCHANGES = ['A', '6', '3'];

export function selectMarkets(markets) {
  return Object.fromEntries(COINALYZE_ASSETS.map(asset => [asset,
    COINALYZE_EXCHANGES.map(exchange => markets.find(market =>
      market.base_asset === asset &&
      market.exchange === exchange &&
      market.is_perpetual === true &&
      market.margined === 'STABLE' &&
      /USDT/.test(market.symbol)
    )).filter(Boolean)
  ]));
}
