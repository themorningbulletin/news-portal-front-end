/**
 * Splits sanitized article HTML after the Nth top-level paragraph so an
 * in-article ad can sit between paragraphs (never inside a quote or list).
 */
export function splitAfterParagraph(html: string, n: number): [string, string] {
  let count = 0;
  let depth = 0;
  const re = /<(\/?)(blockquote|ul|ol|figure)\b[^>]*>|<\/p>/gi;
  for (let m = re.exec(html); m; m = re.exec(html)) {
    if (m[2]) {
      depth += m[1] ? -1 : 1;
      continue;
    }
    if (depth === 0 && ++count === n) {
      const at = m.index + m[0].length;
      return [html.slice(0, at), html.slice(at)];
    }
  }
  return [html, ""];
}
