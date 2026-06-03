# Verification engines — what we use and why

## Active stack (this repository)

### 1. truemail-go — PRIMARY (best for this app)

- **Does:** Regex syntax → MX lookup → SMTP `RCPT TO` on port 25
- **Returns:** `SmtpDebug` with host dialog and server text (`550 5.1.1`, etc.)
- **Decides:** `mailbox_verified` and `valid=yes` only after SMTP proof
- **Why best here:** Same style as verify-email.org; pure Go; runs with `npm start`; no Rust/Docker

### 2. AfterShip email-verifier — HELPER only

- **Does:** Disposable domains, role accounts (`info@`), free providers (Gmail, Yahoo, …)
- **Does not:** Replace SMTP or set `valid=yes` alone
- **Why kept:** Fast local lists bundled in Go; no external API calls

## Not used (evaluated in workspace)

| Library | SMTP dialog | Why not primary |
|---------|-------------|-----------------|
| AfterShip (alone) | Partial | No full SMTP response export in JSON |
| Reacher (Rust) | Excellent | Needs Rust toolchain or Docker |
| validate_email | No | Syntax/MX only |
| KnowEmail | Partial | Windows GUI `.exe`, not an API |
| Paid SaaS | Cloud | Against self-hosted requirement |

## “Go engine online” in Settings

That status means the **Go HTTP service on port 8080** is up. Inside it:

1. **truemail-go** runs every verification
2. **AfterShip** adds misc flags on the same request

It is **not** “generic Go” or “AfterShip only” — the label should read **truemail-go** when healthy.

## If SMTP is blocked

- `domain_valid` may still be `yes`
- `mailbox_verified` = `no_smtp`
- `valid` = **no** (never guessed)

Optional future: `SMTP_PROXY=socks5://...` in `.env` (not required on networks with open port 25).
