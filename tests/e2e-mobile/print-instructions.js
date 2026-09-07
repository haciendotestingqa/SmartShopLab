#!/usr/bin/env node

console.log(`
╔══════════════════════════════════════════════════════════════════╗
║           SmartShopLab — Tests E2E Mobile (Maestro)              ║
╚══════════════════════════════════════════════════════════════════╝

Prerequisitos comunes:
  1. Backend:   npm run dev:backend
  2. Metro:     npm run start -w mobile-app
  3. Expo Go + Maestro CLI
  4. .env.ai-evals (solo para test:mobile:ai / flows con juez)

── Android ────────────────────────────────────────────────────────
  • Emulador AVD + Expo Go
  • mobile-app/.env → EXPO_PUBLIC_API_URL=http://10.0.2.2:3001
  • (opcional) .env.maestro.local:
      MAESTRO_PLATFORM=android
      MAESTRO_DEVICE=emulator-5554
  • adb en PATH (el runner hace reverse 8081/3001)

── iOS ────────────────────────────────────────────────────────────
  • Simulador booted + Expo Go
  • mobile-app/.env → EXPO_PUBLIC_API_URL=http://localhost:3001
  • Metro con localhost (evita 2 entradas en Recently opened):
      npm run start:localhost -w mobile-app
  • .env.maestro.local:
      MAESTRO_PLATFORM=ios
      # MAESTRO_DEVICE=<UDID>  (opcional si ya hay un sim booted)
      # MAESTRO_EXPO_URL=exp://127.0.0.1:8081
  • Sin adb. Ver UDID: xcrun simctl list devices booted

Comandos (misma API; la plataforma la marca .env.maestro.local):
  npm run test:mobile:help
  npm run test:mobile:ai
  npm run test:mobile -- tests/e2e-mobile/flows/catalog-and-cart.yaml

Contraste del lab:
  • Web  → Playwright + ai-mock
  • App  → Maestro ai-chat.yaml (UI + juez LLM)

Reporte HTML (no se pisan entre sí):
  tests/e2e-mobile/reports/maestro-report-android.html
  tests/e2e-mobile/reports/maestro-report-ios.html
  tests/e2e-mobile/reports/maestro-ai-report-android.html   # test:mobile:ai
  tests/e2e-mobile/reports/maestro-ai-report-ios.html       # test:mobile:ai

Documentación Maestro: https://maestro.mobile.dev
`);
