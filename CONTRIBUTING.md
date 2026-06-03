# Contributing

Thanks for improving Bulk Email Verifier!

## Development setup

```bash
cp .env.example .env
npm install
npm start
```

Optional: `docker compose up -d` for Reacher.

## Pull requests

1. Fork the repo
2. Create a branch: `git checkout -b fix/my-change`
3. Test single + bulk verify locally
4. Open a PR with a clear description

## Code style

- Match existing patterns in `controllers/` and `utils/`
- Keep UI changes minimal and consistent with Bootstrap glass theme
- No paid external verification APIs

## Reporting bugs

Include:

- OS (Windows/macOS/Linux)
- `VERIFIER_ENGINE` from `.env`
- Docker yes/no
- Sample email (redacted) and error message from terminal
