#!/usr/bin/env node

console.log(`
╔══════════════════════════════════════════════════════════════════╗
║           SmartShopLab — Tests E2E Mobile (Maestro)              ║
╚══════════════════════════════════════════════════════════════════╝

Common prerequisites:
  1. Backend:   npm run dev:backend
  2. Metro:     npm run start -w mobile-app
  3. Expo Go + Maestro CLI
  4. .env.ai-evals (only for test:mobile:ai / judge flows)

── Android ────────────────────────────────────────────────────────
  • Emulador AVD + Expo Go
  • mobile-app/.env → EXPO_PUBLIC_API_URL=http://10.0.2.2:3001
  • (optional) .env.maestro.local:
      MAESTRO_PLATFORM=android
      MAESTRO_DEVICE=emulator-5554
  • adb in PATH (runner runs reverse 8081/3001)

── iOS ────────────────────────────────────────────────────────────
  • Simulador booted + Expo Go
  • mobile-app/.env → EXPO_PUBLIC_API_URL=http://localhost:3001
  • Metro with localhost (avoids duplicate Recently opened entries):
      npm run start:localhost -w mobile-app
  • .env.maestro.local:
      MAESTRO_PLATFORM=ios
      # MAESTRO_DEVICE=<UDID>  (optional if a sim is already booted)
      # MAESTRO_EXPO_URL=exp://127.0.0.1:8081
  • Sin adb. Ver UDID: xcrun simctl list devices booted

Commands (same API; platform from .env.maestro.local):
  npm run test:mobile:help
  npm run test:mobile:ai
  npm run test:mobile -- tests/e2e-mobile/flows/catalog-and-cart.yaml

Lab contrast:
  • Web  → Playwright + ai-mock
  • App  → Maestro ai-chat.yaml (UI + LLM judge)

HTML reports (do not overwrite each other):
  tests/e2e-mobile/reports/maestro-report-android.html
  tests/e2e-mobile/reports/maestro-report-ios.html
  tests/e2e-mobile/reports/maestro-ai-report-android.html   # test:mobile:ai
  tests/e2e-mobile/reports/maestro-ai-report-ios.html       # test:mobile:ai

Maestro docs: https://maestro.mobile.dev
`);
