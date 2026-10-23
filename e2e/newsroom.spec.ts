import { execFileSync } from "node:child_process";
import path from "node:path";
import { expect, test } from "@playwright/test";

/*
 * Full editorial journey through the real stack: Firebase Auth emulator
 * sign-in, HttpOnly session cookie, CSRF-protected CMS calls, publishing and
 * cache revalidation of the public site.
 */

const EMULATOR = "http://127.0.0.1:9099";
const EMAIL = `e2e-admin-${Date.now()}@example.test`;
const PASSWORD = "correct-horse-battery-1";

test.beforeAll(async () => {
  const res = await fetch(`${EMULATOR}/identitytoolkit.googleapis.com/v1/accounts:signUp?key=demo-api-key`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email: EMAIL, password: PASSWORD, returnSecureToken: true }),
  });
  expect(res.ok).toBe(true);
  // Grant admin the same way an operator would: with the bootstrap script.
  execFileSync(process.execPath, [path.resolve("../back-end/node_modules/tsx/dist/cli.mjs"), "src/scripts/bootstrap-admin.ts", "--email", EMAIL, "--force"], {
    cwd: path.resolve("../back-end"),
    env: {
      ...process.env,
      MONGODB_URI: process.env.E2E_MONGODB_URI ?? "mongodb://127.0.0.1:27027/khoka-news",
      FIREBASE_AUTH_EMULATOR_HOST: "127.0.0.1:9099",
      FIREBASE_PROJECT_ID: "demo-khoka-news",
      NODE_ENV: "development",
      LOG_LEVEL: "silent",
    },
    stdio: "pipe",
  });
});

test("an editor signs in, writes, publishes and the story goes live", async ({ page }) => {
  page.on("dialog", (d) => void d.accept());

  await page.goto("/en/login?next=/en/admin");
  await page.getByLabel("Email", { exact: true }).fill(EMAIL);
  await page.getByLabel("Password", { exact: true }).fill(PASSWORD);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await page.waitForURL((u) => u.pathname === "/en/admin");
  await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();

  // The session cookie is HttpOnly: page scripts cannot read it.
  const cookies = await page.context().cookies();
  expect(cookies.find((c) => c.name === "khoka_session")?.httpOnly).toBe(true);
  expect(await page.evaluate(() => document.cookie)).not.toContain("khoka_session");

  const headline = `E2E bridge plan approved ${Date.now()}`;
  await page.goto("/en/admin/articles/new");
  await page.getByLabel("Headline").fill(headline);
  await page.getByRole("button", { name: "Create draft" }).click();
  await expect(page).toHaveURL(/\/en\/admin\/articles\/[a-f0-9]{24}$/);

  await page.getByLabel("Summary").fill("A summary that is long enough to satisfy the newsroom checklist.");
  const body = page.getByRole("textbox", { name: "Body" });
  await body.click();
  await page.keyboard.type("The council approved the plan after a public consultation. Work will begin once funding is confirmed and contractors are selected.");
  await page.getByLabel("Section").selectOption({ label: "Economy" });
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect(page.getByRole("status").filter({ hasText: "Saved" })).toBeVisible();

  await page.getByRole("button", { name: "Publish", exact: true }).click();
  await expect(page.getByText("Published", { exact: true }).first()).toBeVisible();

  // The public page is revalidated by the API webhook and now exists.
  const viewLive = page.getByRole("link", { name: "View on site" });
  const href = await viewLive.getAttribute("href");
  expect(href).toMatch(/^\/en\/news\//);
  const res = await page.goto(href!);
  expect(res?.status()).toBe(200);
  await expect(page.locator("h1")).toHaveText(headline);
});

test("newsroom pages are protected on the server before anything renders", async ({ page, request }) => {
  // Anonymous: redirected to sign-in, and the page HTML is never served.
  const res = await request.get("/en/admin/articles", { maxRedirects: 0 });
  expect(res.status()).toBe(307);
  expect(res.headers()["location"]).toContain("/en/login?next=%2Fen%2Fadmin%2Farticles");
  expect((await request.get("/bn/preview-frame/0123456789abcdef01234567", { maxRedirects: 0 })).status()).toBe(307);
  await page.goto("/en/admin/seo");
  await expect(page).toHaveURL(/\/en\/login\?next=/);
  // The API rejects the same request independently.
  expect((await request.get("/api/v1/admin/articles")).status()).toBe(401);
});

test("a signed-in reader without newsroom permission gets 403", async ({ page }) => {
  const email = `e2e-reader-${Date.now()}@example.test`;
  await fetch(`${EMULATOR}/identitytoolkit.googleapis.com/v1/accounts:signUp?key=demo-api-key`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email, password: PASSWORD, returnSecureToken: true }),
  });
  await page.goto("/en/login");
  await page.getByLabel("Email", { exact: true }).fill(email);
  await page.getByLabel("Password", { exact: true }).fill(PASSWORD);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await page.waitForURL((u) => u.pathname === "/en/account");
  const res = await page.goto("/en/admin");
  expect(res?.status()).toBe(403);
  await expect(page.getByRole("heading", { name: "You do not have access to this area" })).toBeVisible();
});

test("editors get the SEO dashboard, the calendar and live SEO analysis", async ({ page }) => {
  await page.goto("/en/login?next=/en/admin/seo");
  await page.getByLabel("Email", { exact: true }).fill(EMAIL);
  await page.getByLabel("Password", { exact: true }).fill(PASSWORD);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await page.waitForURL((u) => u.pathname === "/en/admin/seo");
  await expect(page.getByRole("heading", { name: "SEO dashboard" })).toBeVisible();
  await expect(page.getByText("Stories analysed")).toBeVisible();
  await expect(page.getByRole("link", { name: "Fix" }).first()).toBeVisible();

  await page.getByRole("link", { name: "Fix" }).first().click();
  await expect(page.getByRole("heading", { name: "SEO analysis" })).toBeVisible();
  await page.getByLabel("Focus keyword").fill("rain");
  await expect(page.getByText("Google search result preview")).toBeVisible();
  await expect(page.getByRole("img", { name: /SEO \d+\/100/ }).first()).toBeVisible();

  await page.goto("/en/admin/calendar");
  await expect(page.getByRole("heading", { name: "Content calendar" })).toBeVisible();
});

test("newsroom screens fit a phone screen without sideways scrolling", async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 780 });
  await page.goto("/en/login?next=/en/admin");
  await page.getByLabel("Email", { exact: true }).fill(EMAIL);
  await page.getByLabel("Password", { exact: true }).fill(PASSWORD);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await page.waitForURL((u) => u.pathname === "/en/admin");
  for (const path of ["/en/admin", "/en/admin/articles", "/en/admin/seo", "/en/admin/calendar", "/en/admin/media", "/en/admin/taxonomy", "/en/admin/users"]) {
    await page.goto(path);
    await expect(page.locator("#cms-main h1")).toBeVisible();
    await page.waitForTimeout(1000);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(`${path}: ${overflow}`).toBe(`${path}: 0`);
  }
});
