import { describe, it, expect, vi } from 'vitest'
import { buildBrief } from './brief'

function researchStream() {
  return (async function* () {
    yield {
      event: 'complete',
      data: { report: 'Snapshot text', metadata: { citedPages: [{ title: 'S', url: 'https://s.com' }] } },
    }
    yield { event: 'done', data: {} }
  })()
}

function automateStream() {
  return (async function* () {
    yield { event: 'complete', data: { finalAnswer: '3 roles open' } }
    yield { event: 'done', data: {} }
  })()
}

const okClient = {
  agent: {
    research: vi.fn().mockImplementation(() => Promise.resolve(researchStream())),
    automate: vi.fn().mockImplementation(() => Promise.resolve(automateStream())),
  },
  extract: {
    json: vi.fn().mockResolvedValue({ ok: true }),
    markdown: vi.fn().mockResolvedValue({ content: 'md' }),
  },
  generate: { json: vi.fn().mockResolvedValue({ ok: true }) },
} as never

describe('buildBrief', () => {
  it('emits a done event for every section on the happy path', async () => {
    const done: string[] = []
    for await (const e of buildBrief(okClient, 'https://acme.com')) {
      if (e.status === 'done') done.push(e.id)
    }
    expect(done).toEqual(
      expect.arrayContaining([
        'snapshot',
        'product',
        'pricing',
        'activity',
        'sentiment',
        'hiring',
        'positioning',
        'strengths',
        'howToWin',
        'icp',
        'sources',
      ]),
    )
    expect(done).toHaveLength(11)
  })

  it('a failing /automate becomes an error event, brief still completes', async () => {
    const client = {
      ...(okClient as object),
      agent: {
        research: vi.fn().mockImplementation(() => Promise.resolve(researchStream())),
        automate: vi.fn().mockRejectedValue(new Error('timeout')),
      },
    } as never
    const events: Record<string, string> = {}
    for await (const e of buildBrief(client, 'https://acme.com')) {
      if (e.status !== 'pending') events[e.id] = e.status
    }
    expect(events.hiring).toBe('error')
    expect(events.snapshot).toBe('done')
    expect(Object.keys(events)).toHaveLength(11)
  })
})
