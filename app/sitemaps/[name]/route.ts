import { childSitemap, xmlResponse } from "@/lib/sitemap";

export function generateStaticParams() {
  return [{ name: "pages.xml" }, { name: "categories.xml" }, { name: "articles-bn-1.xml" }, { name: "articles-en-1.xml" }];
}

export async function GET(_req: Request, { params }: RouteContext<"/sitemaps/[name]">) {
  const { name } = await params;
  const xml = await childSitemap(name);
  return xml ? xmlResponse(xml) : new Response("Not found", { status: 404 });
}
