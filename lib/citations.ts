import type { Source } from './schemas'

export type { Source }

// URL -> its 1-based number in the global (deduped) Sources list.
export type CiteMap = Map<string, number>

/**
 * Map each source URL to its 1-based position in the global (deduped) Sources
 * list. Used to relabel per-section citation markers to global numbers so the
 * same source shows the same number everywhere in the brief.
 */
export function buildCiteMap(globalSources: Source[]): CiteMap {
  const map: CiteMap = new Map()
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
 * (missing source, unknown URL) are left as literal text.
 *
 * The lookahead skips real inline links `[1](https://…)` and link-reference
 * definitions `[1]: url`. Reference-style usages `[label][1]` are not matched
 * either — but adjacent citations `[1][2]` (which we DO want) are
 * indistinguishable from a reference usage by lookaround alone, so those are
 * left to render as-is; Tabstack reports use inline numeric citations, not
 * reference links.
 */
export function linkifyCitations(
  report: string,
  sectionSources: Source[],
  citeMap: CiteMap,
): string {
  return report.replace(/\[(\d+)\](?![(:])/g, (whole, digits) => {
    const local = Number(digits)
    const src = sectionSources[local - 1]
    const global = src ? citeMap.get(src.url) : undefined
    if (!global) return whole
    return `[${global}](#source-${global})`
  })
}
