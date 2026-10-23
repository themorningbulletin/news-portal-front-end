import { describe, expect, it } from "vitest";
import { negotiate } from "@/proxy";
import { splitAfterParagraph } from "@/lib/body";
import { dhakaDay, formatDateTime, formatTime, toBnDigits } from "@/lib/format";
import { jsonLd } from "@/lib/seo";
import { decodeSlug, paths, safeNext } from "@/lib/urls";

describe("locale negotiation", () => {
  it("defaults to Bangla and honours q-values", () => {
    expect(negotiate(null)).toBe("bn");
    expect(negotiate("en-US,en;q=0.9")).toBe("en");
    expect(negotiate("fr-FR,en;q=0.5,bn;q=0.8")).toBe("bn");
    expect(negotiate("de-DE")).toBe("bn");
    expect(negotiate("en;q=0")).toBe("bn");
  });
});

describe("dates in the newsroom time zone", () => {
  it("formats deterministically in Asia/Dhaka", () => {
    const iso = "2026-10-22T02:05:00Z"; // 08:05 in Dhaka
    expect(formatTime("en", iso)).toBe("08:05");
    expect(formatTime("bn", iso)).toBe("সকাল ৮:০৫");
    expect(formatDateTime("en", iso)).toBe("22 October 2026, 08:05");
    expect(dhakaDay("2026-10-21T19:30:00Z")).toBe("2026-10-22");
    expect(toBnDigits("2026")).toBe("২০২৬");
  });
});

describe("URLs", () => {
  it("normalises encoded and decoded Bangla slugs to the same value", () => {
    const slug = "জাতীয়";
    expect(decodeSlug(encodeURIComponent(slug))).toBe(slug.normalize("NFC"));
    expect(decodeSlug(slug.normalize("NFD"))).toBe(slug.normalize("NFC"));
    expect(decodeSlug("%E0%A6")).toBe("%E0%A6");
    expect(paths.article("bn", "ক খ")).toBe("/bn/news/%E0%A6%95%20%E0%A6%96");
  });

  it("only accepts same-site paths after sign-in", () => {
    expect(safeNext("/bn/account", "/x")).toBe("/bn/account");
    expect(safeNext("//evil.example", "/x")).toBe("/x");
    expect(safeNext("https://evil.example", "/x")).toBe("/x");
    expect(safeNext("/\\evil", "/x")).toBe("/x");
    expect(safeNext(null, "/x")).toBe("/x");
  });
});

describe("article body splitting for in-article ads", () => {
  it("splits after top-level paragraphs only", () => {
    const html = "<p>1</p><blockquote><p>q</p></blockquote><p>2</p><p>3</p><p>4</p>";
    const [a, b] = splitAfterParagraph(html, 3);
    expect(a).toBe("<p>1</p><blockquote><p>q</p></blockquote><p>2</p><p>3</p>");
    expect(b).toBe("<p>4</p>");
    expect(splitAfterParagraph("<p>only</p>", 3)).toEqual(["<p>only</p>", ""]);
  });
});

describe("JSON-LD serialisation", () => {
  it("cannot break out of its script tag", () => {
    const out = jsonLd({ headline: "</script><script>alert(1)</script>" });
    expect(out).not.toContain("</script>");
    expect(JSON.parse(out).headline).toBe("</script><script>alert(1)</script>");
  });
});
