# SignalDesk — Submission Package

_Last updated: September 25, 2026_

This file is the copy-ready package for the Colosseum Crypto World's Fair submission and the Panta API Sidetrack on Superteam Earn.

## Submission title

**SignalDesk — AI research intelligence for Panta markets**

## One-line description

SignalDesk turns live Panta markets into an AI-assisted research queue, combining market activity, probability moves, wallet positions, fresh web evidence, and human-confirmed transaction preparation.

## Short description

SignalDesk is a prediction-market intelligence terminal built on the Panta API. It scans live markets, ranks what deserves attention, summarizes recent Panta trading activity, researches fresh real-world evidence, explains plausible drivers behind market moves, tracks watchlists and public-wallet positions, and can request a Panta quote plus build an unsigned Solana transaction. It deliberately stops before signing or broadcasting so the user remains in control.

## Problem

Prediction-market research is fragmented. A user sees a price, then has to open multiple tabs to understand the event, recent news, market activity, resolution rules, portfolio exposure, and execution mechanics.

That creates three problems:

1. **Attention overload** — users do not know which markets deserve research first.
2. **Context fragmentation** — market prices, activity, evidence, and wallet exposure live in different places.
3. **Execution pressure** — trading interfaces often move quickly from discovery to action without a structured research step.

## Solution

SignalDesk creates a research-first workflow:

- Panta market discovery and detail enrichment
- deterministic research-priority scoring
- recent trade/activity context
- fresh AI research with public sources
- "Why did this market move?" analysis
- local watchlists
- Panta wallet positions
- primary-market quote preview
- unsigned transaction build
- explicit human wallet confirmation before any signing/broadcast

## Why Panta is essential

SignalDesk depends on Panta for the live market system underneath the product:

- market catalog
- market detail and prices
- trade activity
- wallet positions
- quote generation
- Solana transaction building

Without Panta, SignalDesk would only be a generic news summarizer. Panta gives the product real market state, real user exposure, and a path from research into non-custodial execution.

## Panta endpoints demonstrated

- GET /markets/
- GET /markets/{marketId}/
- GET /markets/{marketId}/trades/
- GET /positions/?wallet=...
- POST /primaryorderquote/
- POST /primaryorderbuild/

## Technical execution

- Next.js 16 App Router
- TypeScript
- Vercel production deployment
- server-side Panta API integration
- OpenAI Responses API + web search for live-event research
- no secret keys shipped to the browser
- no private wallet keys requested or stored
- unsigned Panta transaction build with wallet signing kept outside the server flow
- responsive UI
- GitHub Actions production-build check
- Panta-required attribution

## Product differentiation

SignalDesk is not another prediction-market destination. It is an intelligence layer over prediction-market infrastructure.

The wedge is the workflow from:

**market signal → context → evidence → movement explanation → wallet exposure → execution preparation**

That workflow can later serve traders, media teams, creators, communities, and other applications that want Panta market intelligence without rebuilding Panta itself.

## Business model

### Initial customer

Active prediction-market users who monitor multiple markets and repeatedly research news/context before acting.

### Paid product

**SignalDesk Pro**
- persistent watchlists
- probability history
- saved research
- market-move alerts
- portfolio intelligence
- higher-frequency research refreshes

Potential starting price: **$15–$30/month** for individual Pro users.

### B2B expansion

- embeddable market-intelligence widgets
- creator/media dashboards
- API access to ranked research signals
- team workspaces and alerting

### Distribution

- Panta ecosystem
- prediction-market communities
- crypto research communities
- creators and publishers covering events already represented as Panta markets

## Impact potential

Prediction markets produce a real-time information signal, but the raw price alone is not enough. SignalDesk can make that signal more usable by pairing it with evidence, uncertainty, market mechanics, and portfolio context.

The same research layer can be embedded into trading terminals, media products, sports/event communities, and creator workflows.

## Demo URL

https://signaldesk-henna.vercel.app

## Source repository

https://github.com/Dekarpp/Signaldesk

**Before final submission:** change repository visibility to public so judges can review the code.

## Two-minute demo script

### 0:00–0:15 — Problem

"Prediction markets are useful signals, but researching them is fragmented. SignalDesk turns Panta into a research-first intelligence terminal."

### 0:15–0:35 — Live Panta scanner

Open the dashboard and point out:
- LIVE Panta connection
- live market cards
- research score
- category / phase filters
- watchlist

Say:

"SignalDesk pulls live Panta markets and ranks what deserves attention using activity, uncertainty, timing, and phase."

### 0:35–1:05 — Research + movement intelligence

Open a named live market.

Show:
- market probabilities
- recent Panta trade activity
- Generate research brief
- sources
- Why did this market move?

Say:

"The AI layer uses the actual Panta market plus fresh web evidence. It separates facts from uncertainty and does not tell the user what trade to make."

### 1:05–1:30 — Wallet intelligence

Paste a public Panta wallet with positions, if available.

Show:
- side
- shares
- phase
- active mark-to-market estimate

Say:

"SignalDesk also connects research to the user's actual Panta exposure without asking for private keys."

### 1:30–1:50 — Execution preparation

Select a primary market.

Show:
- quote
- unsigned transaction build
- instruction count
- human-confirmation badge

Say:

"Panta takes us all the way to transaction building, but SignalDesk deliberately stops before signing. The wallet remains the execution boundary."

### 1:50–2:00 — Close

"SignalDesk turns Panta market infrastructure into an intelligence layer that can serve traders, creators, communities, and other products. Powered by Panta."

## Suggested Colosseum submission copy

### What did you build?

SignalDesk is an AI research and market-intelligence layer for Panta. It converts live prediction markets into a prioritized research queue, combines Panta prices and trade activity with current public evidence, explains likely drivers behind market movement, surfaces wallet positions, and prepares unsigned Panta transactions for explicit user-controlled execution.

### Why is it useful?

Prediction-market users currently have to assemble context manually across market pages, news sources, wallets, and trade feeds. SignalDesk compresses that work into a single research workflow and creates a safer separation between research and execution.

### How does it use blockchain?

Panta's Solana-based market infrastructure is the product's source of market state and execution primitives. SignalDesk consumes Panta market discovery, market detail, trades, positions, quote generation, and transaction-building flows. The final signature remains with the user's wallet.

### Business potential

SignalDesk can monetize through a Pro research subscription for alerts/history/saved research, then expand into B2B intelligence, creator/media tooling, and embeddable market research.

## Suggested Panta Sidetrack submission copy

SignalDesk is an AI + prediction-market intelligence terminal built directly on the Panta API.

It uses Panta for live market discovery, market detail/prices, recent market trades, wallet positions, primary-market quotes, and unsigned transaction building. SignalDesk then adds a research layer: deterministic attention scoring, watchlists, fresh web research with sources, and a "Why did this market move?" workflow that combines observed Panta price/activity context with real-world evidence.

The result is a product that helps users understand Panta markets before they act. Execution remains non-custodial and human-confirmed: SignalDesk never stores private keys and never auto-signs or auto-broadcasts transactions.

Live demo: https://signaldesk-henna.vercel.app

## Final submission checklist

- [x] Live Panta scanner
- [x] Panta market detail/prices
- [x] Panta recent trade activity
- [x] AI research with fresh sources
- [x] Why-this-moved workflow
- [x] Watchlist
- [x] Panta positions UI
- [x] Panta quote preview
- [x] Panta unsigned transaction build
- [x] Powered by Panta attribution
- [x] Human-confirmed execution boundary
- [x] Responsive UI
- [x] Vercel production deployment
- [x] GitHub CI/build
- [x] README / architecture / business plan
- [x] Submission copy
- [ ] Make GitHub repository public
- [ ] Record and upload ~2-minute demo video
- [ ] Register/join Crypto World's Fair with the human's Colosseum account
- [ ] Submit on Colosseum before the official deadline
- [ ] Submit the same project separately to Panta API Sidetrack on Superteam Earn
- [ ] Add any public demo-video URL to both submissions
- [ ] Final human review before publishing
