import { defineConfig, devices } from "@playwright/test";

/**
 * End-to-end tests run against a production build:
 *   API  : back-end `npm run dev:memory` (in-memory MongoDB with demo content)
 *   Auth : Firebase Auth emulator on 127.0.0.1:9099 (firebase.json at the repo root)
 *   Web  : `next start` on :3000
 * Locally, already-running servers are reused.
 */
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  timeout: 60_000,
  reporter: [["list"]],
  use: {
    baseURL: process.env.E2E_BASE_URL ?? "http://localhost:3000",
    trace: "retain-on-failure",
  },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
    { name: "mobile", use: { ...devices["Pixel 7"] }, testMatch: /public\.spec\.ts/ },
  ],
  webServer: [
    {
      command: "npx -y firebase-tools@15.34.1 emulators:start --only auth --project demo-khoka-news",
      cwd: "..",
      url: "http://127.0.0.1:9099",
      reuseExistingServer: true,
      timeout: 180_000,
    },
    {
      command: "npm run dev:memory",
      cwd: "../back-end",
      url: "http://localhost:4000/api/v1/ready",
      reuseExistingServer: true,
      timeout: 180_000,
      env: {
        DEV_MEMORY_EPHEMERAL: "true",
        FIREBASE_AUTH_EMULATOR_HOST: "127.0.0.1:9099",
        FIREBASE_PROJECT_ID: "demo-khoka-news",
        // The suite signs in many times from one IP; real limits stay in place everywhere else.
        RATE_LIMIT_MULTIPLIER: "20",
      },
    },
    {
      command: "npm run start",
      url: "http://localhost:3000/bn",
      reuseExistingServer: true,
      timeout: 180_000,
    },
  ],
});
