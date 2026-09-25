# Security

SignalDesk is a research-first interface. The security boundary is intentionally conservative.

## Secrets

- PANTA_API_KEY and OPENAI_API_KEY are server-side environment variables.
- Secrets must never be committed to Git.
- API keys are normalized server-side for accidental whitespace.
- Developer onboarding helpers are disabled unless SIGNALDESK_SETUP_ENABLED=true.

## Wallets

- SignalDesk accepts public wallet addresses for Panta position lookup.
- SignalDesk never requests, stores, or transmits wallet seed phrases or private keys.
- Panta transaction building returns unsigned instructions only.
- Any future signing must happen client-side in a user-controlled wallet after explicit confirmation.
- The server must never auto-sign or auto-broadcast on behalf of a user.

## Research

AI research is informational and may be incomplete or wrong. Market prices are not guarantees. SignalDesk separates observed market data from external evidence and uncertainty and does not automatically choose trades.

## Reporting

If you find a security issue, do not post secrets or exploit details in a public issue. Contact the project owner privately first.
