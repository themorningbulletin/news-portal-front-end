import { ADSENSE_CLIENT } from "@/lib/config";

/**
 * The single AdSense line, derived from the configured publisher id
 * (NEXT_PUBLIC_ADSENSE_CLIENT="ca-pub-…"). Check it against the ads.txt
 * snippet shown in your AdSense account. Without an id this returns 404.
 */
export function GET() {
  if (!ADSENSE_CLIENT) return new Response("Not found", { status: 404 });
  const pub = ADSENSE_CLIENT.replace(/^ca-/, "");
  return new Response(`google.com, ${pub}, DIRECT, f08c47fec0942fa0\n`, {
    headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "public, max-age=3600" },
  });
}
