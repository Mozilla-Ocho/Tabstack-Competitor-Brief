import { describe, it, expect } from 'vitest'
import { toMarkdown, toJSON, hostSlug } from './exporters'
import { type SectionEvent } from './schemas'

const events: Record<string, SectionEvent> = {
  snapshot: { id: 'snapshot', status: 'done', data: { report: 'They do X.' } },
  pricing: { id: 'pricing', status: 'done', data: { tiers: [{ name: 'Pro', price: '$20/mo' }] } },
  hiring: { id: 'hiring', status: 'error', message: 'timeout' },
}

describe('exporters', () => {
  it('toMarkdown includes done sections and skips non-done', () => {
    const md = toMarkdown('https://acme.com', events)
    expect(md).toContain('# Competitor Brief: https://acme.com')
    expect(md).toContain('Snapshot')
    expect(md).toContain('They do X.')
    expect(md).toContain('**Pro** ($20/mo)')
    expect(md).not.toContain('Hiring signals') // error section excluded
  })

  it('toJSON includes only done sections with titles', () => {
    const json = JSON.parse(toJSON('https://acme.com', events))
    expect(json.url).toBe('https://acme.com')
    expect(json.sections.snapshot.title).toBe('Snapshot')
    expect(json.sections.hiring).toBeUndefined()
  })

  it('hostSlug strips www and non-alphanumerics', () => {
    expect(hostSlug('https://www.firecrawl.dev')).toBe('firecrawl-dev')
  })
})
