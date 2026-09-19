# Coin Panorama Design

## Goal

Add a third trading workspace named `币种全景` to `trading.858846.xyz`. It provides a consistent, searchable, sortable market-wide snapshot of Binance USDⓈ-M perpetual symbols and a shareable single-symbol panorama without changing the existing aggregate dashboard or BTC/ETH/SOL evidence workspace.

## Approved Product Direction

Use the approved **full-width professional screener** layout.

- The primary surface is a dense all-symbol table optimized for comparison and ranking.
- Selecting a row opens a fixed-width detail drawer on desktop.
- Selecting a row opens a full-screen detail view on narrow/mobile screens with an explicit return action.
- The URL reflects the workspace and symbol as `?view=panorama&symbol=BTC`, allowing reloads and shared links to restore the same context.
- The new workspace uses the existing dark and warm-gray light themes and the current bottom workspace navigation pattern.

## Workspace Navigation

The bottom workspace navigation contains three entries in this order:

1. `聚合看板`
2. `BTC / ETH / SOL 看盘`
3. `币种全景`

Changing workspaces must not restart unrelated market polling or erase the state of the other views. A valid panorama URL opens the panorama workspace directly. An invalid or unavailable symbol opens the panorama list without a detail drawer and presents a non-blocking explanation.

## Data Sources and Fallback Rules

The panorama covers Binance USDⓈ-M perpetual contracts that pass the existing symbol eligibility rules.

Binance public endpoints provide the baseline fields for every supported symbol:

- current price;
- current notional open interest;
- funding rate;
- 24-hour quote volume;
- 24-hour price change;
- historical price and open-interest changes for 15m, 30m, 1h, 4h, 8h, 12h, and 24h.

Coinalyze enriches symbols it covers with:

- cross-exchange open interest;
- account long/short ratio;
- taker or active net flow;
- liquidations.

When Coinalyze does not cover a symbol, Binance fields remain visible and enrichment fields are marked unavailable. Missing values are never converted to zero, inferred, or synthesized. Each field or group exposes its source and coverage status.

## Unified Snapshot Architecture

The Worker owns snapshot collection and normalization. Browsers do not independently combine Binance and Coinalyze responses.

Add a panorama endpoint with two modes:

- `GET /api/panorama` returns the current normalized list snapshot.
- `GET /api/panorama?symbol=BTC` returns the selected symbol's multi-period detail snapshot.

The existing Durable Object stores the panorama snapshot using stable list and symbol keys. It coalesces refreshes so visitors within one refresh window receive the same timestamp and ordering inputs. The target refresh interval is 60 seconds, subject to upstream availability and free-source rate limits.

Multi-period calculations use aligned time boundaries for 15m, 30m, 1h, 4h, 8h, 12h, and 24h. Every response includes:

- `updatedAt` for the unified snapshot;
- source and coverage metadata;
- a stale indicator when a previous successful snapshot is served;
- nullable enrichment fields when unavailable.

The list payload contains enough normalized data for client-side search, filtering, sorting, and period switching without triggering a new API request for every interaction. Symbol detail may be fetched when a row is opened and cached by the Worker for the same refresh window.

## Screener Table

The panorama header contains search, filters, selected period, snapshot status, and a concise data-coverage legend.

The table shows:

- symbol;
- current price;
- 24-hour price change;
- current open interest;
- open-interest change for the selected period;
- funding rate;
- 24-hour quote volume;
- active net flow;
- long/short ratio;
- liquidations;
- data completeness.

Default ordering is current open interest descending. Numeric columns support ascending and descending order. Null values always sort after available values in both directions. Sorting is stable, using OI rank and then symbol as deterministic tie-breakers.

The first release includes these controls:

- symbol search;
- OI rank range;
- price-change range;
- OI-change range;
- funding-rate range;
- 24-hour volume range;
- data completeness: all, complete Coinalyze coverage, or partially missing;
- selected period: 15m, 30m, 1h, 4h, 8h, 12h, or 24h.

Search, filters, period, and sorting operate on the current unified snapshot. A 60-second refresh preserves every control and the selected symbol.

## Symbol Detail

The desktop drawer and mobile full-screen view use the same data model and rendering components. They show:

- current price, OI, funding rate, 24-hour volume, long/short ratio, and liquidations;
- multi-period price change;
- multi-period OI change;
- multi-period active net flow;
- period-by-period direction classification;
- source, coverage, snapshot time, and stale state.

Unavailable enrichment metrics display `—` with a source-coverage explanation. The detail view does not silently fall back to a different calculation definition. Closing the desktop drawer or returning on mobile removes `symbol` from the URL while retaining `view=panorama` and the current screener state.

## Responsive Behavior

Desktop uses the full-width table and a right-side drawer that does not destroy list scroll position. The drawer has its own scrolling region.

On narrow/mobile screens:

- opening a symbol replaces the table with a full-screen detail surface inside the workspace;
- a visible return action restores the same list scroll position and controls;
- the symbol column and essential context remain available while metric columns can scroll horizontally;
- horizontal scrolling is confined to the table, and the document itself does not exceed the viewport;
- touch targets and the existing theme control remain usable at approximately 390 px width.

## Loading, Stale, and Error States

Initial loading uses the existing theme-aware skeleton style. During refresh, the current snapshot stays visible and receives an updating indicator rather than being cleared.

If an upstream source fails:

- serve the last successful snapshot when available;
- mark it stale and retain its original `updatedAt`;
- identify which source is delayed;
- keep search, sorting, filters, and detail navigation usable.

If no snapshot exists, show a recoverable error state within the panorama workspace only. The aggregate and BTC/ETH/SOL workspaces continue operating independently.

## Accessibility

- The workspace tab, period controls, filters, sortable headers, rows, drawer, close/return actions, and theme toggle must be keyboard accessible.
- Sortable headers expose their state through `aria-sort`.
- The desktop drawer uses an accessible label and returns focus to the originating row when closed.
- Status changes use restrained live-region announcements without announcing every data cell.
- Positive and negative values use text/arrows in addition to color.

## Verification

Automated contract and browser checks must verify:

- the third workspace exists and deep links restore it;
- list snapshots are deterministic across simultaneous clients;
- default and user-selected sorting are correct, including null placement;
- every approved filter and search works alone and in combination;
- all seven periods update the period-dependent columns;
- BTC, ETH, SOL, and a non-major supported symbol open valid details;
- a symbol without Coinalyze coverage shows Binance metrics and unavailable enrichment rather than zeroes;
- refresh preserves filters, sorting, list position, and selected symbol;
- stale and no-cache error states are isolated to the panorama workspace;
- dark, warm-gray light, and automatic themes render correctly;
- desktop and approximately 390 px mobile layouts avoid document-level horizontal overflow;
- the existing aggregate and BTC/ETH/SOL tests continue to pass;
- production responses share a current unified timestamp and the page reports no console errors.

## Deployment Constraints

Deployment continues through `wrangler.trading.toml`. It must use only the user-scoped `CLOUDFLARE_API_TOKEN_LUOWENHUI` and Cloudflare Account ID `7722052fdf1845b1b5e987938bb735f3`. Do not log in to or switch to the `rowanwebber` account. The existing `COINALYZE_API_KEY` Worker secret is reused; no key is exposed to browser code or logs.

## Out of Scope

- Spot markets, delivery futures, options, or non-Binance symbol discovery.
- Account-specific positions, orders, alerts, or trading actions.
- Cross-device synchronization of screener preferences.
- Paid data sources or synthetic estimates for unavailable enrichment.
- Redesigning the existing two workspaces beyond adding the third navigation entry.
