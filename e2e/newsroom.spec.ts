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

test("a large photo is compressed and uploaded from the editor, and the story can be deleted", async ({ page }) => {
  page.on("dialog", (d) => void (d.type() === "prompt" ? d.accept("A rain chart") : d.accept()));
  await page.goto("/en/login?next=/en/admin");
  await page.getByLabel("Email", { exact: true }).fill(EMAIL);
  await page.getByLabel("Password", { exact: true }).fill(PASSWORD);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await page.waitForURL((u) => u.pathname === "/en/admin");

  await page.goto("/en/admin/articles/new");
  await page.getByLabel("Headline").fill(`E2E image story ${Date.now()}`);
  await page.getByRole("button", { name: "Create draft" }).click();
  await expect(page).toHaveURL(/\/en\/admin\/articles\/[a-f0-9]{24}$/);
  const id = page.url().split("/").pop()!;

  // No Cloudinary in tests: the API call is answered with an existing library image, and its size is measured.
  const library = await page.evaluate(async () => {
    const res = await fetch("/api/v1/admin/media?limit=1");
    return ((await res.json()) as { data: unknown[] }).data[0];
  });
  const uploads: Buffer[] = [];
  await page.route("**/api/v1/admin/media", async (route) => {
    if (route.request().method() !== "POST") return route.continue();
    uploads.push(route.request().postDataBuffer()!);
    await route.fulfill({ status: 201, contentType: "application/json", body: JSON.stringify({ data: library }) });
  });

  // Random noise compresses badly, so this PNG is far above the 4 MB upload limit.
  const base64 = await page.evaluate(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 2800;
    canvas.height = 1800;
    const ctx = canvas.getContext("2d")!;
    const img = ctx.createImageData(canvas.width, canvas.height);
    for (let i = 0; i < img.data.length; i++) img.data[i] = i % 4 === 3 ? 255 : Math.random() * 255;
    ctx.putImageData(img, 0, 0);
    return canvas.toDataURL("image/png").split(",")[1]!;
  });
  const photo = { name: "photo.png", mimeType: "image/png", buffer: Buffer.from(base64, "base64") };
  expect(photo.buffer.length).toBeGreaterThan(4_000_000);

  await page.locator('label:has-text("Upload image") input[type=file]').setInputFiles(photo);
  await expect(page.getByLabel("Image alt text").or(page.getByRole("button", { name: "Remove image" })).first()).toBeVisible({ timeout: 45_000 });
  expect(uploads).toHaveLength(1);
  expect(uploads[0]!.length).toBeLessThan(3_700_000);
  expect(uploads[0]!.toString("latin1")).toContain("image/webp");

  const chooser = page.waitForEvent("filechooser");
  await page.getByRole("button", { name: "Image", exact: true }).click();
  await (await chooser).setFiles(photo);
  const inBody = page.getByRole("textbox", { name: "Body" }).locator('img[alt="A rain chart"]');
  await expect(inBody).toBeVisible({ timeout: 45_000 });
  expect(uploads).toHaveLength(2);

  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect(page.getByRole("status").filter({ hasText: "Saved" })).toBeVisible();
  await page.reload();
  await expect(inBody).toBeVisible();

  await page.getByRole("button", { name: "Delete permanently" }).click();
  await page.waitForURL((u) => u.pathname === "/en/admin/articles");
  const gone = await page.evaluate(async (a) => (await fetch(`/api/v1/admin/articles/${a}`)).status, id);
  expect(gone).toBe(404);
});

test("an admin creates a role and adds a tag from the editor", async ({ page }) => {
  page.on("dialog", (d) => void d.accept());
  await page.goto("/en/login?next=/en/admin");
  await page.getByLabel("Email", { exact: true }).fill(EMAIL);
  await page.getByLabel("Password", { exact: true }).fill(PASSWORD);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await page.waitForURL((u) => u.pathname === "/en/admin");

  await page.goto("/en/admin/roles");
  await expect(page.getByText("Sub-admin", { exact: true })).toBeVisible();
  const name = `Copy desk ${Date.now()}`;
  await page.locator("form").getByLabel("Name (English)").fill(name);
  await page.locator("#new-article\\:create").check();
  await page.getByRole("button", { name: "Create role" }).click();
  await expect(page.getByText(name, { exact: true })).toBeVisible();

  await page.goto("/en/admin/users");
  await expect(page.getByRole("heading", { name: "Add a user" })).toBeVisible();
  await expect(page.locator("form").first().locator("select option", { hasText: name })).toHaveCount(1);

  await page.goto("/en/admin/articles/new");
  await page.getByLabel("Headline").fill(`E2E tag story ${Date.now()}`);
  await page.getByRole("button", { name: "Create draft" }).click();
  await expect(page).toHaveURL(/\/en\/admin\/articles\/[a-f0-9]{24}$/);
  const tag = `tag${Date.now()}`;
  await page.getByPlaceholder("Add a tag").fill(tag);
  await page.keyboard.press("Enter");
  await expect(page.getByRole("button", { name: `Delete: ${tag}` })).toBeVisible();
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
  // What protects the area is the page served; Next.js may report 200 while first rendering the rewrite.
  await page.goto("/en/admin");
  await expect(page.getByRole("heading", { name: "You do not have access to this area" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Dashboard" })).toHaveCount(0);
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
  for (const path of ["/en/admin", "/en/admin/articles", "/en/admin/seo", "/en/admin/calendar", "/en/admin/media", "/en/admin/taxonomy", "/en/admin/users", "/en/admin/roles"]) {
    await page.goto(path);
    await expect(page.locator("#cms-main h1")).toBeVisible();
    await page.waitForTimeout(1000);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(`${path}: ${overflow}`).toBe(`${path}: 0`);
  }
});
