import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './tests',
  testMatch: '*.e2e.ts',
  timeout: 120_000,
  workers: 1,
  reporter: 'list',
  use: {
    baseURL: 'http://localhost:8081',
    // The cloud sandbox only reaches Supabase through its HTTPS proxy, which Chromium does not pick up by itself.
    ...(process.env.HTTPS_PROXY ? { proxy: { server: process.env.HTTPS_PROXY, bypass: 'localhost,127.0.0.1' }, ignoreHTTPSErrors: true } : {}),
    launchOptions: {
      executablePath: process.env.CHROMIUM_PATH ?? '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
      args: ['--no-sandbox'],
    },
  },
  // Serves the exported web build: EXPO_PUBLIC_* vars set, then `npx expo export --platform web`.
  webServer: { command: 'npx serve dist -s -l 8081', url: 'http://localhost:8081', reuseExistingServer: true },
})
