# After you restart your PC (Docker installed)

Follow these steps **in order** in PowerShell.

## 1. Open Docker Desktop

Wait until Docker says **“Docker Desktop is running”** (whale icon steady, not starting).

## 2. Start Reacher (free verifier engine)

```powershell
cd "D:\Email Verifier Github\email-verifier-app"
docker compose up -d
```

First run downloads the image (~1–2 GB). Wait until it finishes.

Check it is running:

```powershell
docker ps
```

You should see `email-verifier-reacher` on port `8081`.

## 3. Start the web app

```powershell
cd "D:\Email Verifier Github\email-verifier-app"
npm start
```

Wait for:

- `Using Reacher engine` **or** `Using truemail-go engine`
- `Server running on port 5000`

## 4. Open the app

Browser: **http://localhost:5000**

Log in → **Settings** → should show **Active engine: reacher** (if Docker is up).

## 5. Understand the result columns

| Column | Meaning |
|--------|---------|
| **valid = no** | Mailbox not confirmed — normal for bad/fake emails |
| **mailbox = no** | SMTP ran and rejected the address (good detection) |
| **mailbox = no_smtp** | Port 25 blocked — install Docker Reacher fixes this |
| **valid = yes** | Only real mailboxes SMTP accepted |

If **every** row was `no` with truemail only, that often means either:

- All emails in the file are actually invalid, **or**
- SMTP was blocked (`no_smtp`) — use Reacher after reboot.

## 6. `.env` (already set for you)

```env
VERIFIER_ENGINE=auto
```

- Docker running → uses **Reacher**
- Docker not running → uses **truemail-go**

To force Reacher after Docker works:

```env
VERIFIER_ENGINE=reacher
```

## Troubleshooting

| Problem | Fix |
|---------|-----|
| `docker` not recognized | Finish PC restart; open **Docker Desktop** once |
| Reacher not starting | `docker compose logs` |
| Still all `no_smtp` | ISP blocks port 25; Reacher in Docker often still works |
| App says verifier offline | `docker compose up -d` then `npm start` again |
