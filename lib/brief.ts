import type Tabstack from '@tabstack/sdk'
import { type SectionEvent, type SectionId, type ResearchResult } from './schemas'
import {
  collectSnapshot,
  collectProduct,
  collectPricing,
  collectActivity,
  collectSentiment,
  collectHiring,
  collectMessaging,
  collectStrengths,
  collectHowToWin,
  collectICP,
  withRetry,
} from './collectors'

type OnProgress = (message: string) => void
type Task = { id: SectionId; run: (onProgress: OnProgress) => Promise<unknown> }

/**
 * A minimal single-consumer async queue. Tasks run concurrently and `push`
 * events (pending / progress / done / error) as they happen; the generator
 * drains them in arrival order so live progress from every section interleaves.
 */
function channel<T>() {
  const queue: T[] = []
  let wake: (() => void) | null = null
  let closed = false
  return {
    push(value: T) {
      queue.push(value)
      wake?.()
      wake = null
    },
    close() {
      closed = true
      wake?.()
      wake = null
    },
    async *drain(): AsyncGenerator<T> {
      for (;;) {
        if (queue.length) {
          yield queue.shift() as T
          continue
        }
        if (closed) return
        await new Promise<void>((resolve) => (wake = resolve))
      }
    },
  }
}

/**
 * Orchestrates the full competitor brief. Every section starts `pending`, emits
 * `progress` events with the latest Tabstack status while it runs (research and
 * automate sections only — extract/generate calls don't stream), then lands on
 * `done` or `error`. A failure in any single section never aborts the brief.
 */
export async function* buildBrief(
  client: Tabstack,
  url: string,
  selfUrl: string,
): AsyncGenerator<SectionEvent> {
  const ch = channel<SectionEvent>()

  const tasks: Task[] = [
    { id: 'snapshot', run: (p) => collectSnapshot(client, url, p) },
    { id: 'product', run: () => collectProduct(client, url) },
    { id: 'pricing', run: () => collectPricing(client, url) },
    { id: 'activity', run: () => collectActivity(client, url) },
    { id: 'sentiment', run: (p) => collectSentiment(client, url, p) },
    { id: 'icp', run: () => collectICP(client, url) },
    { id: 'hiring', run: (p) => collectHiring(client, url, p) },
    { id: 'positioning', run: () => collectMessaging(client, url) },
    { id: 'strengths', run: () => collectStrengths(client, url) },
    { id: 'howToWin', run: (p) => collectHowToWin(client, url, selfUrl, p) },
  ]

  for (const t of tasks) ch.push({ id: t.id, status: 'pending' })
  ch.push({ id: 'sources', status: 'pending' })

  // Each fulfilled task's result, kept in task order so the Sources section can
  // aggregate cited pages across every research-backed section.
  const results: (unknown | undefined)[] = new Array(tasks.length)

  const all = Promise.allSettled(
    tasks.map(async (t, i) => {
      const onProgress: OnProgress = (message) =>
        ch.push({ id: t.id, status: 'progress', message })
      try {
        // Retry a few times before the section degrades to Unavailable.
        const data = await withRetry(() => t.run(onProgress))
        results[i] = data
        if (t.id === 'snapshot') {
          // Snapshot renders only its report, but its cited pages ride along so
          // the client can resolve the report's [n] markers to the global
          // Sources list (they also feed that list below).
          const snap = data as ResearchResult
          ch.push({
            id: 'snapshot',
            status: 'done',
            data: { report: snap.report, sources: snap.sources },
          })
        } else {
          ch.push({ id: t.id, status: 'done', data })
        }
      } catch (e) {
        ch.push({ id: t.id, status: 'error', message: (e as Error).message })
      }
    }),
  )

  all.then(() => {
    // Aggregate every cited page across the research-backed sections (snapshot,
    // sentiment, how-to-position), deduped by URL, so Sources is populated
    // whenever any research call cited a page.
    const seen = new Set<string>()
    const sources = results
      .flatMap((data) => {
        const d = data as { sources?: { title: string; url: string }[] } | undefined
        return Array.isArray(d?.sources) ? d.sources : []
      })
      .filter((s) => s?.url && !seen.has(s.url) && (seen.add(s.url), true))
    ch.push({ id: 'sources', status: 'done', data: { sources } })
    ch.close()
  })

  yield* ch.drain()
}
