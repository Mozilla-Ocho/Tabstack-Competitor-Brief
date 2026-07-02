import { describe, it, expect } from 'vitest'
import { buildCiteMap, linkifyCitations, type Source } from './citations'

const A: Source = { title: 'A', url: 'https://a.com' }
const B: Source = { title: 'B', url: 'https://b.com' }
const C: Source = { title: 'C', url: 'https://c.com' }

describe('buildCiteMap', () => {
  it('maps each URL to its 1-based position', () => {
    const m = buildCiteMap([A, B, C])
    expect(m.get('https://a.com')).toBe(1)
    expect(m.get('https://c.com')).toBe(3)
  })

  it('keeps the first index for duplicate URLs', () => {
    const m = buildCiteMap([A, B, A])
    expect(m.get('https://a.com')).toBe(1)
    expect(m.size).toBe(2)
  })
})

describe('linkifyCitations', () => {
  // Section cites B then A locally; globally B=2, A=1. Local [1]->global 2, [2]->global 1.
  const global = buildCiteMap([A, B, C])
  const sectionSources = [B, A]

  it('relabels local markers to global numbers and links them', () => {
    const out = linkifyCitations('Claim one [1]. Claim two [2].', sectionSources, global)
    expect(out).toBe('Claim one [2](#source-2). Claim two [1](#source-1).')
  })

  it('handles adjacent markers', () => {
    expect(linkifyCitations('Facts [1][2].', sectionSources, global)).toBe(
      'Facts [2](#source-2)[1](#source-1).',
    )
  })

  it('leaves unresolvable markers as literal text', () => {
    // [3] has no local source; [1] resolves.
    expect(linkifyCitations('X [1] Y [3].', sectionSources, global)).toBe('X [2](#source-2) Y [3].')
  })

  it('does not touch real markdown links', () => {
    const src = 'See [1](https://real.link) and [1].'
    expect(linkifyCitations(src, sectionSources, global)).toBe(
      'See [1](https://real.link) and [2](#source-2).',
    )
  })

  it('leaves markers whose URL is absent from the global list', () => {
    const out = linkifyCitations('Z [1].', [{ title: 'D', url: 'https://d.com' }], global)
    expect(out).toBe('Z [1].')
  })
})
