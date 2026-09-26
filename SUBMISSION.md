# SignalDesk — Final Submission Package

_Last updated: September 25, 2026_

## Product

**SignalDesk**

**Tagline:** Market signals. Real evidence. Better decisions.

**Live demo:** https://signaldesk-henna.vercel.app

**Source:** https://github.com/Dekarpp/Signaldesk

## One-line description

SignalDesk is a decision-support layer for Panta that combines live market signals with fresh public evidence, counterevidence, uncertainty, and wallet context before a user acts.

## Short description

SignalDesk turns Panta prediction-market infrastructure into a visual research terminal. It browses the full Panta catalog, separates current and recently closed markets, summarizes market state and activity, and adds a Market-vs-Evidence decision lens powered by fresh web research. Users can see what the market currently implies, what public evidence supports, what pushes back, and what could change the view. Public-wallet positions and guarded Panta quote/build adapters connect research to execution while keeping signing and broadcasting outside SignalDesk.

## Problem

Prediction-market prices are useful signals, but the research workflow around them is fragmented. A user often has to jump between the market page, news sources, trade activity, resolution rules, wallet positions, and execution tools before making sense of one market.

This creates three problems:

1. **Attention overload** — users do not know which markets deserve research first.
2. **Context fragmentation** — market signals and real-world evidence live in different places.
3. **Execution pressure** — interfaces can move quickly from discovery to action without a structured evidence check.

## Solution

SignalDesk creates a research-first workflow:

- full Panta market catalog
- Current / Recently closed / All-market browsing
- Panta market images with clear fallback visuals
- deterministic research-priority scoring
- live YES/NO market state
- Panta trade/activity context
- fresh AI-assisted web research with sources
- Market-vs-Evidence decision lens
- supporting evidence and counterevidence
- explicit “what could change this view” conditions
- market-move explanation when an actual move or Panta trade is observed
- browser-persistent watchlist
- Panta public-wallet positions
- guarded primary-market quote adapter
- unsigned Panta transaction-build adapter
- explicit human/wallet execution boundary

## Product insight

Prediction markets already compress beliefs into a price. The missing layer is not another market page — it is an interface that helps users understand **why the market looks the way it does and how current evidence compares with that signal**.

SignalDesk therefore separates:

**Market signal → Evidence direction → Counterevidence → Uncertainty → What changes the view → User decision**

The product does not auto-trade and does not present its evidence lens as a guaranteed forecast.

## Why Panta is essential

Panta is core product infrastructure, not a cosmetic data source.

SignalDesk uses Panta for:

- market discovery and catalog browsing
- market details and prices
- recent trades/activity
- public-wallet positions
- primary quote generation
- unsigned transaction building

Implemented flows:

- GET /markets/
- GET /markets/{marketId}/
- GET /markets/{marketId}/trades/
- GET /positions/?wallet=...
- POST /primaryorderquote/
- POST /primaryorderbuild/

The UI only enables quote preparation when a live primary market exposes executable YES/NO pricing. SignalDesk never signs or broadcasts transactions.

## Technical execution

- Next.js 16 App Router
- TypeScript
- Vercel production deployment
- server-side Panta API integration
- cursor-based Panta market catalog pagination
- OpenAI Responses API + web search
- strict structured AI output
- source extraction and compact source rendering
- 30-second Panta catalog cache
- AI research cache
- public-demo AI rate limits
- server-side secrets
- no seed phrases/private keys
- GitHub Actions production-build CI
- responsive mobile/desktop UI
- MIT open-source license

## Safety and accuracy

- Market price is labeled as a market signal, not a SignalDesk prediction.
- Missing Panta prices are shown as **No live price**, never visualized as 50%.
- Missing titles/images are handled with explicit fallbacks rather than invented market data.
- Political markets receive neutral factual analysis only; SignalDesk does not issue YES/NO political outcome predictions.
- “Explain the move” stays disabled until a price move or trade activity is actually observed.
- Quote/build remains unavailable when Panta does not expose executable live pricing.

## Differentiation

SignalDesk is not another prediction-market destination.

Its wedge is the decision-support layer above Panta:

**live Panta market state + independent fresh evidence + counterevidence + uncertainty + wallet context**

This can serve individual market users first, then expand into creator/media tooling, research teams, widgets, and APIs.

## Business model

### Initial user

Active prediction-market users who repeatedly research multiple markets before acting.

### SignalDesk Pro

Potential paid features:

- persistent watchlists
- durable market history
- saved research
- alerts for market moves and evidence changes
- portfolio intelligence
- higher-frequency research refreshes

Initial pricing hypothesis: **$15–$30/month** for individual Pro users.

### B2B expansion

- embeddable market-intelligence widgets
- creator/media dashboards
- API access to ranked market intelligence
- team research workspaces
- alerting infrastructure

### Go-to-market

1. Panta and prediction-market communities
2. direct beta sharing with active market users
3. crypto research communities
4. creators/publishers covering events represented as Panta markets
5. later: embeddable widgets and B2B API distribution

## Traction status

SignalDesk has anonymous product instrumentation for:

- sessions
- market opens
- watchlist adds
- research generation
- move research
- wallet-position loads
- quote/build usage
- feedback ratings/comments

Do **not** claim external-user counts, revenue, or feedback that has not actually been observed.

Before final submission, collect genuine feedback from a small beta group if possible and add only verified usage evidence.

---

# Colosseum package

## Product name

SignalDesk

## Brief description

SignalDesk is a decision-support layer for Panta prediction markets. It combines live market signals, activity, and wallet context with fresh public evidence, counterevidence, and uncertainty so users can understand a market before acting.

## What did you build?

SignalDesk turns Panta market infrastructure into a visual intelligence terminal. It browses the full Panta catalog, separates current and recently closed markets, ranks research priority, summarizes Panta market state and activity, and adds a Market-vs-Evidence research layer using fresh public sources.

Users can see what the market currently implies, what the evidence supports, what contradicts that view, and what could change it. SignalDesk also reads public Panta wallet positions and implements guarded primary quote and unsigned transaction-build adapters.

## Why is it useful?

A prediction-market price alone does not explain the event. Users still have to research news, check market mechanics, inspect activity, understand resolution conditions, and evaluate their own exposure.

SignalDesk compresses that fragmented workflow into one evidence-first interface and keeps research separate from execution.

## How does it use blockchain / Solana?

Panta’s Solana-based infrastructure provides the live market system underneath SignalDesk. SignalDesk consumes Panta market discovery, market details/prices, trade activity and wallet positions, and implements Panta quote-generation and unsigned transaction-building adapters. Any final signature remains in a user-controlled wallet.

## Why now?

Prediction-market infrastructure is becoming increasingly composable through APIs, while AI can now continuously synthesize fresh public evidence. SignalDesk combines those two trends: markets provide a real-time belief signal and AI provides the context layer needed to interpret it.

## Business potential

SignalDesk can start as a Pro research subscription for active prediction-market users and expand into B2B intelligence for creators, media teams, communities, terminals, and other products that want market research without rebuilding prediction-market infrastructure.

## Current validation

The product is live, open source, connected to Panta production data, and instrumented for early beta usage and feedback. No unverified traction or revenue claims should be added.

---

# Panta API Sidetrack package

## Copy-ready submission

**SignalDesk — Market signals. Real evidence. Better decisions.**

SignalDesk is an AI + prediction-market decision-support terminal built directly on the Panta API.

It uses Panta for the full market catalog, market details/prices, recent trades, public-wallet positions, and guarded primary quote / unsigned transaction-build flows. On top of that market infrastructure, SignalDesk adds deterministic research prioritization and a Market-vs-Evidence layer that checks fresh public sources, surfaces supporting evidence and counterevidence, explains uncertainty, and shows what could change the view.

The result is a research-first Panta experience: users can understand the market signal before they act. Execution stays non-custodial and human-controlled — SignalDesk never requests private keys and never auto-signs or broadcasts transactions.

Live demo: https://signaldesk-henna.vercel.app

Source: https://github.com/Dekarpp/Signaldesk

---

# Video 1 — Colosseum presentation / pitch

**Target length: 2:20–2:40**

This is the founder/startup presentation, not a screen-by-screen technical walkthrough.

### 0:00–0:20 — Hook

“Prediction markets are great at telling you what the market thinks. They are much worse at helping you understand why. SignalDesk is the decision-support layer that sits on top of Panta: market signals, real evidence, better decisions.”

### 0:20–0:45 — Problem

“Today, understanding one market means jumping between the market page, news, resolution rules, trade activity and wallet exposure. The price is useful, but the research around it is fragmented.”

### 0:45–1:15 — Product

“SignalDesk pulls the Panta catalog, organizes current and historical markets, and turns each market into a visual research dashboard. The key feature is Market vs Evidence: Panta shows the current market signal, while SignalDesk independently checks fresh public evidence, counterevidence, uncertainty, and what could change the view.”

Show a few short product cuts rather than doing the full demo here.

### 1:15–1:40 — Why Panta / Solana

“Panta is not just a data feed. SignalDesk uses its market discovery, market details, trades, positions, quote and transaction-build infrastructure. The result is a path from discovery to research to non-custodial execution, while the user’s wallet remains the signing boundary.”

### 1:40–2:05 — Business

“The initial product is for active prediction-market users. A Pro layer can add durable market history, saved research, alerts and portfolio intelligence. The same research layer can later power creator and media dashboards, embeddable widgets and B2B APIs.”

### 2:05–2:30 — Close

“Prediction markets already produce a powerful real-time signal. SignalDesk makes that signal understandable and actionable as research — without deciding for the user. Market signals. Real evidence. Better decisions. Powered by Panta.”

---

# Video 2 — Product demo

**Target length: 2:15–2:45. Keep it under 3 minutes.**

### 0:00–0:10 — Open

Show the homepage.

Say:

“SignalDesk is live on Panta. It turns prediction-market signals into an evidence-first research workflow.”

Point briefly to:
- Panta connected
- LIVE
- AI READY

### 0:10–0:35 — Market discovery

Show:

- Current markets
- market imagery
- search / filters
- Recently closed
- collapsed All Panta markets

Say:

“SignalDesk browses the full Panta catalog, keeps current markets front and center, and still makes recently closed and historical markets available for research.”

### 0:35–1:00 — Open the best live market

Use a named, research-ready, non-political market if available.

Show:

- market image/fallback
- YES/NO market view
- money traded
- time left
- research priority
- timeline / activity

Say:

“This is Panta’s market state. SignalDesk keeps it separate from its own research.”

### 1:00–1:40 — Analyze the evidence

Click **Analyze the evidence**.

Show:

- Market vs Evidence
- evidence direction
- evidence strength
- Bottom line
- See why

Expand **See why** just long enough to show:

- supporting evidence
- counterevidence
- biggest uncertainty
- what could change the view

Say:

“The evidence lens is not a trade instruction. It shows what current public evidence supports, what pushes back, and what would make the view change.”

### 1:40–2:00 — Sources

Open source chips briefly.

Say:

“Research uses fresh public sources, and the evidence is inspectable rather than hidden behind an AI answer.”

### 2:00–2:25 — Panta integration boundary

Open **Panta API · Integration demo** briefly.

Show:

- public-wallet positions
- quote/build controls
- disabled execution if the current live market is not executable

Say:

“Panta also powers wallet positions and the quote/build path. SignalDesk never holds keys, signs, or broadcasts for the user.”

Do not attempt a successful quote unless an executable primary market has been verified immediately before recording.

### 2:25–2:40 — Close

Return to the main research view.

“SignalDesk turns Panta from a market destination into an intelligence layer. Powered by Panta.”

---

# Recording checklist

Before recording:

- use desktop browser at a clean zoom level
- close unrelated tabs and notifications
- do not open Vercel/GitHub/environment settings
- never expose API keys
- refresh SignalDesk once
- confirm Panta connected / LIVE / AI READY
- choose a named non-political live market
- pre-run the evidence analysis once if needed so you know the result is clean
- confirm sources load
- confirm no browser extensions/popups cover the UI
- record in English
- keep presentation video 2–3 minutes
- keep product demo under 3 minutes

---

# Final application checklist

## Product

- [x] Production demo live
- [x] Public GitHub repository
- [x] MIT license
- [x] Panta market discovery/catalog
- [x] Panta market details/prices
- [x] Panta market activity
- [x] Panta wallet positions
- [x] Panta quote adapter
- [x] Panta unsigned-build adapter
- [x] Market-vs-Evidence research
- [x] Fresh sources
- [x] Political neutrality safeguard
- [x] Cost/rate-limit guard
- [x] Mobile-responsive UI
- [x] Powered by Panta attribution
- [x] CI + production deployment

## Media

- [ ] Final product graphic/logo for portal
- [ ] Record 2–3 minute Colosseum presentation video
- [ ] Record product demo video under 3 minutes
- [ ] Upload both videos and confirm public/unlisted access works without login

## Colosseum

- [ ] Join/register for Crypto World’s Fair
- [ ] Fill team/founder profile
- [ ] Add SignalDesk product name + description
- [ ] Select Solana / relevant tools
- [ ] Add product graphic
- [ ] Add public GitHub repo
- [ ] Add presentation video
- [ ] Add product-demo video
- [ ] Add go-to-market / demand validation answers
- [ ] Final preview
- [ ] Submit before the official deadline

## Panta / Superteam Earn

- [ ] Open Panta API Sidetrack listing
- [ ] Submit in English
- [ ] Add SignalDesk description
- [ ] Explain meaningful Panta API integration
- [ ] Add working demo link
- [ ] Add GitHub link
- [ ] Add demo video
- [ ] Ensure the same project is also submitted to Colosseum
- [ ] Final preview and submit

## After submission

- [ ] Save screenshots/confirmation of both submissions
- [ ] Keep the production URL stable
- [ ] Avoid major product changes unless fixing a real bug
- [ ] Monitor genuine user feedback and production errors
