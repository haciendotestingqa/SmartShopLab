# SmartShopLab

Laboratorio de pruebas de vanguardia que simula una tienda **e-commerce omnicanal** (web + app móvil sincronizadas) con asistente de inteligencia artificial integrado. Diseñado para ejecutarse en máquinas **Linux** y **macOS**.

### Demo en vivo

| Pieza | URL |
|-------|-----|
| Web | https://smart-shop-lab-web-frontend.vercel.app |
| API | https://smartshoplab.onrender.com/health |
| Reportes QA | https://haciendotestingqa.github.io/SmartShopLab/ |

- **Sin clonar:** web + API + reportes HTML.  
- **App móvil:** hay que **clonar** el repo, instalar dependencias, arrancar **Metro** y abrir en **Expo Go** (sección C). No hay QR público ni APK/IPA para abrir la app sin eso.

Guía completa: sección **Cómo probar el lab** (caminos A / B / C).

## Visión del proyecto

SmartShopLab Omnichannel es un entorno controlado para practicar:

- Desarrollo full stack con TypeScript estricto
- Pruebas E2E (Playwright web, Maestro mobile)
- Pruebas de carga (K6), integración API (Newman/Postman)
- Contract testing (Pact) y evaluación de calidad IA

## Estructura del monorepo

```
SmartShopLab/
├── backend/              # API Node.js/Express (TS)
├── web-frontend/         # React + Vite + Tailwind
├── mobile-app/           # React Native + Expo + NativeWind
└── tests/
    ├── e2e-web/          # Playwright
    ├── e2e-mobile/       # Maestro YAML flows
    ├── performance/      # K6
    ├── api-integration/  # Postman/Newman
    ├── contract-tests/   # Pact
    └── ai-evals/         # Evaluación IA (alucinaciones)
```

## Requisitos

| Herramienta | Versión mínima | Para qué |
|-------------|----------------|----------|
| Node.js | 20+ | Monorepo, web, API, scripts de test |
| npm | 10+ | Instalar workspaces |
| Git | cualquiera | Clonar el repo |
| Playwright browsers | Chromium (vía `npx playwright`) | E2E web (`test:web*`) — se instala **después** de `npm install` |
| K6 | última estable | Carga (`test:load`) |
| Maestro CLI | 2.x | E2E móvil (`test:mobile*`) |
| Newman | (incluida en el monorepo; global opcional) | API Postman (`test:api-postman*`) |

**Solo app móvil / Maestro (sección C), además:**
| Extra | Notas |
|-------|--------|
| Android Studio + AVD con Play Store **o** Xcode Simulator (macOS) | Emulador/simulador encendido |
| Expo Go (SDK 52) | En el emulador/simulador/dispositivo |
| `adb` en el PATH (Android) | Suele venir con Android SDK `platform-tools` |
| `.env.ai-evals` con `OPENROUTER_API_KEY` | Solo para `test:mobile:ai` / `test:ai*` con API local |

### Herramientas de testing (instalación)

#### Linux (Ubuntu/Debian)

```bash
# Node.js 20 + npm (si no están instalados)
# El paquete nodejs de NodeSource ya incluye npm
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs
# Si `npm -v` falla (Node sin npm), instálalo aparte:
# sudo apt-get install -y npm
node -v && npm -v

# Maestro CLI
curl -Ls "https://get.maestro.mobile.dev" | bash

# K6
sudo gpg -k
sudo gpg --no-default-keyring --keyring /usr/share/keyrings/k6-archive-keyring.gpg \
  --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69
echo "deb [signed-by=/usr/share/keyrings/k6-archive-keyring.gpg] https://dl.k6.io/deb stable main" | \
  sudo tee /etc/apt/sources.list.d/k6.list
sudo apt-get update && sudo apt-get install k6

# Newman (Postman CLI) — opcional; el monorepo ya trae newman en la raíz
npm install -g newman newman-reporter-htmlextra

# Pact (el lab usa `npm run test:contract*` del monorepo; CLI global opcional)
npm install -g @pact-foundation/pact-cli
```

> **Playwright:** no lo instales aquí todavía. Primero clona el repo y corre `npm install` (sección siguiente); luego `npx playwright install --with-deps chromium`.

#### macOS

```bash
# Node.js + npm + K6 (si no están instalados)
# `brew install node` incluye npm
brew install node k6
node -v && npm -v

# Maestro CLI
curl -Ls "https://get.maestro.mobile.dev" | bash

# Newman (Postman CLI) — opcional si usas la del monorepo; Pact CLI opcional
npm install -g newman newman-reporter-htmlextra @pact-foundation/pact-cli
```

> **Playwright:** igual que en Linux — **después** de clonar + `npm install` (sección siguiente): `npx playwright install chromium`.

## Instalación del repositorio

```bash
git clone https://github.com/haciendotestingqa/SmartShopLab.git
cd SmartShopLab
npm install

# Playwright (browsers E2E web) — obligatorio para npm run test:web*
# Linux:
npx playwright install --with-deps chromium
# macOS:
# npx playwright install chromium
```

## Ejecución local del repositorio

Tras **Instalación del repositorio** (incluye browsers de Playwright si vas a correr `test:web*`), desde la raíz:

```bash
# Backend (:3001) + Web (:5173) en paralelo
npm run dev

# Solo backend (puerto 3001)
npm run dev:backend

# Solo web (puerto 5173)
npm run dev:web

# App móvil (Metro / Expo Go) — detalle en sección C
npm run dev:mobile
```

Con `npm run dev` o `npm run dev:web`, la tienda **web** queda en http://localhost:5173.

### Variables de entorno

| Variable | Descripción | Default |
|----------|-------------|---------|
| `PORT` | Puerto backend | `3001` |
| `VITE_API_URL` | URL API para web (local vacío = proxy Vite; en Vercel: Render) | `` / `https://smartshoplab.onrender.com` |
| `EXPO_PUBLIC_API_URL` | URL API para mobile | Local Android: `http://10.0.2.2:3001` · Hosted: `https://smartshoplab.onrender.com` |
| `OPENROUTER_API_KEY` | Key OpenRouter (chat app + evals) | — (archivo `.env.ai-evals` en local; env var en Render) |
| `OPENROUTER_MODEL` | Modelo free OpenRouter | `nvidia/nemotron-3.5-lightning:free` |


## Matriz de tests

| Script | Herramienta | Prerequisitos |
|--------|-------------|---------------|
| `npm run test:web` | Playwright | `npm install` + browsers Playwright; auto-levanta backend + web |
| `npm run test:mobile` | Maestro | App en Expo Go + emulador · HTML: `maestro-report-android.html` / `maestro-report-ios.html` |
| `npm run test:mobile:ai` | Maestro + LLM-as-judge | Emulador + Metro + backend + `.env.ai-evals` · HTML: `maestro-ai-report-*.html` |
| `npm run test:load` | K6 | Backend en `:3001` |
| `npm run test:api-postman` | Newman | Backend `:3001` — suite completa (debe pasar) |
| `npm run test:api-postman:fail` | Newman | Backend `:3001` — **Lab:** falla a propósito (`count === 999`) |
| `npm run test:contract` | Pact crítico (consumer + provider **verde**) | Backend `:3001` |
| `npm run test:contract:consumer` | Pact consumer (contrato real) | No requiere backend |
| `npm run test:contract:provider` | Pact provider (debe pasar) | Backend `:3001` |
| `npm run test:contract:consumer:demo-fail` | Consumer demo `magicField` | No requiere backend |
| `npm run test:contract:provider:demo-fail` | Provider demo (**FAIL esperado**) | Backend `:3001` |
| `npm run test:ai` | OpenRouter + reglas | `.env.ai-evals` con API key |
| `npm run test:ai:judge` | OpenRouter + LLM-as-judge | `.env.ai-evals` (sin emulador) |


### Cómo probar el lab

| Camino | Canal | ¿Hay que clonar? | Para qué |
|--------|-------|------------------|----------|
| **A** | **Web** (+ API hosted) | No | Abrir la tienda en el navegador; no incluye la app móvil |
| **B** | **Web** + API + suites de lab | Sí | Playwright (web), Pact, Newman, k6; **no** es la app móvil |
| **C** | **App móvil** | **Sí (obligatorio)** | Ver la app en Expo Go y/o correr Maestro |

#### URLs desplegadas (referencia)

| Pieza | URL | Qué verás |
|-------|-----|-----------|
| **Web (Vercel)** | https://smart-shop-lab-web-frontend.vercel.app | Tienda (catálogo, carrito, chat mock) |
| **API (Render)** | https://smartshoplab.onrender.com | Solo API JSON (no hay UI en `/`) |
| Health | https://smartshoplab.onrender.com/health | `{"status":"ok",...}` |
| Productos | https://smartshoplab.onrender.com/api/products | Catálogo JSON |

> En el plan free de Render, la **primera** petición puede tardar ~30–60 s (cold start).

---

#### A) Web — demo hosted (sin clonar)

Canal: **web** en Vercel + **API** en Render.

Ideal para una revisión rápida **sin instalar nada**:

1. Abre la **web**: https://smart-shop-lab-web-frontend.vercel.app  
2. Comprueba catálogo, carrito y chat (en web el chat usa **ai-mock**).  
3. (Opcional) Verifica la API:  
   - https://smartshoplab.onrender.com/health  
   - https://smartshoplab.onrender.com/api/products  
4. (Opcional) Reportes QA: https://haciendotestingqa.github.io/SmartShopLab/  
5. La raíz https://smartshoplab.onrender.com/ responde `Cannot GET /` → **es normal** (solo API).

Para la **app móvil** → sección **C**.

---

#### B) Web + API — lab local (suites, sin app móvil)

Canal: **web** local (`:5173`) + **API** local (`:3001`) y las suites que las ejercitan.

**Paso 1 — Repo listo**

Si aún no lo hiciste: sección **Instalación del repositorio** (`clone` + `npm install` + browsers de Playwright).

**Paso 2 — Dejar el stack corriendo** (terminal 1; déjala abierta)

```bash
npm run dev
# backend http://localhost:3001
# web    http://localhost:5173
```

**Paso 3 — Correr las suites** (terminal 2, desde la raíz del repo, **en este orden**)

| # | Qué | Comando | Resultado esperado | Reporte HTML |
|---|-----|---------|--------------------|--------------|
| 1 | E2E web (Playwright) | Elige **una**: `npm run test:web` · `test:web:ui` · `test:web:headed:slow` | Debe pasar | `tests/e2e-web/reports/playwright-report.html` |
| 2 | Pact consumer | `npm run test:contract:consumer` | 3/3 OK (no necesita API) | `tests/contract-tests/reports/pact-consumer-report.html` |
| 3 | Pact provider | `npm run test:contract:provider` | **Verde** (contrato real) | `tests/contract-tests/reports/pact-provider-report.html` |
| 3b | Pact provider demo | `npm run test:contract:provider:demo-fail` | **FAIL esperado** (`magicField`) | `tests/contract-tests/reports/pact-provider-demo-fail-report.html` |
| 4 | Newman OK | `npm run test:api-postman` | 0 failed | `tests/api-integration/reports/newman-report.html` |
| 5 | Newman FAIL demo | `npm run test:api-postman:fail` | Falla a propósito (`count === 999`) | `tests/api-integration/reports/newman-demo-fail-report.html` |
| 6 | Carga k6 | `npm run test:load` | ~40 s | `tests/performance/reports/k6-report.html` |

**Qué automatiza cada suite (web / API)**

| Suite | Qué demuestra / flujo |
|-------|------------------------|
| **Playwright** | Ver tabla siguiente (compra + chat mock). |
| **Pact consumer** | El front (`web-frontend`) define el contrato real de `GET /api/products`, `GET /api/cart`, `POST /api/ai/chat` (sin `magicField`). Genera el pact crítico. |
| **Pact provider** | Verifica el pact crítico contra el backend → **debe pasar (verde)** en CI. |
| **Pact demo FAIL** | Consumer `web-frontend-demo-break` exige `magicField`; el provider demo **falla a propósito** para enseñar un rompimiento. Aislado del gate crítico (`continue-on-error`). |
| **Newman OK** | Colección Postman: health, products, product by id, cart, add to cart, AI chat — asserts HTTP/JSON; debe pasar. |
| **Newman FAIL demo** | Misma idea de API, pero un assert incorrecto (`count === 999`) para ver un fallo claro en el reporte HTML. |
| **k6** | **Capacity** (~40 s): rampa de VUs contra `/health`, `/api/products` y `/api/ai/chat` (mock); umbrales **p95/p99**, **error rate** y **timeouts** explícitos. No mide calidad del modelo (eso es Maestro AI / `test:ai`). |

**Qué automatiza Playwright (`npm run test:web`)** — canal **web**, Chromium:

| Spec | Flujo automatizado |
|------|--------------------|
| `purchase-flow.spec.ts` | Resetea el carrito → abre `/` → locators por **role/name** → añade **SmartBook Pro Laptop** → assert de outcome (badge 3, línea laptop ×2, total `$2849.97`). |
| `ai-chat.spec.ts` | Abre el FAB (`getByRole`) → dialog + placeholder + Enviar → pregunta precio laptop → texto SmartBook/1299; segundo caso: “garantía de por vida”. `getByTestId` solo en burbujas de chat. |

Notas:
- Los pasos 3–6 necesitan el backend del paso 2 (Pact consumer no).
- El E2E web ya incluye el chat con **mock**. Juez LLM / Maestro → sección **C**.
- Solo OpenRouter sin emulador: `npm run test:ai:judge` (requiere `.env.ai-evals`).

---

#### C) App móvil — clonar + Expo Go + Metro

Canal: **app móvil** (React Native / Expo SDK 52). No es la web de Vercel ni `localhost:5173`.

La app **no** tiene URL pública tipo Vercel. Quien quiera verla o correr Maestro debe:

1. Clonar este repo  
2. Arrancar **Metro** en su máquina (desde el workspace `mobile-app`, no desde la raíz)  
3. Abrir el proyecto en **Expo Go** (emulador, simulador o dispositivo)

El backend puede ser el de **Render** (más simple) o el **local** (`:3001`). No hace falta cuenta Expo ni `eas project:init` solo para ver la app en local.

##### C.1 — Preparación (una vez)

Si aún no clonaste: sección **Instalación del repositorio**. Luego:

```bash
cp mobile-app/.env.example mobile-app/.env
```

**Android (AVD + Expo Go)**

1. AVD con **Play Store** (p. ej. API 36) encendido: Android Studio → Device Manager, o `emulator -avd <nombre>`.
2. `adb devices` debe listar el emulador (p. ej. `emulator-5554`).
3. En el emulador: Play Store → instala **Expo Go** (paquete `host.exp.exponent`; compatible con SDK 52).
4. Si `adb` / `emulator` no están en el PATH:

```bash
export ANDROID_HOME="$HOME/Android/Sdk"
export PATH="$PATH:$ANDROID_HOME/emulator:$ANDROID_HOME/platform-tools"
```

**iOS:** Simulator en macOS + Expo Go en el simulador.

##### C.2 — Elegir API y editar `mobile-app/.env`

Deja **una sola** `EXPO_PUBLIC_API_URL` activa (comenta las demás):

| Opción | Cuándo usarla | Valor en `.env` | Extra |
|--------|---------------|-----------------|-------|
| **Render** | Probar la app sin backend local | `https://smartshoplab.onrender.com` | Primera carga puede tardar (cold start). Chat = LLM real vía Render. |
| **Local + Android** | Lab completo en tu PC | `http://10.0.2.2:3001` | `10.0.2.2` = localhost del PC desde el AVD. Terminal: `npm run dev:backend` |
| **Local + iOS** | Lab en Simulator | `http://localhost:3001` | Terminal: `npm run dev:backend` |

En todos los casos deja: `EXPO_PUBLIC_AI_PROVIDER=openrouter`.

Con API local, comprueba: `curl http://127.0.0.1:3001/health` → 200.

##### C.3 — Arrancar Metro y abrir la app

Arranca Metro **con** `-w mobile-app` (en monorepo, no uses `npx expo` desde la raíz).

**Android**

```bash
npm run start -w mobile-app
# En Metro: tecla `a`  → abre Expo Go en el emulador
```

Si el emulador no carga el bundle (o ves “Something went wrong” / “Sorry about that”), reaplica reverse (se pierde al reiniciar el AVD) y vuelve a abrir:

```bash
adb reverse tcp:8081 tcp:8081
adb reverse tcp:3001 tcp:3001   # solo si usas API local
adb shell am start -a android.intent.action.VIEW \
  -d "exp://127.0.0.1:8081" \
  host.exp.exponent
```

**iOS (macOS)**

```bash
npm run start:localhost -w mobile-app
# En Metro: tecla `i`  → abre Expo Go en el Simulator
```

Comprueba manualmente: catálogo, carrito y chat.

##### C.4 — Maestro E2E (app ya abierta en Expo Go)

Canal: **app móvil** en Expo Go. Configura plataforma (si hace falta):

```bash
cp .env.maestro.local.example .env.maestro.local
# Android (default): no hace falta tocar nada
# iOS: descomenta MAESTRO_PLATFORM=ios
```

**Qué automatiza cada flow**

| Comando | Flow | Flujo automatizado |
|---------|------|--------------------|
| `npm run test:mobile -- tests/e2e-mobile/flows/catalog-and-cart.yaml` | `catalog-and-cart.yaml` | Abre el proyecto en Expo Go → espera el catálogo → toca **añadir al carrito** (primer producto) → abre el carrito → comprueba `cart-view` y `cart-total`. |
| `npm run test:mobile:ai` | `ai-chat.yaml` | Abre el chat → pregunta por laptops → espera respuesta del **LLM real** (OpenRouter) → un **juez LLM** + checks de catálogo validan que mencione SmartBook/1299, no invente políticas y `pass=true`. Con API local hace falta `.env.ai-evals`. |

```bash
npm run test:mobile -- tests/e2e-mobile/flows/catalog-and-cart.yaml
npm run test:mobile:ai
```

`npm run test:mobile` reaplica `adb reverse` en Android. Reportes:

- UI: `tests/e2e-mobile/reports/maestro-report-android.html` / `maestro-report-ios.html` → en Pages: **Mobile (Maestro)**
- AI + juez: `maestro-ai-report-android.html` / `maestro-ai-report-ios.html` → en Pages: **AI Evals**

Si Maestro falla con `TimeoutException` / puerto del driver ocupado (default **7001**), en `.env.maestro.local` descomenta `MAESTRO_DRIVER_HOST_PORT` (p. ej. `7005`).

---

### AI: por qué hay dos formas de probar el asistente

En este lab el chat existe en **web** y en **app**, pero las pruebas de IA están **separadas a propósito**. No es el mismo test duplicado: cada canal enseña un enfoque distinto de QA sobre LLM.

| | **Web — mock** | **App — LLM real + juez** |
|--|----------------|---------------------------|
| **Objetivo** | Validar el **flujo de UI** del chat (abrir, enviar, ver respuesta) de forma **rápida, estable y barata**, sin depender de un modelo externo. | Validar la **calidad de la respuesta** del asistente real: si se apega al catálogo, no inventa políticas, etc. |
| **Qué se controla** | El backend usa `ai-mock.ts`: respuestas **deterministas**. Playwright comprueba texto esperado. | La app habla con **OpenRouter** (LLM real). Luego un **segundo LLM (juez)** puntúa la respuesta con una rúbrica (`catalog.ts` / asserts en Maestro). |
| **Cuándo usarlo** | Regresión diaria, CI, demos sin API key. Fallos = bug de UI o integración, no “el modelo alucinó hoy”. | Eval de calidad / alucinaciones. Fallos = el asistente (o el juez) no cumple la rúbrica. |
| **Comando** | `npm run test:web` | `npm run test:mobile:ai` |

**Idea clave:** el mock responde a *“¿el producto de chat funciona?”*; el juez responde a *“¿lo que dice la IA es aceptable para la tienda?”*. Juntos cubren producto + calidad, sin mezclar flaky de modelos en el E2E web.

**k6 vs calidad del modelo:** `npm run test:load` mide **capacidad** (latencia p95/p99, errores, timeouts bajo concurrencia). No sustituye Maestro AI / `test:ai` / `test:ai:judge`, que evalúan **calidad** de la respuesta.

En `ai-chat.yaml` (app) verás asserts del estilo:
- catálogo: menciona SmartBook / 1299  
- catálogo: no inventa políticas  
- juez: `matches_catalog`, `no_hallucination`, `pass`

```bash
# App — UI + juez en el mismo flow (emulador + Metro + backend + .env.ai-evals)
npm run test:mobile:ai

# Mismo criterio de juez, sin emulador (solo OpenRouter)
npm run test:ai:judge
```

### AI Evals heurísticos (opcional)

Tercer camino, más liviano: `npm run test:ai` aplica **reglas/keywords** sobre respuestas OpenRouter (sin juez LLM). Sirve para practicar evals deterministas; **no sustituye** el contraste web-mock vs app-judge.

```bash
# 1) API key en https://openrouter.ai/keys
# 2) Archivo local (gitignored)
cp .env.ai-evals.example .env.ai-evals
# Edita .env.ai-evals y pega tu OPENROUTER_API_KEY

# 3) Evals heurísticas
npm run test:ai
```

Modelo por defecto: `nvidia/nemotron-3.5-lightning:free`. Los `:free` a veces tardan **1–2 min por caso**. Si falla (429/timeout), el runner reintenta y usa `OPENROUTER_FALLBACK_MODELS`.

## Design System

| Token | Color | Uso |
|-------|-------|-----|
| Primary Dark | `#1E293B` | Header |
| Primary Main | `#2563EB` | Precios |
| Accent | `#7C3AED` | CTA, botón IA |
| Background | `#F9FAFB` | Fondo |
| Text | `#0F172A` | Texto principal |

Tipografía: **Inter** (400, 600, 700). Contraste WCAG AA.

## API Endpoints

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/health` | Health check |
| GET | `/api/products` | Catálogo |
| GET | `/api/products/:id` | Detalle producto |
| GET | `/api/cart` | Carrito (badge inicial: 2) |
| POST | `/api/cart/items` | Añadir al carrito |
| POST | `/api/cart/reset` | Reset del carrito (usado por E2E web) |
| POST | `/api/ai/chat` | Chat con asistente IA (mock en web; OpenRouter en app si aplica) |
| POST | `/api/ai/judge` | LLM-as-judge (rúbrica; key en `.env.ai-evals`) |

## Licencia

Proyecto de laboratorio educativo elaborado por @haciendotestingqa — SmartShopLab.
