import { timingSafeEqual } from "node:crypto";
import { revalidateTag } from "next/cache";

const TAG = /^[\p{L}\p{M}\p{N}:._-]{1,256}$/u;

/**
 * Called by the API after publishing events. Stale entries are expired
 * immediately so an unpublished or corrected story is never served again.
 */
export async function POST(request: Request) {
  const secret = process.env.REVALIDATE_SECRET ?? "";
  const sent = request.headers.get("x-revalidate-secret") ?? "";
  const a = Buffer.from(sent);
  const b = Buffer.from(secret);
  if (secret.length < 32 || a.length !== b.length || !timingSafeEqual(a, b)) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }
  let tags: unknown;
  try {
    tags = ((await request.json()) as { tags?: unknown }).tags;
  } catch {
    return Response.json({ error: "bad_request" }, { status: 400 });
  }
  if (!Array.isArray(tags) || tags.length === 0 || tags.length > 100 || !tags.every((t) => typeof t === "string" && TAG.test(t))) {
    return Response.json({ error: "bad_request" }, { status: 400 });
  }
  for (const tag of new Set(tags as string[])) revalidateTag(tag, { expire: 0 });
  return Response.json({ revalidated: tags.length });
}
