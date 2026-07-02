import { SECTION_ORDER, type SectionEvent, type SectionId } from './schemas'
import { SECTION_META } from './sectionMeta'

type EventMap = Record<string, SectionEvent>

function sectionToMarkdown(id: SectionId, data: unknown): string {
  const d = (data ?? {}) as Record<string, unknown>

  if (typeof d.report === 'string' && d.report) return d.report.trim()

  if (Array.isArray(d.sources)) {
    const sources = d.sources as { title: string; url: string }[]
    if (!sources.length) return '_No sources cited._'
    return sources.map((s, i) => `${i + 1}. [${s.title}](${s.url})`).join('\n')
  }

  if (Array.isArray(d.segments)) {
    const parts: string[] = []
    if (typeof d.summary === 'string' && d.summary) parts.push(d.summary)
    if (d.segments.length) parts.push(d.segments.map((s) => `- ${s}`).join('\n'))
    return parts.join('\n\n') || '_No data returned for this section._'
  }

  if (Array.isArray(d.posts)) {
    const posts = (d.posts as { title?: string; url?: string; date?: string; summary?: string }[])
      .filter((p) => p && (p.title || p.url))
      .slice(0, 5)
    const parts: string[] = []
    if (typeof d.summary === 'string' && d.summary) parts.push(d.summary.trim())
    if (posts.length)
      parts.push(
        posts
          .map((p) => {
            const title = p.title || p.url || 'Untitled'
            const head = p.url ? `[${title}](${p.url})` : title
            const date = p.date ? ` _(${p.date})_` : ''
            const sum = p.summary ? ` — ${p.summary}` : ''
            return `- **${head}**${date}${sum}`
          })
          .join('\n'),
      )
    return parts.join('\n\n') || '_No recent posts found._'
  }

  if (typeof d.summary === 'string') return d.summary.trim()

  if (typeof d.content === 'string') return d.content.trim()

  if (d.tagline || d.valueProps || d.messagingPillars) {
    const parts: string[] = []
    if (typeof d.tagline === 'string') parts.push(`**Tagline:** ${d.tagline}`)
    if (Array.isArray(d.valueProps) && d.valueProps.length)
      parts.push(`**Value props:**\n${d.valueProps.map((v) => `- ${v}`).join('\n')}`)
    if (Array.isArray(d.messagingPillars) && d.messagingPillars.length)
      parts.push(`**Messaging pillars:**\n${d.messagingPillars.map((v) => `- ${v}`).join('\n')}`)
    return parts.join('\n\n')
  }

  if (d.strengths || d.gaps) {
    const parts: string[] = []
    if (Array.isArray(d.strengths) && d.strengths.length)
      parts.push(`**Strengths:**\n${d.strengths.map((v) => `- ${v}`).join('\n')}`)
    if (Array.isArray(d.gaps) && d.gaps.length)
      parts.push(`**Gaps:**\n${d.gaps.map((v) => `- ${v}`).join('\n')}`)
    return parts.join('\n\n')
  }

  if (Array.isArray(d.products)) {
    const products = d.products as { name?: string; description?: string }[]
    return products.map((p) => `- **${p.name}**${p.description ? ` — ${p.description}` : ''}`).join('\n')
  }

  if (Array.isArray(d.tiers)) {
    const tiers = d.tiers as { name?: string; price?: string; highlights?: string[] }[]
    return tiers
      .map((t) => {
        const hl = Array.isArray(t.highlights) && t.highlights.length ? ` — ${t.highlights.join(', ')}` : ''
        return `- **${t.name}**${t.price ? ` (${t.price})` : ''}${hl}`
      })
      .join('\n')
  }

  return '_No data returned for this section._'
}

/** Assemble the completed brief into a clean, agent-ready markdown document. */
export function toMarkdown(url: string, events: EventMap): string {
  const lines: string[] = [`# Competitor Brief: ${url}`, '', '_Generated with Tabstack._', '']
  SECTION_ORDER.forEach((id, i) => {
    const ev = events[id]
    if (ev?.status !== 'done') return
    lines.push(`## ${String(i + 1).padStart(2, '0')}. ${SECTION_META[id].title}`, '')
    lines.push(sectionToMarkdown(id, ev.data), '')
  })
  return lines.join('\n').trim() + '\n'
}

/** Export the completed brief as structured JSON for programmatic or agent use. */
export function toJSON(url: string, events: EventMap): string {
  const sections: Record<string, { title: string; data: unknown }> = {}
  SECTION_ORDER.forEach((id) => {
    const ev = events[id]
    if (ev?.status !== 'done') return
    sections[id] = { title: SECTION_META[id].title, data: ev.data }
  })
  return JSON.stringify({ url, generatedWith: 'Tabstack', sections }, null, 2)
}

/** Slug for filenames, e.g. https://www.firecrawl.dev -> firecrawl-dev */
export function hostSlug(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '').replace(/[^a-z0-9]+/gi, '-').toLowerCase()
  } catch {
    return 'competitor'
  }
}
