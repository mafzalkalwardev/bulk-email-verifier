# Bulk Email Verifier v1.0.0

Self-hosted email verification. No paid verification API.

## Install

```bash
docker compose up --build
```

Open http://localhost:5000

Without Docker: Node.js 18+, Go 1.22+, then `cp .env.example .env && npm install && npm start`.

## Free mode

No license file required. Single checks are not capped. Bulk is 25 addresses per account per UTC day until a license file verifies.

## Included

- truemail-go: syntax, MX, SMTP response text
- Bulk CSV/XLSX with the address in any column, plus valid-only export
- Bulk job resume in the browser session
- Optional Reacher (`docker compose --profile reacher up --build`)

## License

MIT
