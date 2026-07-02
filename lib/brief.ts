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

type Task = { id: SectionId; run: () => Promise<unknown> }

/**
 * Orchestrates the full competitor brief. Yields a `pending` event per section,
 * then a `done` or `error` event as each result lands. A failure in any single
 * section becomes an `error` event and never aborts the brief.
 */
export async function* buildBrief(
  client: Tabstack,
  url: string,
  selfUrl: string,
): AsyncGenerator<SectionEvent> {
  // Snapshot runs first: it also feeds the ICP and Sources sections.
  yield { id: 'snapshot', status: 'pending' }
  let snapshot: ResearchResult | null = null
  try {
    snapshot = await collectSnapshot(client, url)
    yield { id: 'snapshot', status: 'done', data: { report: snapshot.report } }
  } catch (e) {
    yield { id: 'snapshot', status: 'error', message: (e as Error).message }
  }

  const tasks: Task[] = [
    { id: 'product', run: () => collectProduct(client, url) },
    { id: 'pricing', run: () => collectPricing(client, url) },
    { id: 'activity', run: () => collectActivity(client, url) },
    { id: 'sentiment', run: () => collectSentiment(client, url) },
    { id: 'icp', run: () => collectICP(client, url) },
    { id: 'hiring', run: () => collectHiring(client, url) },
    { id: 'positioning', run: () => collectMessaging(client, url) },
    { id: 'strengths', run: () => collectStrengths(client, url) },
    { id: 'howToWin', run: () => collectHowToWin(client, url, selfUrl) },
  ]

  for (const t of tasks) yield { id: t.id, status: 'pending' }

  const settled = await Promise.allSettled(
    tasks.map(async (t) => ({ id: t.id, data: await t.run() })),
  )
  for (let i = 0; i < tasks.length; i++) {
    const r = settled[i]
    if (r.status === 'fulfilled') {
      yield { id: tasks[i].id, status: 'done', data: r.value.data }
    } else {
      const reason = r.reason as { message?: string } | undefined
      yield { id: tasks[i].id, status: 'error', message: String(reason?.message ?? r.reason) }
    }
  }

  // Sources come from the snapshot's cited pages.
  yield { id: 'sources', status: 'pending' }
  yield snapshot
    ? { id: 'sources', status: 'done', data: { sources: snapshot.sources } }
    : { id: 'sources', status: 'error', message: 'No sources available' }
}
