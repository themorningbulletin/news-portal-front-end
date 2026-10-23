import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

const API = process.env.E2E_API_URL ?? "http://localhost:4000/api/v1";

async function firstArticle(locale: "bn" | "en") {
  const res = await fetch(`${API}/articles?locale=${locale}&limit=1`);
  const json = (await res.json()) as { data: { slug: string; title: string; translationGroup: string }[] };
  return json.data[0]!;
}

async function noHorizontalOverflow(page: Page) {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(1);
}

async function expectNoSeriousA11yViolations(page: Page) {
  const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"]).analyze();
  const serious = results.violations.filter((v) => v.impact === "serious" || v.impact === "critical");
  expect(serious.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(" | ")}`)).toEqual([]);
}

test("root redirects to a language edition", async ({ page }) => {
  const res = await page.goto("/");
  expect(page.url()).toMatch(/\/(bn|en)$/);
  expect(res?.status()).toBe(200);
});

test("Bangla homepage renders server-side with correct language and no overflow", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 800 });
  const res = await page.goto("/bn");
  expect(res?.status()).toBe(200);
  await expect(page.locator("html")).toHaveAttribute("lang", "bn");
  await expect(page.locator("main h2").first()).toBeVisible();
  await noHorizontalOverflow(page);
  // Headline text is in the server HTML, not added by client JavaScript.
  const html = await (await fetch(new URL("/bn", page.url()).toString())).text();
  const article = await firstArticle("bn");
  expect(html).toContain(article.title);
});

test("homepage, article, section and search pages have no serious accessibility violations", async ({ page }) => {
  const article = await firstArticle("en");
  for (const path of ["/en", `/en/news/${article.slug}`, "/en/category/economy", "/bn", "/en/search"]) {
    await page.goto(path);
    await expectNoSeriousA11yViolations(page);
  }
});

async function translatedArticle() {
  const res = await fetch(`${API}/articles?locale=en&limit=50`);
  const list = (await res.json()) as { data: { slug: string }[] };
  for (const a of list.data) {
    const detail = (await (await fetch(`${API}/articles/by-slug/${a.slug}?locale=en`)).json()) as { data: { slug: string; title: string; translations: unknown[] } };
    if (detail.data.translations.length) return detail.data;
  }
  throw new Error("no translated story in the demo content");
}

test("article page has metadata, structured data and a working language switch", async ({ page }) => {
  const article = await translatedArticle();
  await page.goto(`/en/news/${article.slug}`);
  await expect(page.locator("h1")).toHaveText(article.title);
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", new RegExp(`/en/news/${article.slug}$`));
  await expect(page.locator('link[rel="alternate"][hreflang="bn-BD"]')).toHaveCount(1);
  const ld = await page.locator('script[type="application/ld+json"]').allTextContents();
  const news = ld.map((t) => JSON.parse(t)).flat().find((d) => d["@type"] === "NewsArticle" || d["@type"] === "OpinionNewsArticle");
  expect(news.headline).toBe(article.title);

  await page.getByRole("link", { name: "বাংলায় পড়ুন", exact: true }).click();
  await expect(page).toHaveURL(/\/bn\/news\//);
  await expect(page.locator("html")).toHaveAttribute("lang", "bn");
});

test("missing stories and sections return real 404 responses", async ({ page }) => {
  expect((await page.goto("/en/news/this-story-does-not-exist"))?.status()).toBe(404);
  expect((await page.goto("/en/category/not-a-section"))?.status()).toBe(404);
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
});

test("saved dark theme is applied before first paint and persists", async ({ page }) => {
  await page.addInitScript(() => {
    // Seed the preference once; later reloads must keep whatever the reader chose.
    if (!sessionStorage.getItem("seeded")) {
      sessionStorage.setItem("seeded", "1");
      localStorage.setItem("theme", "dark");
    }
    document.addEventListener("DOMContentLoaded", () => {
      (window as unknown as { __themeAtDcl: string | null }).__themeAtDcl = document.documentElement.getAttribute("data-theme");
    });
  });
  await page.goto("/en");
  expect(await page.evaluate(() => (window as unknown as { __themeAtDcl: string | null }).__themeAtDcl)).toBe("dark");
  await page.getByLabel("Colour scheme").selectOption("light");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
});

test("keyboard users can skip to the main content", async ({ page }) => {
  await page.goto("/en");
  await page.keyboard.press("Tab");
  const skip = page.getByRole("link", { name: "Skip to main content" });
  await expect(skip).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/#main$/);
});

test("search finds stories, including inflected Bangla words", async ({ page }) => {
  await page.goto("/en/search?q=inflation");
  await expect(page.getByRole("heading", { name: /Results for “inflation”/ })).toBeVisible();
  await expect(page.getByRole("link", { name: "What inflation is, and how it is measured" })).toBeVisible();
  await page.goto(`/bn/search?q=${encodeURIComponent("বাজেট")}`);
  await expect(page.getByRole("link", { name: "মূল্যস্ফীতি কী, আর কীভাবে তা মাপা হয়" })).toBeVisible();
});

test("reader controls change text size and focus mode", async ({ page }) => {
  const article = await firstArticle("en");
  await page.goto(`/en/news/${article.slug}`);
  await page.getByRole("button", { name: "Larger text" }).click();
  await expect(page.locator("html")).toHaveAttribute("data-text-size", "lg");
  await page.getByRole("button", { name: "Focus mode" }).click();
  await expect(page.getByRole("navigation", { name: "Breadcrumb" })).toBeHidden();
});

test("SEO files are served and expose only public URLs", async ({ request }) => {
  const robots = await (await request.get("/robots.txt")).text();
  expect(robots).toContain("Disallow: /*/admin");
  expect(robots).toMatch(/Sitemap: .*\/sitemap\.xml/);
  const index = await (await request.get("/sitemap.xml")).text();
  expect(index).toContain("/sitemaps/articles-bn-1.xml");
  const articles = await request.get("/sitemaps/articles-en-1.xml");
  expect(articles.headers()["content-type"]).toContain("xml");
  const xml = await articles.text();
  expect(xml).toContain("/en/news/");
  expect(xml).toContain('hreflang="bn-BD"');
  expect(xml).not.toContain("/admin");
  // No publisher id configured: no ads.txt and no ad scripts.
  expect((await request.get("/ads.txt")).status()).toBe(404);
});

test("no ad scripts or consent banner load without an AdSense configuration", async ({ page }) => {
  await page.goto("/en");
  await expect(page.locator('script[src*="googlesyndication"]')).toHaveCount(0);
  await expect(page.getByRole("region", { name: "Your privacy choices" })).toHaveCount(0);
});

test("the sections menu closes after choosing a link, on Escape and on an outside tap", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/en");
  const toggle = page.getByRole("button", { name: /Open menu|All sections/ });
  await toggle.click();
  const panel = page.locator("[id^='_r'], [id^='«']").filter({ has: page.getByRole("link", { name: "Economy" }) });
  await expect(page.getByRole("link", { name: "Economy" }).last()).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(toggle).toHaveAttribute("aria-expanded", "false");

  await toggle.click();
  await page.mouse.click(200, 700);
  await expect(toggle).toHaveAttribute("aria-expanded", "false");

  await toggle.click();
  await page.getByRole("link", { name: "Archive" }).last().click();
  await expect(page).toHaveURL(/\/en\/archive$/);
  await expect(page.getByRole("button", { name: /Open menu|All sections/ })).toHaveAttribute("aria-expanded", "false");
  await expect(panel).toHaveCount(0);
});

test("public pages fit a 320px phone screen without sideways scrolling", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 720 });
  const article = await translatedArticle();
  for (const path of ["/bn", "/en", `/en/news/${article.slug}`, "/bn/latest", "/en/category/economy", "/en/topics", "/en/archive", "/en/search?q=rain", "/en/login"]) {
    await page.goto(path);
    await page.waitForLoadState("networkidle");
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(`${path}: ${overflow}`).toBe(`${path}: 0`);
  }
});
