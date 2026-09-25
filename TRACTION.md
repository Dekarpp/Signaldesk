# SignalDesk traction measurement

SignalDesk records lightweight, anonymous product-usage events in the production Vercel runtime logs.

## Why

The hackathon submission should distinguish real usage from claims. These events provide auditable evidence that external testers actually used the product.

## Events

- `session` — one anonymous browser session at most once every 6 hours
- `market_opened`
- `watchlist_add`
- `research_generated`
- `move_research_generated`
- `positions_loaded`
- `quote_generated`
- `build_generated`
- `feedback_submitted`

## Privacy

SignalDesk does not ask testers for names, emails, wallet private keys, or seed phrases.

Each browser gets a random local anonymous ID. Feedback asks only for:
- role
- 1–5 usefulness rating
- optional short product comment

Testers are explicitly asked not to submit personal or sensitive information.

## Evidence to use in the submission

Before final submission, summarize production events from the tester window:

- anonymous testers
- total research runs
- users who added a watchlist item
- users who inspected wallet positions
- feedback count
- average feedback rating
- 2–3 representative product comments

Do not count developer smoke tests or fabricate usage.

## Suggested traction sentence

> SignalDesk was tested by **[N] external users**, who completed **[N] AI research runs** and submitted **[N] product-feedback responses** with an average usefulness rating of **[X]/5**.

Only fill these numbers with observed production data.
