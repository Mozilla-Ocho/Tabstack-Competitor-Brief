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

  // The Sources section is derived from the snapshot's cited pages.
  let snapshot: ResearchResult | null = null

  const all = Promise.allSettled(
    tasks.map(async (t) => {
      const onProgress: OnProgress = (message) =>
        ch.push({ id: t.id, status: 'progress', message })
      try {
        const data = await t.run(onProgress)
        if (t.id === 'snapshot') {
          snapshot = data as ResearchResult
          // Snapshot's sources are shown in their own section, not here.
          ch.push({ id: 'snapshot', status: 'done', data: { report: snapshot.report } })
        } else {
          ch.push({ id: t.id, status: 'done', data })
        }
      } catch (e) {
        ch.push({ id: t.id, status: 'error', message: (e as Error).message })
      }
    }),
  )

  all.then(() => {
    ch.push(
      snapshot
        ? { id: 'sources', status: 'done', data: { sources: snapshot.sources } }
        : { id: 'sources', status: 'error', message: 'No sources available' },
    )
    ch.close()
  })

  yield* ch.drain()
}
