export type Source = { title: string; url: string }

/**
 * Map each source URL to its 1-based position in the global (deduped) Sources
 * list. Used to relabel per-section citation markers to global numbers so the
 * same source shows the same number everywhere in the brief.
 */
export function buildCiteMap(globalSources: Source[]): Map<string, number> {
  const map = new Map<string, number>()
  globalSources.forEach((s, i) => {
    if (s?.url && !map.has(s.url)) map.set(s.url, i + 1)
  })
  return map
}

/**
 * Rewrite inline `[n]` citation markers in a research report into markdown links
 * that point at the global Sources list.
 *
 * `n` is the section-local citation index (1-based) into `sectionSources`
 * (Tabstack orders citedPages by first appearance in that report). We resolve it
 * to the deduped global index via `citeMap` and relabel the marker to that
 * global number, emitting `[global](#source-global)`. Markers we can't resolve
 * (missing source, unknown URL) are left as literal text. The negative lookahead
 * avoids touching real markdown links like `[1](https://…)`.
 */
export function linkifyCitations(
  report: string,
  sectionSources: Source[],
  citeMap: Map<string, number>,
): string {
  return report.replace(/\[(\d+)\](?!\()/g, (whole, digits) => {
    const local = Number(digits)
    const src = sectionSources[local - 1]
    const global = src ? citeMap.get(src.url) : undefined
    if (!global) return whole
    return `[${global}](#source-${global})`
  })
}
