# Contributing

Thanks for improving Bulk Email Verifier.

## Setup

Docker:

```bash
docker compose up --build
```

Or Node.js 18+ and Go 1.22+:

```bash
cp .env.example .env
npm install
npm start
```

The UI is http://localhost:5000. The Go service on port 8080 is internal.

No license file is required. Free mode allows unlimited single checks and 25 bulk addresses per account per UTC day. To exercise licensed mode locally, set `INDUS_SKIP_LICENSE=1` in `.env`. Do not commit `.env` or an `indus-license*.json` file.

## Checks

```bash
npm test
cd backend/go && go build -o /dev/null .
```

`npm test` covers the free-mode cap. It does not open SMTP connections.

Before a pull request, also try one single check and a small CSV from the UI when you touched verification or the bulk page.

## Pull requests

1. Fork the repo and branch from `main`.
2. Keep the change focused. Match the style of the file you are editing.
3. Do not add a paid verification API.
4. Describe what you tested. If you could not run Docker or SMTP, say so.

## Reporting bugs

Use the bug report template. Include:

- Operating system
- `VERIFIER_ENGINE` and whether Docker was used
- Free mode or licensed mode
- The terminal error, with addresses redacted

## Security

See [SECURITY.md](SECURITY.md). Do not open a public issue for a vulnerability that exposes license tokens, passwords, or someone else's list.
