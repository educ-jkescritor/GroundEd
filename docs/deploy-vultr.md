# Deploying GroundEd on Vultr

One Vultr server runs everything with Docker Compose: **Caddy** is the front door (website files, HTTPS,
safety headers, upload size cap) and forwards `/api/*` to the **FastAPI backend**. Config: `deploy/docker-compose.yml`,
`deploy/Caddyfile`. This guide records the first real deployment (2026-11-15) step by step.

```
Browser ──HTTPS──► Caddy (web container) ──/api/*──► FastAPI (backend container) ──► SQLite (volume)
                     └── serves the React build
```

> Vultr's console changes over time; menu names may differ. Prices below were shown on 2026-11-15.

## Reference deployment (hackathon)

| Item | Value |
|---|---|
| Plan | Cloud Compute, Shared CPU, `vc2-2c-4gb` (2 vCPU / 4 GB / 80 GB), Singapore, $20/mo (~$0.027/h) |
| OS | Ubuntu 24.04 LTS x64 (LTS: years of security updates; not the short-lived .10 releases) |
| Extras | Automatic backups off, DDoS protection off |
| Code | `/opt/GroundEd`, branch `develop` (switch to `main` for the final release) |
| Address | `https://<ip-with-dashes>.sslip.io` (free name for the IP, real Let's Encrypt certificate via Caddy) |

---

## 1. SSH key (on your laptop, once)

An SSH key is the pass for logging in to the server remotely. The **private** key stays on the laptop; the **public**
key (`.pub`) goes to the server. Use a separate key per purpose and protect it with a passphrase.

```bash
ssh-keygen -t ed25519 -a 100 -C "groundEd-vultr" -f ~/.ssh/id_ed25519_vultr
chmod 700 ~/.ssh
```

## 2. Create the server (Vultr console)

Compute → **Instance** → **Shared CPU** → **Cloud Compute** → plan `vc2-2c-4gb` → **Singapore** → Configure:
**Ubuntu 24.04 LTS x64**, label/hostname `grounded-demo`, public IPv4, backups off, DDoS off, limited user off.

- If the console lets you add the SSH key, select it. If the key field does not work (it did not for us), deploy
  without it and use step 3.
- Do not press Enter inside the form: it can submit immediately. Check the summary (image, features, total) first.

Wait until the server is **Running**, then copy its IP and the root password (eye icon on the server page).

## 3. Install the key and log in (laptop)

```bash
ssh-copy-id -i ~/.ssh/id_ed25519_vultr.pub root@<IP>     # first login: type 'yes', then the Vultr root password
ssh -i ~/.ssh/id_ed25519_vultr root@<IP>                 # asks for the key passphrase; prompt becomes root@<host>
```
Prompt `…@MSI` = your laptop; prompt `root@<host>` = the server.

## 4. Secure the server (on the server)

```bash
cloud-init status --wait                                             # first-boot setup finished -> status: done
apt update && DEBIAN_FRONTEND=noninteractive apt -y upgrade          # security updates

# Key-only login (keep this window open; test a new login in a second window before closing it)
printf 'PasswordAuthentication no\nKbdInteractiveAuthentication no\nPermitRootLogin prohibit-password\n' \
  > /etc/ssh/sshd_config.d/00-grounded-hardening.conf
sshd -t && systemctl restart ssh && sshd -T | grep -E '^(passwordauthentication|permitrootlogin)'
# -> permitrootlogin without-password / passwordauthentication no

# Firewall: only SSH and web
ufw allow OpenSSH && ufw allow 80/tcp && ufw allow 443/tcp && ufw --force enable && ufw status

# If /var/run/reboot-required exists after the upgrade, reboot once now: reboot
```
Check from the laptop that passwords are refused:
`ssh -o PubkeyAuthentication=no root@<IP>` → `Permission denied (publickey)`.

## 5. Install Docker and get the code (on the server)

```bash
curl -fsSL https://get.docker.com | sh                 # Docker's official install script
docker --version && docker compose version
cd /opt && git clone -b develop https://github.com/educ-jkescritor/GroundEd.git && cd GroundEd && git log --oneline -1
```
The repository is public, so no GitHub token is needed. (A private repo needs a read-only token or deploy key.)

## 6. Settings: `backend/.env`

Copy your working `.env` from the laptop over SSH instead of retyping the API key:
```bash
# laptop, in the repo folder
scp -i ~/.ssh/id_ed25519_vultr backend/.env root@<IP>:/opt/GroundEd/backend/.env
```
```bash
# server, in /opt/GroundEd: set the site address, lock the file, check without printing the key
sed -i 's#^CORS_ORIGINS=.*#CORS_ORIGINS=https://<ip-with-dashes>.sslip.io#' backend/.env && chmod 600 backend/.env
grep -E '^(GEMINI_MODEL|GEMINI_FALLBACK_MODEL|CORS_ORIGINS)=' backend/.env && grep -c '^GEMINI_API_KEY=.\+' backend/.env
```
`.env` is git-ignored and excluded from the Docker image (`backend/.dockerignore`); it never leaves the server.

## 7. Start

```bash
SITE_ADDRESS=<ip-with-dashes>.sslip.io docker compose -f deploy/docker-compose.yml up -d --build
docker compose -f deploy/docker-compose.yml ps        # backend: Up (healthy), web: Up
```
First build: 2–4 minutes. The web container starts only after the backend reports healthy.

## 8. Check it (from anywhere)

```bash
curl https://<ip-with-dashes>.sslip.io/api/health      # status ok, gemini_configured true, versions
```
Then in a browser: run a sample, upload a module, open a finding, try an AI draft, download the report.
The `versions` in `/api/health` should equal the ones from the same commit run locally: same knowledge base.

---

## Updating (every new version)

1. Change code on a task branch → merge into `develop` → push (tests pass first; the server is never the first
   place new code runs).
2. On the server:
   ```bash
   cd /opt/GroundEd && git pull && SITE_ADDRESS=<ip-with-dashes>.sslip.io docker compose -f deploy/docker-compose.yml up -d --build
   ```
   Only changed layers rebuild (usually < 2 minutes); the old containers serve until the new ones are swapped in.
3. Check `/api/health`.

Kept across updates: the database volume (reports, feedback, draft cache), Caddy's certificate volume, `backend/.env`.

| Situation | Command (in `/opt/GroundEd`) |
|---|---|
| Only `.env` changed (e.g. Gemini model) | `SITE_ADDRESS=… docker compose -f deploy/docker-compose.yml up -d` (no rebuild) |
| Status | `docker compose -f deploy/docker-compose.yml ps` |
| Logs | `docker compose -f deploy/docker-compose.yml logs --tail 50 backend` |
| Roll back | `git log --oneline -5` → `git checkout <good-commit>` → same `up -d --build` |
| Release | `git switch main && git pull` → same `up -d --build` |

## Weekly source check (keeps the knowledge base honest)

GroundEd's facts quote official pages (php.net, MDN, …). `library check` re-fetches them and confirms every quote is
still there; the result appears in `/api/health` under `sources` (`ok`, `total`, `problems`, `checked_at`).
It only **reports**: a changed page is reviewed by a person, then the snapshot is rebuilt and redeployed.
Existing reports stay proven by the saved copies.

Run it once by hand, then schedule it (server, as root):
```bash
cd /opt/GroundEd && docker compose -f deploy/docker-compose.yml exec -T backend python -m app.cli library check
( crontab -l 2>/dev/null; echo '0 3 * * 1 cd /opt/GroundEd && docker compose -f deploy/docker-compose.yml exec -T backend python -m app.cli library check >> /var/log/grounded-source-check.log 2>&1' ) | crontab -
crontab -l    # every Monday 03:00 server time
```
Check: `curl https://<site>/api/health` → `"sources": {"ok": 30, "total": 30, "problems": 0, ...}`.
If `problems` > 0: `tail /var/log/grounded-source-check.log`, review the entry, rebuild the snapshot on a branch
(`library build --only <doc>`), and redeploy.

## Safety and cost

- **No login yet** (known hackathon gap). Share the link only once the frontend fixes are in; demo with the samples.
  Uploaded PDFs are deleted right after analysis; reports after 24 hours.
- **AI drafts:** limited to 5/min per visitor and 300/day; cached for 24 h. Pre-click the drafts you will demo, on the
  live server, on demo day (the first call can take ~20 s when Google is busy).
- **Gemini billing:** use a key whose Google Cloud project has billing linked (paid tier), so quotes sent for drafts
  are not used to train models.
- **Credits:** billed per hour while the server exists, even idle. **Destroy** it after the hackathon.

## Troubleshooting

| Symptom | Likely cause → fix |
|---|---|
| `Connection refused` / timeout on SSH right after creation | Server still booting → wait 1–2 minutes |
| `Permission denied (publickey)` | Wrong key → use `-i ~/.ssh/id_ed25519_vultr`; key not installed → step 3 |
| Compose: `project name must not contain uppercase` | Use a lowercase `-p` name (only when you pass one) |
| Browser certificate error | sslip address wrong, or ports 80/443 closed in the firewall |
| Website build killed | Not enough RAM → 4 GB plan |
| `/api/health` shows `gemini_configured: false` | `GEMINI_API_KEY` missing in `backend/.env` → fix, then `up -d` |
| `/api/...` returns 502 | Backend not running/healthy → `logs backend` |
