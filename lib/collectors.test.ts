import { describe, it, expect, vi } from 'vitest'
import { APIError } from '@tabstack/sdk'
import { collectProduct, collectSnapshot, isRetryable, withRetry } from './collectors'
import { productSchema } from './schemas'

const apiError = (status: number) => new APIError(status, undefined, `status ${status}`, undefined)

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

describe('isRetryable', () => {
  it('does not retry deterministic 4xx client errors', () => {
    expect(isRetryable(apiError(404))).toBe(false)
    expect(isRetryable(apiError(401))).toBe(false)
    expect(isRetryable(apiError(422))).toBe(false)
  })

  it('retries transient errors (5xx, 429, 408) and non-API errors', () => {
    expect(isRetryable(apiError(500))).toBe(true)
    expect(isRetryable(apiError(429))).toBe(true)
    expect(isRetryable(apiError(408))).toBe(true)
    expect(isRetryable(new Error('stream error'))).toBe(true)
  })
})

describe('withRetry', () => {
  it('stops after one attempt on a non-retryable error', async () => {
    const fn = vi.fn().mockRejectedValue(apiError(404))
    await expect(withRetry(fn)).rejects.toBeInstanceOf(APIError)
    expect(fn).toHaveBeenCalledTimes(1)
  })

  it('retries a transient error up to the attempt limit', async () => {
    const fn = vi.fn().mockRejectedValue(apiError(500))
    await expect(withRetry(fn, 3)).rejects.toBeInstanceOf(APIError)
    expect(fn).toHaveBeenCalledTimes(3)
  })

  it('returns on the first success without extra calls', async () => {
    const fn = vi.fn().mockResolvedValue('ok')
    await expect(withRetry(fn)).resolves.toBe('ok')
    expect(fn).toHaveBeenCalledTimes(1)
  })
})
