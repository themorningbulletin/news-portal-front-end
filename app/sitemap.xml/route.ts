import { sitemapIndex, xmlResponse } from "@/lib/sitemap";

export async function GET() {
  return xmlResponse(await sitemapIndex());
}
