# Bulk Email Verifier v1.0.0 — Final Release

Self-hosted bulk email verification with **real SMTP checks** — free, no paid APIs.

## Install

```bash
git clone https://github.com/mafzalkalwardev/bulk-email-verifier.git
cd bulk-email-verifier
cp .env.example .env
npm install
npm start
```

Open **http://localhost:5000**

## What's included

- **truemail-go** — syntax, MX priorities, live SMTP RCPT + server responses (550, etc.)
- **Bulk CSV/XLSX** — email in any column, valid-only export
- **Bulk job resume** — progress saved if you leave the page
- **Optional Reacher** via Docker (`VERIFIER_ENGINE=reacher`) — not required

## Recommended `.env`

```env
VERIFIER_ENGINE=truemail
GO_VERIFIER_URL=http://localhost:8080
```

## Requirements

- Node.js 18+
- Go 1.22+
- Docker (optional)

## Fixes in this release

- truemail-go as default engine (fast SMTP, no 2-minute Reacher timeouts)
- MongoDB starts before the web server (fixes register `ECONNREFUSED`)
- Reacher fallback when explicitly enabled
- Bulk verification persists across tab navigation

## License

MIT
