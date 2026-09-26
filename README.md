# SignalDesk

**Market signals. Real evidence. Better decisions.**

SignalDesk turns Panta markets into a visual decision-support workflow. It combines deterministic market scoring, Panta trade/activity data, live web research, a Market-vs-Evidence decision lens, watchlists, wallet-position intelligence, and guarded execution preparation so a user can understand what the market thinks, what the evidence says, and what could change the picture before taking any action.

**Live demo:** https://signaldesk-henna.vercel.app

> SignalDesk does not auto-trade. Research and execution are deliberately separated. Wallet signing and transaction broadcasting remain explicit user actions.

## Why SignalDesk

Prediction-market users often jump between a market page, news, social feeds, wallet positions, and raw trade activity. SignalDesk compresses that workflow into one research terminal:

1. Scan live Panta markets.
2. Rank markets by activity, uncertainty, and time sensitivity.
3. Inspect recent Panta market activity.
4. Ask an AI research agent for current evidence, catalysts, resolution risks, and watch triggers.
5. Compare the Panta market price with a separate evidence lens that shows whether current public evidence leans YES, balanced, NO, or remains unclear — without issuing a trade recommendation.
6. Explain plausible drivers after a probability move.
7. Track a personal watchlist.
8. Inspect Panta wallet positions.
9. When Panta exposes executable primary pricing, request a quote and prepare an **unsigned** Solana transaction.
10. Hand control back to the user's wallet for any signing/broadcasting step.

## Panta integration

SignalDesk uses Panta as core product infrastructure, not as a cosmetic data source.

| Product feature | Panta API flow |
| --- | --- |
| Live market discovery | GET /markets/ |
| Market detail enrichment | GET /markets/{marketId}/ |
| Recent market activity | GET /markets/{marketId}/trades/ |
| Wallet intelligence | GET /positions/?wallet=... |
| Primary-market quote | POST /primaryorderquote/ |
| Unsigned transaction build | POST /primaryorderbuild/ |

The product displays the required **Powered by Panta** attribution alongside Panta-powered functionality.

## Product features

- Full Panta catalog browsing with separate **Current markets**, **Recently closed**, and **All Panta markets** sections
- Panta market imagery when available, with honest SignalDesk visual fallbacks when no image is supplied
- Live Panta scanner with real market metadata
- Deterministic research-priority score
- Search, category, status, volume/deadline/usefulness sorting
- Market images and metadata fallbacks
- Browser-persistent watchlist
- Previous-scan probability deltas
- Panta trade-tape summary: YES flow, NO flow, primary vs. secondary activity
- AI research briefs with fresh web context and sources
- **Market vs Evidence decision lens** — separates Panta's market-implied probability from the direction and strength of current public evidence
- Decision support with supporting facts, counterevidence, and explicit conditions that would change the evidence view
- Political-market safeguard: neutral factual analysis only; SignalDesk does not predict political outcomes
- **Why did this market move?** research mode that treats observed price/activity changes as context rather than proof of causation
- Public-wallet Panta positions view
- Active-position mark-to-market estimates when a current Panta price is available
- Guarded primary-market quote preview
- Unsigned Solana transaction build adapter
- Human-confirmation safety boundary: no automatic signing or broadcasting
- Responsive desktop/mobile UI
- Integration health indicators
- Anonymous beta-usage instrumentation for hackathon traction evidence
- In-product early-tester rating and feedback flow

## Architecture

~~~mermaid
flowchart LR
    U[User] --> UI[Next.js SignalDesk UI]
    UI --> M[/api/markets]
    UI --> A[/api/market-activity]
    UI --> R[/api/analyze]
    UI --> P[/api/positions]
    UI --> Q[/api/quote]
    UI --> B[/api/build]

    M --> PA[Panta API]
    A --> PA
    P --> PA
    Q --> PA
    B --> PA

    R --> OA[OpenAI Responses API]
    OA --> W[Web Search]

    B --> X[Unsigned Solana instructions]
    X --> H[Human-controlled wallet signing]
~~~

Panta and OpenAI credentials remain server-side. SignalDesk never requests or stores seed phrases or private keys.

## Research score

The score is an **attention-priority heuristic**, not an expected-return model.

It currently combines:

- market activity / visible volume
- probability uncertainty
- time to close
- market phase

The UI exposes the score breakdown so the user can see why a market was prioritized.

## Business model

SignalDesk is designed as a research layer that can sit above prediction-market infrastructure.

Potential monetization:

- **Pro research subscription** — advanced watchlists, historical probability timelines, saved research, alerts
- **Creator / media workspace** — embeddable market intelligence, audience-facing briefs, market monitoring
- **API / B2B intelligence** — ranked Panta market signals and research summaries for trading terminals, communities, or publishers
- **Partner attribution / ecosystem distribution** — route qualified users into Panta-powered actions without taking custody of funds

The near-term goal is to prove repeat usage around market monitoring and research, then add persistent alerts/history before charging.

## Security

- Secrets are never committed to the repository.
- Panta/OpenAI secrets are used server-side only.
- Public wallet addresses can be queried for positions; private keys are never requested.
- Quote/build controls activate only when the selected live Panta market exposes executable primary pricing; transaction preparation stops at unsigned instructions.
- Signing/broadcasting must happen in a user-controlled wallet.
- Developer onboarding helpers are disabled by default and require SIGNALDESK_SETUP_ENABLED=true.
- The product does not claim prediction-market prices are guaranteed forecasts or provide automatic trading advice.

See [SECURITY.md](./SECURITY.md).

## Local setup

~~~bash
cp .env.example .env.local
npm install
npm run dev
~~~

~~~env
PANTA_API_BASE_URL=https://live-api.panta.market/api/v1
PANTA_API_KEY=pk_test_replace_me
OPENAI_API_KEY=
OPENAI_MODEL=gpt-5.6
SIGNALDESK_SETUP_ENABLED=false
~~~

Then open http://localhost:3000.

## Deployment

Production is deployed through Vercel Git integration from main.

- Production: https://signaldesk-henna.vercel.app
- CI: GitHub Actions runs install + production build
- Vercel: production deployment is created automatically from main

## Hackathon

SignalDesk is launch-ready for:

- **Colosseum Crypto World's Fair**
- **Panta API Sidetrack on Superteam Earn**

The submission materials, copy, demo flow, business case, and final checklist are in [SUBMISSION.md](./SUBMISSION.md).

Traction measurement is documented in [TRACTION.md](./TRACTION.md).

## Roadmap

1. Persistent probability history and research snapshots
2. Alerting for watched-market moves and resolution-risk changes
3. Client-side Solana wallet signing for explicitly confirmed transactions
4. Saved research workspaces
5. Multi-market portfolio intelligence
6. Team / creator collaboration features

## Attribution

[**Powered by Panta**](https://panta.market)

SignalDesk is an independent developer product built with the Panta API.
