<div align="center">

# 📧 Bulk Email Verifier

**Self-hosted bulk email verification — free forever. No paid APIs.**

Syntax · MX records · live SMTP dialog · CSV export

<br/>

[![Node.js](https://img.shields.io/badge/Node.js-18%2B-339933?style=for-the-badge&logo=node.js&logoColor=white)](https://nodejs.org/)
[![Go](https://img.shields.io/badge/Go-1.22-00ADD8?style=for-the-badge&logo=go&logoColor=white)](https://go.dev/)
[![Docker](https://img.shields.io/badge/Docker-Optional-2496ED?style=for-the-badge&logo=docker&logoColor=white)](https://www.docker.com/)
[![License](https://img.shields.io/badge/License-MIT-yellow?style=for-the-badge)](LICENSE)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen?style=for-the-badge)](CONTRIBUTING.md)

</div>

---

## 🏆 Why this project?

| | Paid SaaS (Hunter, etc.) | **This app** |
|---|--------------------------|--------------|
| Cost | 💸 Per email | ✅ **$0** |
| Data privacy | Sent to third parties | ✅ **Stays on your PC** |
| SMTP proof | Yes | ✅ **Yes** (truemail-go / Reacher) |
| Bulk CSV | Yes | ✅ **Any column** |

---

## ✨ Features

- 🔍 **Single verify** — verify-email.org style checklist + SMTP server text
- 📂 **Bulk CSV / XLSX** — finds emails in **any column**
- ✅ **Valid-only export** — download clean list with original columns
- 🔄 **Resume bulk jobs** — switch tabs; open **Bulk Verify** again to continue
- 🔐 **JWT auth** + validation history
- 🌙 Dark mode

---

## 🛠 Tech stack

```
┌─────────────────────────────────────────────────────────┐
│  Browser  →  Node.js + Express (:5000)  UI + API        │
│                    │                                     │
│         ┌──────────┴──────────┐                          │
│         ▼                     ▼                          │
│  truemail-go (:8080)    Reacher Docker (:8081) optional │
│  SMTP + MX + 550 text   Industry-grade (Gmail-safe)     │
└─────────────────────────────────────────────────────────┘
```

| Layer | Technology |
|-------|------------|
| Frontend | HTML5, Bootstrap 5, JavaScript |
| API | Node.js, Express, JWT |
| Database | MongoDB or in-memory (dev) |
| Verifier A | **truemail-go** (Go) — built-in |
| Verifier B | **Reacher** (Rust/Docker) — optional, recommended for huge lists |
| Misc lists | AfterShip email-verifier (disposable / role) |

---

## 🚀 Quick start

### Prerequisites

- [Node.js](https://nodejs.org/) 18+
- [Go](https://go.dev/dl/) 1.22+ (for truemail-go)
- [Docker Desktop](https://www.docker.com/products/docker-desktop/) *(optional, recommended)*

### Install

```bash
git clone https://github.com/YOUR_USERNAME/email-verifier-app.git
cd email-verifier-app
cp .env.example .env
npm install
```

### Run (truemail-go only)

```bash
npm start
```

Open **http://localhost:5000** → register → verify emails.

### Run (with Reacher — best for Gmail / bulk)

```bash
docker compose up -d
npm start
```

In `.env`:

```env
VERIFIER_ENGINE=auto
```

`auto` uses **truemail-go first** (fast). Reacher is used if Go is down. Set `VERIFIER_ENGINE=reacher` to force Docker engine.

---

## 🔬 Verification engines

| Engine | Speed | Gmail | When to use |
|--------|-------|-------|-------------|
| **truemail-go** | ⚡ ~10–20s | Good SMTP 550 | Default — no Docker |
| **Reacher** | 🐢 can be slow | Headless checks | Huge lists, hard providers |

> **Reacher timeout?** Gmail via Docker can exceed 60s. The app **falls back to truemail-go** automatically.

See [docs/ENGINES.md](docs/ENGINES.md) for details.

---

## 📖 Result columns

| Column | Meaning |
|--------|---------|
| `domain_valid` | Syntax + MX OK |
| `mailbox_verified` | `yes` / `no` / `no_smtp` |
| `valid` | **yes** only when SMTP confirms mailbox |

---

## 🖥 UI

- **http://localhost:5000** — web app (only URL for browser)
- `:8080` / `:8081` — internal APIs (do not open for UI)

---

## ⚙️ Environment

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `5000` | Web UI |
| `JWT_SECRET` | — | Change in production |
| `VERIFIER_ENGINE` | `auto` | `auto` \| `truemail` \| `reacher` |
| `GO_VERIFIER_URL` | `http://localhost:8080` | truemail-go |
| `REACHER_URL` | `http://localhost:8081` | Reacher Docker |
| `REACHER_TIMEOUT_MS` | `60000` | Reacher timeout before fallback |
| `BULK_CONCURRENCY` | `3` | Parallel emails per batch |
| `MONGO_URI` | empty | In-memory DB if empty |

---

## 📁 Project structure

```
email-verifier-app/
├── backend/go/          # truemail-go API
├── lib/                 # Vendored Go libraries
├── public/              # Web UI
├── controllers/         # REST handlers
├── utils/               # CSV parser, engines
├── docker-compose.yml   # Reacher (optional)
└── docs/                # REQUIREMENTS, ENGINES
```

---

## 🚢 Publish to GitHub

```bash
git add .
git commit -m "feat: self-hosted bulk email verifier"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/email-verifier-app.git
git push -u origin main
```

Never commit `.env` (already in `.gitignore`).

---

## 🐛 Troubleshooting

| Issue | Fix |
|-------|-----|
| `ECONNREFUSED` on register | Wait for `In-Memory MongoDB ready` before signing up |
| Reacher timeout | Uses truemail-go fallback; or set `VERIFIER_ENGINE=truemail` |
| Bulk lost on tab switch | Return to **Bulk Verify** — job resumes from sessionStorage |
| All `no_smtp` | Port 25 blocked — try Docker Reacher |
| `docker` not found | Install Docker Desktop, restart PC |

---

## 📄 License

MIT — [LICENSE](LICENSE). Third-party code in `lib/` has its own licenses.

---

<div align="center">

**⭐ Star this repo if it saved you from paid verification APIs**

Made for developers who need **real SMTP checks** without a subscription.

</div>
