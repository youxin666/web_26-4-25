const key = process.env.COINALYZE_API_KEY;
if (!key) throw new Error('COINALYZE_API_KEY is missing from this process');

const response = await fetch('https://api.coinalyze.net/v1/future-markets', { headers: { api_key: key } });
if (!response.ok) throw new Error(`Coinalyze ${response.status}`);
const markets = await response.json();
const exchanges = ['A', '6', '3'];
const assets = ['BTC', 'ETH', 'SOL'];
const selected = assets.flatMap(asset => exchanges.map(exchange => markets.find(market =>
  market.base_asset === asset && market.exchange === exchange && market.is_perpetual && market.margined === 'STABLE' && /USDT/.test(market.symbol)
)).filter(Boolean));
if (selected.length !== 9) throw new Error(`Expected 9 selected markets, received ${selected.length}`);
console.log(selected.map(item => `${item.base_asset} ${item.exchange} ${item.symbol}`).join('\n'));
