export const DEFAULT_PANORAMA_QUERY = { search:'', period:'4h', completeness:'all', sortKey:'currentOi', sortDirection:'desc' };
const valueFor = (asset, key, period) => key === 'oiPercent' ? asset.periods?.[period]?.oiPercent : asset[key];
const inRange = (value, min, max) => min == null && max == null ? true : value != null && (min == null || value >= min) && (max == null || value <= max);

export function filterPanoramaAssets(assets, query) {
  const search = String(query.search || '').trim().toUpperCase();
  return assets.filter(asset => (!search || asset.symbol.includes(search)) &&
    (query.completeness === 'all' || asset.completeness === query.completeness) &&
    inRange(asset.oiRank, query.rankMin, query.rankMax) &&
    inRange(asset.price24hPercent, query.priceMin, query.priceMax) &&
    inRange(asset.periods?.[query.period]?.oiPercent, query.oiMin, query.oiMax) &&
    inRange(asset.fundingRate, query.fundingMin, query.fundingMax) &&
    inRange(asset.volume24hUsd, query.volumeMin, query.volumeMax));
}

export function sortPanoramaAssets(assets, key, direction, period = '4h') {
  const sign = direction === 'asc' ? 1 : -1;
  return assets.map((asset,index)=>({asset,index})).sort((a,b) => {
    const av=valueFor(a.asset,key,period), bv=valueFor(b.asset,key,period);
    if (av == null && bv != null) return 1;
    if (av != null && bv == null) return -1;
    if (av !== bv) return (typeof av === 'string' ? av.localeCompare(bv) : av - bv) * sign;
    return a.asset.oiRank - b.asset.oiRank || a.asset.symbol.localeCompare(b.asset.symbol) || a.index-b.index;
  }).map(item=>item.asset);
}
