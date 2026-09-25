# SignalDesk

AI-powered prediction-market research and market intelligence built on the Panta API.

## MVP
- Live Panta market discovery
- Deterministic signal score
- AI research brief with fresh web context
- Wallet-position plumbing
- Primary-market quote preview
- Human-confirmed actions only
- **Powered by Panta** attribution

## Local setup

```bash
cp .env.example .env.local
npm install
npm run dev
```

```env
PANTA_API_BASE_URL=https://live-api.panta.market/api/v1
PANTA_API_KEY=pk_test_...
OPENAI_API_KEY=...
OPENAI_MODEL=gpt-5.6
```

SignalDesk does not auto-trade. Research and execution remain separate, and any signing/broadcasting step must require explicit wallet confirmation.
