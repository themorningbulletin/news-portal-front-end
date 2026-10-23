import { connection } from "next/server";
import { newsSitemap, xmlResponse } from "@/lib/sitemap";

/**
 * Only enable after confirming the publication meets Google News content
 * policies; inclusion is decided by Google, not by this file.
 */
export async function GET() {
  await connection();
  if (process.env.NEWS_SITEMAP_ENABLED !== "true") return new Response("Not found", { status: 404 });
  return xmlResponse(await newsSitemap());
}
