# Deploying GroundEd on Vultr

One Vultr server runs everything with Docker Compose: **Caddy** serves the React app and HTTPS, and forwards
`/api/*` to the **FastAPI backend**. Config: `deploy/docker-compose.yml`, `deploy/Caddyfile`.

```
Browser ──HTTPS──► Caddy (web container) ──/api/*──► FastAPI (backend container) ──► SQLite (volume)
                     └── serves the React build
```

> Vultr's menus change over time; names below may differ slightly. Check current prices before choosing a plan.

---

## 0. Before you start (on your laptop)

1. **Vultr account** with the hackathon credit applied (Billing → shows the credit).
2. **SSH key** (lets you log in without a password):
   ```bash
   ssh-keygen -t ed25519 -C "groundEd-vultr"     # press Enter for the default path
   cat ~/.ssh/id_ed25519.pub                       # copy this line
   ```
   Vultr → **Account → SSH Keys → Add SSH Key** → paste it.
3. Your **Gemini API key** (same one as in `backend/.env`). Never commit it.

## 1. Create the server

Vultr → **Deploy → Cloud Compute (shared CPU)**:

| Setting | Choose | Why |
|---|---|---|
| Location | Closest to your users (e.g. Singapore for the Philippines) | Speed |
| Image | **Ubuntu 24.04 LTS** (or the Marketplace **Docker** image, which has Docker preinstalled) | Supported, long-term |
| Plan | **2 vCPU / 4 GB RAM** | Building the React app needs memory; 1 GB plans can fail during `npm run build` |
| SSH key | The key from step 0 | Login |
| Firewall | Create a group: allow **22** (SSH, ideally your IP only), **80** and **443** (web) | Only what is needed |

Deploy, wait until it is **Running**, and copy its **public IPv4 address** (e.g. `203.0.113.5`).

## 2. Log in and install Docker

```bash
ssh root@203.0.113.5
```
If you chose plain Ubuntu (skip if you used the Docker image):
```bash
curl -fsSL https://get.docker.com | sh
docker compose version        # should print a version
```

## 3. Get the code

```bash
git clone https://github.com/educ-jkescritor/GroundEd.git && cd GroundEd
git switch main                 # the release branch (use develop only for a test deployment)
```
If the repository is **private**, GitHub will ask for credentials: use a **fine-grained personal access token**
(read-only, this repo only) as the password, or add a read-only **deploy key** to the repo.

## 4. Configure secrets on the server

```bash
cp backend/.env.example backend/.env
nano backend/.env               # set GEMINI_API_KEY; set CORS_ORIGINS to your site address (step 5)
chmod 600 backend/.env          # readable only by root
```
`.env` stays on the server. It is git-ignored and excluded from the Docker image (`backend/.dockerignore`).

## 5. Choose the web address (HTTPS without buying a domain)

Use **sslip.io**: the address `203-0-113-5.sslip.io` (your IP with dashes) points to your server automatically,
and Caddy gets a free HTTPS certificate for it.

```bash
export SITE_ADDRESS=203-0-113-5.sslip.io
```
Put `CORS_ORIGINS=https://203-0-113-5.sslip.io` in `backend/.env`. With your own domain, point an A record at the
IP and use the domain instead.

## 6. Start it

```bash
SITE_ADDRESS=203-0-113-5.sslip.io docker compose -f deploy/docker-compose.yml up -d --build
docker compose -f deploy/docker-compose.yml ps        # both services "running"
```
The first build takes a few minutes.

## 7. Check it works

```bash
curl https://203-0-113-5.sslip.io/api/health
# {"status":"ok","gemini_configured":true,"versions":{"pipeline":"...","registry":"...","library":"...","rules":"..."}}
curl https://203-0-113-5.sslip.io/api/samples
curl -F sample_id=legacy-php-lab https://203-0-113-5.sslip.io/api/analyze | head -c 300
```
Then open `https://203-0-113-5.sslip.io` in a browser, run a sample, upload a PDF, and try an AI draft.

The `versions` in `/api/health` should match what `uv run python -m app.cli registry` / the provenance stamp shows
locally: that proves the server runs the same knowledge base.

## 8. Everyday operations

| Task | Command (from the `GroundEd` folder) |
|---|---|
| Deploy a new version | `git pull && SITE_ADDRESS=... docker compose -f deploy/docker-compose.yml up -d --build` |
| See logs | `docker compose -f deploy/docker-compose.yml logs -f backend` |
| Restart | `docker compose -f deploy/docker-compose.yml restart` |
| Stop | `docker compose -f deploy/docker-compose.yml down` (data volume is kept) |

## 9. Safety and cost

- **No login yet** (known hackathon gap). For a public demo use the **sample PDFs**; reports are deleted after
  `UPLOAD_RETENTION_HOURS` (24 h) and uploaded files immediately after analysis.
- **Gemini billing:** use a key whose Google Cloud project has billing linked (paid tier), so module quotes sent
  for drafts are not used to train models.
- **Credits:** a running server is billed per hour even when idle. **Destroy** it after the hackathon if you no
  longer need it (stopping is not enough on most plans). Snapshots and backups cost extra.
- Keep SSH restricted (key login, firewall), and never paste the API key into chat, issues or commits.

## Troubleshooting

| Symptom | Likely cause → fix |
|---|---|
| Browser shows a certificate error | DNS/sslip address wrong, or ports 80/443 closed in the firewall |
| `npm run build` killed during build | Not enough RAM → use a 4 GB plan |
| `/api/health` shows `gemini_configured: false` | `GEMINI_API_KEY` missing in `backend/.env` → fix, then `up -d` |
| Uploads fail with a CORS error | `CORS_ORIGINS` does not match the exact `https://` address |
| `/api/...` returns 502 | Backend container not running → `logs backend` |
