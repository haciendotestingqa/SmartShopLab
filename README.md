# SmartShopLab

[![QA Reports](https://github.com/haciendotestingqa/SmartShopLab/actions/workflows/qa-reports.yml/badge.svg)](https://github.com/haciendotestingqa/SmartShopLab/actions/workflows/qa-reports.yml)
[![Node.js](https://img.shields.io/badge/Node.js-20%2B-339933?logo=nodedotjs&logoColor=white)](https://nodejs.org/)
[![Playwright](https://img.shields.io/badge/Playwright-E2E%20web-2EAD33?logo=playwright&logoColor=white)](https://playwright.dev/)
[![Expo](https://img.shields.io/badge/Expo-SDK%2052-000020?logo=expo&logoColor=white)](https://expo.dev/)
[![Reports](https://img.shields.io/badge/QA%20reports-GitHub%20Pages-222?logo=githubpages&logoColor=white)](https://haciendotestingqa.github.io/SmartShopLab/)

Omnichannel e-commerce **QA lab** (web + mobile + API) with an AI store assistant (**Lumina**). Built to practice full-stack TypeScript and a layered test strategy: E2E, contracts, API, load, and LLM quality.

**Built by** [@haciendotestingqa](https://github.com/haciendotestingqa)

**CI evidence:** [Actions](https://github.com/haciendotestingqa/SmartShopLab/actions) · [latest green QA Reports run](https://github.com/haciendotestingqa/SmartShopLab/actions/workflows/qa-reports.yml)

## Table of contents

- [Overview](#overview)
- [Live demo](#live-demo)
- [Requirements](#requirements)
- [Quick start](#quick-start)
- [How to try the lab](#how-to-try-the-lab)
- [Test matrix](#test-matrix)
- [Project layout](#project-layout)
- [Environment variables](#environment-variables)
- [AI testing strategy](#ai-testing-strategy)
- [Design system](#design-system)
- [API endpoints](#api-endpoints)
- [CI/CD](#cicd)
- [License](#license)

## Overview

| Layer | Tool | What it validates |
|-------|------|-------------------|
| Web E2E | Playwright | Purchase flow + chat UI against **ai-mock** (stable, no API key) |
| Mobile E2E | Maestro | Catalog / cart in Expo Go |
| Mobile AI | Maestro + LLM-as-judge | Real OpenRouter reply quality vs catalog rubric |
| API | Newman / Postman | Health, products, cart, AI chat (+ intentional demo FAIL) |
| Contracts | Pact | Consumer/provider green path + `magicField` demo break |
| Load | k6 | Capacity (p95/p99, errors, timeouts) — not model quality |
| AI evals | OpenRouter + rules / judge | Hallucination probes and rubric scoring |
| Reports | GitHub Actions → Pages | HTML evidence published on every `main` push |

> [!NOTE]
> This is an **educational lab**, not a production store. Web chat uses a deterministic mock; the mobile app can call a real LLM (OpenRouter) for quality demos.

**Portfolio takeaway:** one monorepo that shows how to separate UI regression, contracts, capacity, and LLM quality instead of mixing them into a single flaky suite.

## Live demo

| Piece | URL |
|-------|-----|
| Web (Vercel) | https://smart-shop-lab-web-frontend.vercel.app |
| API health (Render) | https://smartshoplab.onrender.com/health |
| Catalog JSON | https://smartshoplab.onrender.com/api/products |
| QA reports (Pages) | https://haciendotestingqa.github.io/SmartShopLab/ |

- **No clone:** web + API + HTML reports.
- **Mobile:** clone → Metro → Expo Go (path **C**). No public APK/IPA/QR.

> [!WARNING]
> Render free tier has a **cold start** (~30–60 s on the first request). The web/app splash retries `/api/products` with backoff.

## Requirements

| Tool | Minimum | Used for |
|------|---------|----------|
| Node.js | 20+ | Monorepo, web, API, scripts |
| npm | 10+ | Workspaces |
| Git | any | Clone |
| Playwright browsers | Chromium | `test:web*` (install **after** `npm install`) |
| K6 | latest stable | `test:load` |
| Maestro CLI | 2.x | `test:mobile*` |
| Newman | bundled (global optional) | `test:api-postman*` |

**Mobile / Maestro also needs:** Android AVD with Play Store (or iOS Simulator), Expo Go SDK 52, `adb` on PATH (Android), and `.env.ai-evals` with `OPENROUTER_API_KEY` for AI flows.

### Tooling install (optional)

<details>
<summary>Linux (Ubuntu/Debian)</summary>

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs
node -v && npm -v

curl -Ls "https://get.maestro.mobile.dev" | bash

sudo gpg -k
sudo gpg --no-default-keyring --keyring /usr/share/keyrings/k6-archive-keyring.gpg \
  --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69
echo "deb [signed-by=/usr/share/keyrings/k6-archive-keyring.gpg] https://dl.k6.io/deb stable main" | \
  sudo tee /etc/apt/sources.list.d/k6.list
sudo apt-get update && sudo apt-get install k6
```

</details>

<details>
<summary>macOS</summary>

```bash
brew install node k6
curl -Ls "https://get.maestro.mobile.dev" | bash
node -v && npm -v
```

</details>

## Quick start

```bash
git clone https://github.com/haciendotestingqa/SmartShopLab.git
cd SmartShopLab
npm install

# Web E2E browsers
npx playwright install --with-deps chromium   # Linux
# npx playwright install chromium             # macOS

# API + web
npm run dev
# backend http://localhost:3001
# web     http://localhost:5173
```

> [!TIP]
> For a fast local validation loop (path **B**), keep `npm run dev` in one terminal and run the suites from the table in [How to try the lab](#how-to-try-the-lab) in another.

## How to try the lab

| Path | Channel | Clone? | Goal |
|------|---------|--------|------|
| **A** | Hosted web + API | No | Browse the store + reports |
| **B** | Local web + API + suites | Yes | Playwright, Pact, Newman, k6 |
| **C** | Mobile (Expo Go) | Yes | App UI + optional Maestro / AI judge |

### A) Hosted demo (no clone)

1. Open https://smart-shop-lab-web-frontend.vercel.app  
2. Check catalog, cart, and chat (**ai-mock** on web).  
3. Optional API: [/health](https://smartshoplab.onrender.com/health) · [/api/products](https://smartshoplab.onrender.com/api/products)  
4. Optional reports: https://haciendotestingqa.github.io/SmartShopLab/  
5. `https://smartshoplab.onrender.com/` → `Cannot GET /` is **expected** (API only).

### B) Local suites (web + API)

```bash
npm run dev   # terminal 1 — leave running
```

| # | Suite | Command | Expected | HTML report |
|---|-------|---------|----------|-------------|
| 1 | Playwright | `npm run test:web` | Pass | `tests/e2e-web/reports/playwright-report.html` |
| 2 | Pact consumer | `npm run test:contract:consumer` | 3/3 | `tests/contract-tests/reports/pact-consumer-report.html` |
| 3 | Pact provider | `npm run test:contract:provider` | Green | `tests/contract-tests/reports/pact-provider-report.html` |
| 3b | Pact demo FAIL | `npm run test:contract:provider:demo-fail` | **Expected FAIL** (`magicField`) | `.../pact-provider-demo-fail-report.html` |
| 4 | Newman OK | `npm run test:api-postman` | 0 failed | `tests/api-integration/reports/newman-report.html` |
| 5 | Newman demo FAIL | `npm run test:api-postman:fail` | Assert `count === 999` fails | `.../newman-demo-fail-report.html` |
| 6 | k6 | `npm run test:load` | ~40 s, thresholds OK | `tests/performance/reports/k6-report.html` |

**Playwright coverage:** `purchase-flow.spec.ts` (cart outcomes) · `ai-chat.spec.ts` (FAB + mock replies / lifetime-warranty trigger).

### C) Mobile app + Maestro

```bash
cp mobile-app/.env.example mobile-app/.env
# Pick ONE API URL, e.g. local Android:
# EXPO_PUBLIC_API_URL=http://10.0.2.2:3001
# EXPO_PUBLIC_AI_PROVIDER=openrouter

npm run start -w mobile-app    # press `a` for Android Expo Go
```

If the emulator loses Metro after AVD restart:

```bash
adb reverse tcp:8081 tcp:8081
adb reverse tcp:3001 tcp:3001   # local API only
```

| Command | Flow |
|---------|------|
| `npm run test:mobile -- tests/e2e-mobile/flows/catalog-and-cart.yaml` | Add to cart → open cart → assert total |
| `npm run test:mobile:ai` | Real LLM reply + catalog checks + LLM judge (`pass=true`) |

Publish local HTML into Pages-ready folders:

```bash
npm run reports:collect
# then commit published-reports/**/*.html when you want them on GitHub Pages
```

## Test matrix

| Script | Tool | Prerequisites |
|--------|------|---------------|
| `npm run test:web` | Playwright | Browsers installed; auto-starts stack |
| `npm run test:mobile` | Maestro | Expo Go + emulator |
| `npm run test:mobile:ai` | Maestro + judge | Metro + backend + `.env.ai-evals` |
| `npm run test:load` | k6 | Backend `:3001` |
| `npm run test:api-postman` | Newman | Backend `:3001` |
| `npm run test:api-postman:fail` | Newman | Backend `:3001` (lab FAIL) |
| `npm run test:contract` | Pact critical | Backend `:3001` |
| `npm run test:contract:consumer` | Pact consumer | No backend |
| `npm run test:contract:provider` | Pact provider | Backend `:3001` |
| `npm run test:contract:*:demo-fail` | Pact demo | Expected break |
| `npm run test:ai` | Heuristic evals | `.env.ai-evals` |
| `npm run test:ai:judge` | LLM judge only | `.env.ai-evals` (no emulator) |

## Project layout

```
SmartShopLab/
├── backend/                 # Express API (TS) + ai-mock / OpenRouter
├── web-frontend/            # React + Vite + Tailwind
├── mobile-app/              # React Native + Expo + NativeWind
├── tests/
│   ├── e2e-web/             # Playwright
│   ├── e2e-mobile/          # Maestro flows
│   ├── performance/         # k6
│   ├── api-integration/     # Postman / Newman
│   ├── contract-tests/      # Pact
│   └── ai-evals/            # Heuristic + LLM-as-judge
├── published-reports/       # Versioned HTML for GitHub Pages
└── .github/workflows/       # qa-reports.yml → Pages
```

## Environment variables

| Variable | Description | Default / notes |
|----------|-------------|-----------------|
| `PORT` | Backend port | `3001` |
| `VITE_API_URL` | Web API URL | Empty locally (Vite proxy); Render on Vercel |
| `EXPO_PUBLIC_API_URL` | Mobile API URL | `http://10.0.2.2:3001` (AVD) or Render URL |
| `EXPO_PUBLIC_AI_PROVIDER` | Mobile AI provider | `openrouter` for real LLM |
| `OPENROUTER_API_KEY` | OpenRouter key | `.env.ai-evals` (gitignored) / Render env |
| `OPENROUTER_MODEL` | Free model id | e.g. `nvidia/nemotron-3.5-lightning:free` |

> [!WARNING]
> OpenRouter **free-models-per-day** quotas are low. Retries + fallbacks burn the daily budget quickly. After changing `.env.ai-evals`, **restart the backend** so it reloads the key (avoid two processes on `:3001`).

## AI testing strategy

| | **Web — mock** | **App — real LLM + judge** |
|--|----------------|----------------------------|
| Goal | Stable chat **UI** regression | Reply **quality** vs catalog |
| Control | `backend/src/ai-mock.ts` | OpenRouter + second LLM judge |
| When | CI, demos without a key | Hallucination / rubric demos |
| Command | `npm run test:web` | `npm run test:mobile:ai` |

Mock answers *“does chat work?”*; the judge answers *“is the answer acceptable for the store?”*. k6 measures **capacity**, not model quality.

## Design system

Neon tokens (`#f714aa` / `#f97b3a` / `#f9d20c`) in `web-frontend/src/theme.ts` and `mobile-app/src/theme.ts`. Dark/light header toggle. Inter (400/600/700). WCAG AA contrast targets.

## API endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/health` | Health check |
| GET | `/api/products` | Catalog |
| GET | `/api/products/:id` | Product detail |
| GET | `/api/cart` | Cart |
| POST | `/api/cart/items` | Add / set / remove (`mode`) |
| PATCH | `/api/cart/items/:productId` | Set quantity |
| DELETE | `/api/cart/items/:productId` | Remove item |
| POST | `/api/cart/reset` | Reset cart (web E2E) |
| POST | `/api/ai/chat` | Lumina chat (mock or OpenRouter) |
| POST | `/api/ai/judge` | LLM-as-judge |

## CI/CD

Workflow: [`.github/workflows/qa-reports.yml`](.github/workflows/qa-reports.yml)

| Trigger | What happens |
|---------|----------------|
| Push to `main` / `workflow_dispatch` | Install → run web/API/contract/load suites → build reports site → deploy **GitHub Pages** |

- Concurrency group `qa-reports-pages` with `cancel-in-progress: true` (newer pushes cancel older runs).
- Hosted CD for the product: **Vercel** (web) · **Render** (API). Pages hosts **QA HTML**, not the store UI.
- Local HTML → `npm run reports:collect` → commit `published-reports/**/*.html` when you want a curated snapshot in git.

**Secrets / env (names only):** `OPENROUTER_API_KEY` on Render (and locally in `.env.ai-evals`). Do not commit keys.

## License

Educational lab by [@haciendotestingqa](https://github.com/haciendotestingqa) — SmartShopLab.
