# Amazon Product Scraper

A production-ready single-product Amazon scraper with a Next.js frontend and FastAPI backend.

## Architecture

| Service | Stack | Deployment target |
| --- | --- | --- |
| `frontend` | Next.js 15, TypeScript, Tailwind CSS | Vercel or Docker |
| `backend` | FastAPI, Playwright, BeautifulSoup | Render or Docker |

## Run locally

### Backend

```powershell
cd backend
py -3.12 -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
playwright install chromium
Copy-Item .env.example .env
uvicorn app.main:app --reload --port 8000
```

### Frontend

```powershell
cd frontend
npm install
Copy-Item .env.local.example .env.local
npm run dev
```

Open `http://localhost:3000`. The backend health check is available at `http://localhost:8000/health`.

## API

`POST /api/v1/scrape`

```json
{
  "product_url": "https://www.amazon.com/dp/B09B8V1LZ3"
}
```

The API returns the title, price, seller, ASIN, rating, ratings count, Best Sellers Rank, canonical product URL, and scrape timestamp. Missing Amazon fields are returned as `Not Found`.

## Deployment

### Backend on Render

1. Push this repository to GitHub.
2. In Render, create a new Blueprint and select the repository. Render reads [render.yaml](render.yaml).
3. When prompted, set `ALLOWED_ORIGINS` to the exact deployed Vercel origin, without a trailing slash.
4. Deploy, then confirm `https://your-render-service.onrender.com/health` returns `{"status":"ok"}`.

The Render build installs Chromium and its Linux dependencies for Playwright.

### Frontend on Vercel

1. Import the repository in Vercel and set the root directory to `frontend`.
2. Set `NEXT_PUBLIC_API_BASE_URL` to the deployed Render service origin, for example `https://your-render-service.onrender.com`.
3. Deploy. Configure the same Vercel origin as `ALLOWED_ORIGINS` in Render.

## Environment variables

### Backend (`backend/.env`)

| Variable | Required | Default | Purpose |
| --- | --- | --- | --- |
| `ALLOWED_ORIGINS` | Yes in production | `http://localhost:3000` | Comma-separated browser origins allowed by CORS. |
| `REQUEST_TIMEOUT_MS` | No | `30000` | Maximum page-navigation time in milliseconds. |
| `SCRAPER_RETRY_ATTEMPTS` | No | `3` | Number of attempts for transient Playwright failures. |
| `MAX_CONCURRENT_SCRAPES` | No | `2` | Per-process limit for concurrent Chromium sessions. |
| `LOG_LEVEL` | No | `INFO` | Python application log level. |

### Frontend (`frontend/.env.local`)

| Variable | Required | Default | Purpose |
| --- | --- | --- | --- |
| `NEXT_PUBLIC_API_BASE_URL` | Yes in production | `http://127.0.0.1:8000` | Public URL of the FastAPI service. This is embedded at build time. |

Use the provided `.env.example` and `.env.local.example` files as local templates. Do not commit production environment files.

## Docker

```powershell
docker compose up --build
```

The frontend is available on port 3000 and the backend on port 8000. The frontend Docker image receives `NEXT_PUBLIC_API_BASE_URL` as a build argument because Next.js exposes this value to browser code.

## Verification

```powershell
cd frontend
npm run typecheck
npm run build

cd ..\backend
.\.venv\Scripts\python.exe -m pytest -q
```
