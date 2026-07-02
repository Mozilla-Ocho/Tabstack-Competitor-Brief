import { describe, it, expect, vi } from 'vitest'
import { collectProduct, collectSnapshot } from './collectors'
import { productSchema } from './schemas'

function fakeStream(events: unknown[]) {
  return (async function* () {
    for (const e of events) yield e
  })()
}

describe('collectors', () => {
  it('collectProduct calls extract.json with json_schema', async () => {
    const client = {
      extract: { json: vi.fn().mockResolvedValue({ products: [] }) },
    } as never
    await collectProduct(client, 'https://acme.com')
    expect((client as { extract: { json: ReturnType<typeof vi.fn> } }).extract.json).toHaveBeenCalledWith(
      expect.objectContaining({ url: 'https://acme.com', json_schema: productSchema }),
    )
  })

  it('collectSnapshot drains the research stream and returns report + sources', async () => {
    const client = {
      agent: {
        research: vi.fn().mockResolvedValue(
          fakeStream([
            {
              event: 'complete',
              data: { report: 'A brief.', metadata: { citedPages: [{ title: null, url: 'https://x.com' }] } },
            },
            { event: 'done', data: {} },
          ]),
        ),
      },
    } as never
    const out = await collectSnapshot(client, 'https://acme.com')
    expect(out.report).toBe('A brief.')
    expect(out.sources[0].title).toBe('(untitled)')
    expect(out.sources[0].url).toBe('https://x.com')
  })
})
