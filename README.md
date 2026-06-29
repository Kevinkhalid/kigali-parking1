# ParkEase — MOVE1

This is a static marketing/demo site for ParkEase located at `MOVE1.HTML`.

Quick local preview

```bash
cd "c:\Users\kiddy\Desktop\MOVE1"
python -m http.server 8000
# open http://localhost:8000/MOVE1.HTML
```

Run the Node static server (serves `MOVE1.HTML` at `/`):

```bash
cd "c:\Users\kiddy\Desktop\MOVE1"
node server.mjs
# open http://127.0.0.1:3000
```

Expose your local server publicly (optional):

1. Install ngrok: https://ngrok.com/
2. Start ngrok to forward port 3000:

```bash
ngrok http 3000
# use the https://… forwarding URL that ngrok shows
```

Deploy to Cloudflare Pages — Option A: Quick publish with Wrangler (no Git)

1. Install Wrangler and log in:

```bash
npm install -g wrangler
wrangler login
```

2. Publish the current folder (replace `move1-pages` with your project name):

```bash
cd "c:\Users\kiddy\Desktop\MOVE1"
wrangler pages publish . --project-name move1-pages
```

Note: `wrangler login` will prompt you to authenticate with Cloudflare in your browser.

Deploy to Cloudflare Pages — Option B: Git-backed (recommended)

1. Create a GitHub repository and push this folder (example):

```bash
cd "c:\Users\kiddy\Desktop\MOVE1"
git init
git add .
git commit -m "Initial site"
# create a GitHub repo and then:
git remote add origin https://github.com/<your-user>/move1.git
git branch -M main
git push -u origin main
```

2. In Cloudflare dashboard → Pages → Create a project → Connect to GitHub → choose the repo.
- Framework preset: None
- Build command: (leave empty)
- Build output directory: `.`
- Branch: `main`

Optional: I can create the GitHub repo for you (needs your GitHub authorization), or run `wrangler pages publish` here if you log in when prompted.

If you want, tell me to proceed with either:
- `A` — Run `wrangler pages publish` now (you'll authenticate when prompted)
- `B` — I push to a remote GitHub repo (provide the remote URL or grant access)
