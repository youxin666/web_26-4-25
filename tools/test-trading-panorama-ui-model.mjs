import assert from 'node:assert/strict';
import { filterPanoramaAssets, sortPanoramaAssets } from '../trading-public/panorama-model.js';
const assets = [
  { symbol:'BTC', oiRank:1, currentOi:10, price24hPercent:2, fundingRate:.01, volume24hUsd:100, completeness:'complete', periods:{'4h':{oiPercent:1}} },
  { symbol:'ETH', oiRank:2, currentOi:8, price24hPercent:-1, fundingRate:null, volume24hUsd:80, completeness:'partial', periods:{'4h':{oiPercent:-2}} },
  { symbol:'SOL', oiRank:3, currentOi:null, price24hPercent:5, fundingRate:.02, volume24hUsd:60, completeness:'partial', periods:{'4h':{oiPercent:3}} },
];
assert.deepEqual(filterPanoramaAssets(assets,{search:'et',period:'4h',completeness:'all'}).map(x=>x.symbol),['ETH']);
assert.deepEqual(filterPanoramaAssets(assets,{search:'',period:'4h',completeness:'complete'}).map(x=>x.symbol),['BTC']);
assert.deepEqual(sortPanoramaAssets(assets,'currentOi','asc').map(x=>x.symbol),['ETH','BTC','SOL']);
assert.deepEqual(sortPanoramaAssets(assets,'currentOi','desc').map(x=>x.symbol),['BTC','ETH','SOL']);
console.log('trading panorama UI model tests passed');
