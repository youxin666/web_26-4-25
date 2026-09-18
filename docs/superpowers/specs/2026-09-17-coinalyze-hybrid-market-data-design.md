# Coinalyze 混合市场数据设计

日期：2026-09-17

## 目标

在现有 BTC / ETH / SOL 看盘中，用 Coinalyze 免费 API 补全跨交易所 OI、历史爆仓、多空比和主动买卖量/CVD，同时保留 Binance 的实时价格与资金费率。页面必须明确展示数据来源和更新时间，不把单交易所与跨交易所指标混为同一口径。

## 数据来源与口径

- Binance：实时标记价格、价格变化和当前资金费率。
- Coinalyze：支持市场的跨交易所 OI、OI 历史、买卖量、历史爆仓和多空比。
- Farside Investors：BTC、ETH 的 ETF 日度净流入；SOL 没有可靠免费数据时继续显示不可用。
- Coinalyze CVD：以各支持合约 OHLCV 中的买入量和总成交量计算 `买入量 - 卖出量`，转换为美元后跨市场汇总。
- 爆仓：以 Coinalyze `liquidation-history` 返回的多头和空头爆仓金额汇总，不再依赖浏览器上线后才开始累计的数据作为主值。

滚动周期保持 15m、30m、1h、4h、8h、12h、24h。价格变化仍以 Binance 为准；OI、资金流和爆仓改为 Coinalyze 聚合值。四象限和方向矩阵使用 Binance 价格变化与 Coinalyze OI 变化。

## 市场选择

Worker 从 Coinalyze `future-markets` 获取市场目录，筛选并固定选择：

- 基础资产为 BTC、ETH 或 SOL。
- 永续合约。
- 以稳定币或美元计价。
- Binance、Bybit、OKX 各一份 USDT 永续市场；即 BTCUSDT_PERP.A、BTCUSDT.6、BTCUSDT_PERP.3，ETH 和 SOL 使用对应市场。

目录缓存 24 小时。每个指标只汇总对应能力可用的市场，并在响应中返回覆盖市场数量，避免用缺失值冒充完整覆盖。每次刷新为 9 个市场 × OI、OHLCV、爆仓、多空比四类历史数据，共 36 个计费调用，低于免费 Key 的 40 次/分钟限制；多空比按实际支持字段的 Binance 和 Bybit 市场汇总。

## 服务端数据流

1. 浏览器只请求本站 `/api/detail`，不接触 Coinalyze API Key。
2. Worker 读取 `COINALYZE_API_KEY` Secret，向 Coinalyze 批量请求三个币种所需数据。
3. Worker 将市场级数据按基础资产和时间戳汇总，生成七个滚动周期。
4. Durable Object 保存统一快照，60 秒内所有访问者读取同一份数据。
5. Binance 浏览器采集继续负责价格和资金费率候选值；Worker 将其与 Coinalyze 聚合指标合并。

Coinalyze 免费额度为每分钟 40 次。请求按最多 20 个市场批量发送，目录长缓存、历史短缓存，且同一刷新窗口只允许一个刷新任务。不得由每个访问者分别触发一组 Coinalyze 请求。

## 快照结构

每个币种快照包含：

- `current.price`、`current.fundingRate`：Binance。
- `current.oiNotional`、`current.longShortRatio`：Coinalyze 跨市场聚合。
- `periods.*.pricePercent`：Binance。
- `periods.*.oiPercent`、`periods.*.netFlowUsd`：Coinalyze。
- `liquidations.longUsd`、`liquidations.shortUsd`：Coinalyze 24 小时历史。
- `coverage`：OI、CVD、多空比和爆仓各自覆盖的市场数。
- `sources` 与 `updatedAt`：每类数据来源及更新时间。

多空比不能直接对不同市场的比率做简单平均。使用各市场返回的多头/空头占比按对应市场 OI 权重汇总；缺少权重时该市场不进入聚合多空比。

## 页面变化

- 指标值保持现有布局。
- 数据源行改为“Coinalyze 跨交易所衍生品 + Binance 实时价格”，并链接 Coinalyze。
- OI、资金流、多空比和爆仓旁显示覆盖市场数量或在悬浮信息中展示。
- 快照过期时显示“延迟快照”，继续提供最近成功值。
- 不新增来源选择器，避免让页面复杂化。

## 异常与降级

- Coinalyze 401：视为密钥配置错误，不回退为 Binance 同名指标，继续显示最近成功的 Coinalyze 快照并标记延迟。
- Coinalyze 429：遵循 `Retry-After`，禁止密集重试。
- 部分市场失败：只汇总成功市场并降低覆盖数量。
- 全部市场失败：保留上一份有效快照；没有旧值时对应指标显示 `—`。
- Binance 失败：保留上一份价格与资金费率，并独立标记其更新时间。
- 不将浏览器累计爆仓与 Coinalyze 历史爆仓相加，防止重复计算。

## 安全

- `COINALYZE_API_KEY` 仅存在 Windows 用户环境变量与 Cloudflare Worker Secret。
- Worker 通过请求头向 Coinalyze 传递密钥，禁止放入 URL、日志、响应或前端资源。
- Cloudflare 部署仍只使用 `CLOUDFLARE_API_TOKEN_LUOWENHUI` 和 Account ID `7722052fdf1845b1b5e987938bb735f3`。

## 测试与验收

- 使用真实 Coinalyze API 验证市场发现、批量请求和字段含义。
- 单元测试覆盖市场筛选、时间序列聚合、OI 加权多空比、CVD 和七周期窗口。
- 契约测试确保响应不包含 API Key，且来源、覆盖和更新时间字段完整。
- 生产环境验证 BTC、ETH、SOL 都显示 Coinalyze 聚合数据；两个独立请求读取同一快照。
- 验证 401、429、部分市场缺失和旧快照降级。
- Playwright 检查桌面与 390px 手机布局、币种切换、七周期与来源标注。
