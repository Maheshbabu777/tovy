import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './tests',
  testMatch: '*.e2e.ts',
  timeout: 120_000,
  workers: 1,
  reporter: 'list',
  use: {
    baseURL: 'http://localhost:8081',
    launchOptions: {
      executablePath: process.env.CHROMIUM_PATH ?? '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
      args: ['--no-sandbox'],
    },
  },
  // Serves the exported web build: EXPO_PUBLIC_* vars set, then `npx expo export --platform web`.
  webServer: { command: 'npx serve dist -s -l 8081', url: 'http://localhost:8081', reuseExistingServer: true },
})
