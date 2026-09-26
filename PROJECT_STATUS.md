# SignalDesk — Project Status

_Last updated: 2026-09-25_

## Product

SignalDesk is a decision-support layer for Panta prediction markets.

Core value proposition:

> **Panta shows what the market thinks. SignalDesk shows what the current evidence says.**

The main user flow is intentionally simple:

1. Choose a current Panta market.
2. See the Panta-implied YES/NO view and market visuals.
3. Click **Analyze the evidence**.
4. Compare **Market vs Evidence**.
5. Read the short bottom line.
6. Open **See why** only when more detail is needed.
7. Review sources, counterevidence, uncertainty, and what could change the view.

SignalDesk does not auto-trade and does not present the evidence lens as a guaranteed forecast.

## Repository / Production

- GitHub: `Dekarpp/Signaldesk`
- Branch: `main`
- Production: https://signaldesk-henna.vercel.app
- Vercel project: `signaldesk`
- GitHub Actions: production build check on pushes / PRs
- Repository: public
- License: MIT

## Video-ready UX state

The product has completed the pre-video UX pass:

- the dashboard is organized into **Current markets**, **Recently closed**, and a collapsible **All Panta markets** catalog
- default selection prefers a current, research-ready, non-political market
- incomplete Panta metadata is shown honestly instead of invented
- blank market titles fall back to useful category / oracle-source labels
- Panta-provided market images are used when available; category-based SignalDesk covers fill image gaps without pretending to be source imagery
- Market Snapshot includes:
  - YES gauge
  - YES/NO balance
  - money traded
  - time left
  - recent trades
  - research priority
  - priority breakdown
  - market timeline
  - browser-observed YES price history
  - recent trade flow when available
- AI output is answer-first:
  - Decision Lens
  - Bottom line
  - details collapsed under **See why**
- sources are compact domain chips instead of full URLs
- **Explain the move** is disabled until SignalDesk actually observes a price move or Panta trades
- Panta wallet/quote/build functionality is collapsed under:
  - **Panta API · Integration demo**
  - explicitly marked as for judges/developers
  - not part of the main research flow
- quick beta feedback remains collapsed near the bottom
- mobile layout has been simplified for one-column reading

## Market vs Evidence Decision Lens

For non-political markets, the research agent returns:

- `leans_yes`
- `balanced`
- `leans_no`
- `unclear`

along with:

- evidence strength: Low / Medium / High
- short evidence summary
- supporting facts
- counterevidence
- concrete conditions that would change the view

The UI shows Panta's market-implied probability and the evidence marker on the same visual scale.

This is decision support, not an expected-return model and not a trade recommendation.

### Political-market safeguard

Political markets use a separate neutral behavior:

- decision signal is forced to `not_assessed`
- no YES/NO political outcome prediction
- no candidate/party preference
- only neutral factual considerations, uncertainty, and sourced context

This behavior was smoke-tested in production.

## Panta integration

Panta is core infrastructure, not a cosmetic data source.

Implemented flows:

- `GET /markets/`
- paginated catalog traversal via `nextCursor`
- `GET /markets/{marketId}/`
- `GET /markets/{marketId}/trades/`
- `GET /positions/?wallet=...`
- `POST /primaryorderquote/`
- `POST /primaryorderbuild/`

The UI only enables quote execution when a live primary market exposes executable YES/NO prices.

The current Panta live catalog remains early/inconsistent:
- some current markets have blank text metadata
- some markets only expose question context via image/oracle metadata
- some primary markets have null executable prices
- tested catalog primary rows have previously returned `MARKET_NOT_FOUND` from the quote endpoint

SignalDesk handles these as upstream data limitations rather than fabricating values.

## AI research

Endpoint: `POST /api/analyze`

Uses:
- OpenAI Responses API
- web search for live real-world markets
- structured JSON output
- compact evidence-first response

Sources are extracted from web-search metadata and shown separately.

Research input is trimmed to relevant market fields so large Panta `onChain` objects are not sent to the model.

## Cost protection

Public-demo cost protection is active:

- per visitor/client:
  - 8 AI research requests / 10 minutes
  - 20 / hour
- warm-instance global guard:
  - 120 / hour
- repeated research is cached:
  - normal research ~30 minutes
  - move explanation ~5 minutes
- Panta catalog is cached ~30 seconds
- AI output is capped at 700 tokens
- credentials remain server-side

Production rate-limit smoke test confirmed request 9 receives HTTP 429 after 8 requests inside the 10-minute window.

## Traction instrumentation

Anonymous production events are logged for:

- session
- market opened
- watchlist add
- research generated
- move research generated
- positions loaded
- quote generated
- build generated
- feedback submitted

Beta links can include `utm_source=shared_beta`.

Do not fabricate users, ratings, comments, or usage. Only report observed external traffic.

See `TRACTION.md`.

## Security

- secrets are not shipped to the browser
- no wallet seed phrase/private key is requested
- no automatic signing/broadcasting
- execution remains human/wallet-controlled
- setup helpers are disabled in production by default
- `/setup` returns 404 unless explicitly enabled

## Remaining work before submission

### Required
- human visual review of the final live site
- record/upload ~2-minute demo video
- final smoke check after video freeze
- submit to Colosseum Crypto World's Fair
- submit separately to Panta API Sidetrack on Superteam Earn
- add the same final demo link/video to both submissions

### Useful but not required before video
- collect 5–10 genuine external beta testers
- record observed usage/feedback metrics
- report the Panta quoteable-market issue if a support channel is available

## Demo story

Recommended final demo flow:

1. Show `LIVE` / Panta-connected status.
2. Show current-market scanner and visual market cards.
3. Open a current research-ready non-political market.
4. Show the Panta market snapshot and charts.
5. Click **Analyze the evidence**.
6. Show **Market vs Evidence** and explain the distinction:
   - market = what Panta participants currently imply
   - evidence = what fresh public evidence supports
7. Expand **See why** briefly:
   - supports
   - counterevidence
   - what changes the view
8. Open compact sources.
9. Briefly show **Panta API · Integration demo** only if useful:
   - positions
   - guarded quote
   - unsigned build
10. End on **Powered by Panta**.

Avoid demonstrating a successful quote/build unless a compatible live primary market is verified immediately before recording.

## Freeze rule

The product is now in **launch/video freeze**.

Do not add major features before recording unless:
- a concrete bug is found
- a broken Panta live-data edge case materially hurts the demo
- a security/cost issue is discovered

After video recording, only submission-copy or critical-fix changes should be made.
