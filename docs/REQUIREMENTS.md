# Bulk Email Verifier — Requirements Specification

**Version:** 1.0  
**Date:** June 2026  
**Project:** [`bulk-email-verifier/`](../)  
**User-facing URL:** http://localhost:5000 only  

---

## 1. Executive summary

Build a **100% self-hosted** bulk email verifier that runs on your machine. No ChatGPT, no EmailListVerify, no paid SaaS APIs. Verification uses **direct DNS (MX) + SMTP (RCPT TO) dialog** — the same technique used by verify-email.org and professional verifiers.

The app must:
- Show a **detailed per-email report** (syntax, MX records with priority, SMTP server response, Misc flags)
- Support **bulk CSV/XLSX** upload with emails in any column
- Export results with **`domain_valid`**, **`mailbox_verified`**, and **`valid`** columns
- Provide **download valid-only CSV** (mailbox confirmed emails only)

---

## 2. What went wrong before

| Problem | Cause |
|---------|--------|
| "No valid emails found in file" | Parser only read column 0; your `Clean *.csv` likely has emails in another column |
| `localhost:8080` → 404 | Port 8080 is internal Go API only — **use http://localhost:5000** for the UI |
| Trust scores instead of facts | Old UI used AI/heuristic scoring, not SMTP dialog output |
| External APIs unreliable | ChatGPT, EmailListVerify, etc. are not real mailbox verifiers |

---

## 3. Self-hosted guarantee (what we do NOT use)

The following are **explicitly excluded**:

- OpenAI / ChatGPT / any LLM for verification
- EmailListVerify or any HTTP verification SaaS
- Hunter, ZeroBounce, NeverBounce, or similar paid APIs
- KnowEmail.exe as a backend (it's a standalone GUI app)
- Reacher SaaS / no2bounce.com cloud

The following **are allowed** (all local):

- DNS lookups to public resolvers (Google 8.8.8.8, Cloudflare 1.1.1.1)
- SMTP connections to **recipient mail servers** (gmail-smtp-in.l.google.com, etc.)
- Optional **9proxy SOCKS5** on your machine to route SMTP when port 25 is blocked
- Bundled disposable/free domain lists inside Go libraries (no network)

---

## 4. Assets in workspace and merge strategy

### 4.1 Inventory

| Asset | Type | Role in final app |
|-------|------|-------------------|
| `bulk-email-verifier/` | Node + Go app | **Base project** — UI, auth, bulk, orchestration |
| `Email Verifier Project/` | Node UI | Source of glassmorphism frontend (already copied) |
| `email-verifier/` | Go library (AfterShip) | Reference; superseded as primary engine |
| `truemail-go-master.zip` | Go library | **Primary verification engine** |
| `check-if-email-exists-master.zip` | Rust (Reacher) | Borrow proxy config pattern only |
| `KnowEmail-main.zip` | Python/PyQt | Borrow bulk file UX + valid column export |
| `KnowEmail-v1.1.10-windows.exe` | Windows GUI | Do not integrate — reference only |
| `validate_email-master.zip` | Python RFC | Skip — no SMTP dialog |

### 4.2 Why truemail-go as primary engine

Your target output (example for `tony@gmail.com`):

```
The Email Address Syntax is correct
MX record found: gmail-smtp-in.l.google.com (Priority 5)
...
Dialog with gmail-smtp-in.l.google.com succeeded
Server Response: 550-5.1.1 The email account that you tried to reach does not exist...
```

**truemail-go** provides:
- `ValidatorResult.MailServers[]` — MX hosts
- `ValidatorResult.SmtpDebug[]` — per-host SMTP session with `Response.Errors` (raw codes/messages)
- Validation chain: regex → MX → SMTP
- Configurable SMTP safe-check, fail-fast, proxy support

**AfterShip email-verifier** (current) does SMTP but does not expose full dialog text in JSON without custom patches.

**Reacher (Rust)** is the industry gold standard but requires Rust toolchain or Docker — too heavy for a simple `npm start` workflow.

**KnowEmail (Python)** tries SMTP on ports 25, 587, 465 — useful reference but weaker than truemail-go; the `.exe` cannot be merged as an API.

### 4.3 Merged architecture

```
Browser → http://localhost:5000 (Node.js)
              │
              ├── Static UI (HTML/CSS/JS)
              ├── Auth, history, CSV upload, export
              │
              └── HTTP → http://localhost:8080 (Go API)
                              │
                              └── truemail-go
                                    ├── DNS MX lookup
                                    ├── Misc (disposable, etc.)
                                    └── SMTP RCPT TO (via port 25 or 9proxy)
```

**Two processes, one URL for you:** open only **localhost:5000**.

---

## 5. Two-tier validation (your choice: A + C)

### 5.1 Field definitions

| Field | Meaning | Requires SMTP? |
|-------|---------|----------------|
| `domain_valid` | Syntax OK + MX exists + not disposable | No |
| `mailbox_verified` | SMTP RCPT confirms mailbox exists | Yes |
| `valid` | **Final export flag** — only `yes` when `mailbox_verified = yes` | Yes |

### 5.2 `mailbox_verified` values

| Value | Meaning |
|-------|---------|
| `yes` | RCPT TO returned 250 — mailbox exists |
| `no` | SMTP ran but mailbox rejected (e.g. 550 no such user) |
| `no_smtp` | SMTP could not run (port 25 blocked, proxy down, timeout) |

### 5.3 Examples

| Email | domain_valid | mailbox_verified | valid |
|-------|--------------|------------------|-------|
| `tony@gmail.com` | yes | no | **no** |
| `realuser@gmail.com` | yes | yes | **yes** |
| `bad@dead-domain.xyz` | no | no_smtp | **no** |
| `user@gmail.com` (proxy expired) | yes | no_smtp | **no** |

### 5.4 When is your work "done"?

- **Partially done** without SMTP: dead domains, bad syntax, disposable emails removed
- **Fully done** with SMTP: fake usernames on live domains (like `tony@gmail.com`) are caught

**Never mark `valid=yes` without successful SMTP mailbox proof.**

---

## 6. Per-email report format

### 6.1 JSON (Go API → Node → UI)

```json
{
  "email": "tony@gmail.com",
  "domain_valid": true,
  "mailbox_verified": "no",
  "valid": false,
  "checks": [
    { "step": "syntax", "passed": true, "message": "The Email Address Syntax is correct" },
    { "step": "mx", "passed": true, "message": "MX record found: gmail-smtp-in.l.google.com (Priority 5)" },
    { "step": "mx", "passed": true, "message": "MX record found: alt1.gmail-smtp-in.l.google.com (Priority 10)" },
    { "step": "smtp", "passed": false, "message": "Dialog with gmail-smtp-in.l.google.com", "detail": "550 5.1.1 The email account that you tried to reach does not exist..." }
  ],
  "mx_records": [
    { "host": "gmail-smtp-in.l.google.com", "priority": 5 },
    { "host": "alt1.gmail-smtp-in.l.google.com", "priority": 10 }
  ],
  "misc": {
    "disposable": false,
    "role_account": false,
    "free_provider": true
  },
  "smtp_host": "gmail-smtp-in.l.google.com",
  "smtp_response": "550 5.1.1 The email account that you tried to reach does not exist...",
  "verdict_summary": "tony@gmail.com seems not to be valid"
}
```

### 6.2 UI (single verify page)

- Checklist with ✓ / ✗ per line (matches verify-email.org style)
- Misc section: disposable, role account, free provider
- Two badges: **Domain: Valid/Invalid** and **Mailbox: Verified / Not verified / SMTP unavailable**
- **Copy entire result** button
- **No trust score, no AI, no credit rating**

### 6.3 UI (bulk verify page)

Table columns:

`email | domain_valid | mailbox_verified | valid | smtp_response (truncated) | [expand details]`

Stats: Valid / Invalid / Disposable / SMTP unavailable counts

---

## 7. Bulk CSV workflow

### 7.1 Upload parsing (fixes "No valid emails found")

Parser must:

1. Accept `.csv` and `.xlsx`
2. Strip UTF-8 BOM
3. Auto-detect delimiter (`,` or `;`)
4. Scan **every cell in every row** for email pattern
5. Preserve **original row data** (all columns) for export
6. Deduplicate emails but keep row mapping

Email regex (minimum):

```
/[^\s,;"<>]+@[^\s,;"<>]+\.[^\s,;"<>]+/gi
```

### 7.2 Verification flow

1. User uploads file on Bulk Verify page
2. Node parses → returns `{ rows: [...], emailCount }`
3. Node verifies in batches (e.g. 5–10 at a time) via Go API
4. Progress bar updates per email
5. Each row gets `domain_valid`, `mailbox_verified`, `valid`, `checks`

### 7.3 Export options

**Download all results CSV:**

```
valid, mailbox_verified, domain_valid, email, [original columns...], smtp_response
```

**Download valid-only CSV:**

- Only rows where `valid = yes`
- `valid` column on the left as requested
- Includes original row columns

---

## 8. SMTP and 9proxy

### 8.1 Port 25

SMTP mailbox verification requires connecting to the recipient's mail server on **port 25** (or configured alternate port). Many ISPs and cloud hosts block outbound port 25.

### 8.2 9proxy (SOCKS5)

When port 25 is blocked, route SMTP through 9proxy:

```env
SMTP_PROXY=socks5://username:password@127.0.0.1:PORT
```

**9proxy can expire or rotate** — this is normal. When proxy fails:

- `domain_valid` still computed
- `mailbox_verified` = `no_smtp`
- `valid` = **no**
- UI shows: "SMTP unavailable — update proxy in Settings"

### 8.3 Workflow when proxy stops

1. Refresh proxy in 9proxy app
2. Update `.env`
3. Restart app (`npm start`)
4. Re-run bulk on rows with `mailbox_verified=no_smtp` only

---

## 9. Environment variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `PORT` | No | `5000` | Node web server |
| `JWT_SECRET` | Yes | — | Auth tokens |
| `MONGO_URI` | No | (empty) | MongoDB; falls back to in-memory |
| `GO_VERIFIER_URL` | No | `http://localhost:8080` | Local Go API only |
| `SMTP_PROXY` | No | (empty) | 9proxy SOCKS5 URL for SMTP |

**No API keys for external verification services.**

---

## 10. API endpoints (Node :5000)

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/auth/register` | Register |
| POST | `/api/auth/login` | Login |
| POST | `/api/verify/single` | Verify one email → full report |
| POST | `/api/verify/bulk` | Verify email array |
| POST | `/api/verify/upload-bulk` | Parse CSV/XLSX → rows + emails |
| GET | `/api/verify/health` | Go engine + SMTP/proxy status |
| GET | `/api/history` | Past verifications |
| GET | `/api/history/stats` | Dashboard counts |

Go API (:8080, internal):

| Method | Path | Description |
|--------|------|-------------|
| GET | `/health` | Engine alive |
| GET | `/v1/:email/verification` | Full verification report |
| POST | `/v1/bulk/verification` | Batch verify |

---

## 11. Non-goals

- Trust scores / credit scores / AI risk ratings
- OpenAI / GPT integration
- External verification APIs
- Running KnowEmail.exe, Reacher Docker, or Python sidecar as required dependencies
- Hosting on `:8080` as user-facing UI

---

## 12. Implementation phases

| Phase | Deliverable |
|-------|-------------|
| **1** | This REQUIREMENTS.md (done) |
| **2** | Swap Go backend to truemail-go with SmtpDebug output |
| **3** | Fix CSV parser — scan all columns, preserve rows |
| **4** | Rewrite Node engine — pass-through report, two-tier valid |
| **5** | Redesign single + bulk UI — checklist report, valid-only export |
| **6** | Settings — Go status, proxy status, port 25 test |
| **7** | Test: `tony@gmail.com`, real mailbox, your `Clean *.csv` file |

---

## 13. Success criteria

- [ ] Upload `Clean 1778293 - 1783046.csv` → emails detected (not "No valid emails found")
- [ ] `tony@gmail.com` → domain_valid=yes, mailbox_verified=no, shows 550-style SMTP message
- [ ] Real existing email → valid=yes in export
- [ ] Bulk export downloads valid-only CSV with `valid` column on the left
- [ ] No external API calls during verification (wireshark / logs confirm localhost + DNS + SMTP only)
- [ ] App runs from http://localhost:5000 after `npm start`
- [ ] When 9proxy down → no false `valid=yes`, clear `no_smtp` status

---

## 14. Reference comparison

| Feature | Old Email Verifier Project | This spec |
|---------|---------------------------|-----------|
| Verification | EmailListVerify API / ChatGPT | Local truemail-go SMTP |
| Output | Trust score | MX + SMTP dialog lines |
| Bulk CSV | Column 0 only | All columns |
| Export | Generic status | valid + domain_valid + mailbox_verified |
| Dependencies | API keys | Optional 9proxy only |

---

*Next step: implement Phase 2–7 in [`bulk-email-verifier/`](../) per this document.*
