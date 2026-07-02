import type Tabstack from '@tabstack/sdk'
import {
  productSchema,
  pricingSchema,
  messagingSchema,
  strengthsSchema,
  type ResearchResult,
} from './schemas'

/**
 * Iterate an SDK SSE stream (/research or /automate) to its terminal event and
 * return the picked payload. Throws on an `error` event.
 */
async function drainStream(
  stream: AsyncIterable<{ event: string; data?: unknown }>,
  pick: (data: unknown) => unknown,
): Promise<unknown> {
  let result: unknown
  for await (const event of stream) {
    if (event.event === 'complete' || event.event === 'task:completed') {
      result = pick(event.data)
    }
    if (event.event === 'error') {
      const data = event.data as { error?: { message?: string }; message?: string } | undefined
      throw new Error(data?.error?.message || data?.message || 'stream error')
    }
    if (event.event === 'done') break
  }
  return result
}

type ResearchMode = 'fast' | 'balanced'

/** Run a /research query and normalize it to { report, sources }. */
async function researchToReport(
  client: Tabstack,
  query: string,
  mode: ResearchMode = 'balanced',
): Promise<ResearchResult> {
  const stream = await client.agent.research({ query, mode } as never)
  const data = (await drainStream(stream as never, (d) => d)) as
    | { report?: string; metadata?: { citedPages?: { title?: string; url: string }[] } }
    | undefined
  const pages = data?.metadata?.citedPages ?? []
  return {
    report: data?.report ?? '',
    sources: pages.map((p) => ({ title: p.title ?? '(untitled)', url: p.url })),
  }
}

export function collectSnapshot(client: Tabstack, url: string): Promise<ResearchResult> {
  return researchToReport(
    client,
    `Give a competitive intelligence snapshot of the company at ${url}: what they do, ` +
      `their category, when they were founded, HQ, team size, and funding.`,
    'fast',
  )
}

export function collectSentiment(client: Tabstack, url: string): Promise<ResearchResult> {
  return researchToReport(
    client,
    `What do real users say about the company at ${url}? Summarize sentiment and recurring ` +
      `themes from Reddit, Hacker News, Product Hunt, and software review sites: what people ` +
      `praise, and what they complain about.`,
    'fast',
  )
}

export function collectHowToWin(client: Tabstack, url: string): Promise<ResearchResult> {
  return researchToReport(
    client,
    `You are advising a founder who competes with the company at ${url} but cannot market well. ` +
      `Using their positioning and what real users say about them (Reddit, Hacker News, ` +
      `Product Hunt, reviews), identify the messaging gaps to exploit and what this company is ` +
      `notably NOT saying. End with one recommended positioning statement the founder can act on.`,
  )
}

export function collectProduct(client: Tabstack, url: string) {
  return client.extract.json({ url, json_schema: productSchema, effort: 'standard' } as never)
}

export function collectPricing(client: Tabstack, url: string) {
  const pricingUrl = new URL('/pricing', url).toString()
  return client.extract.json({ url: pricingUrl, json_schema: pricingSchema, effort: 'standard' } as never)
}

export async function collectActivity(client: Tabstack, url: string) {
  const blogUrl = new URL('/blog', url).toString()
  const res = (await client.extract.markdown({ url: blogUrl, metadata: true } as never)) as {
    content?: string
    metadata?: { title?: string }
  }
  return { content: res?.content ?? '', title: res?.metadata?.title ?? 'Recent activity' }
}

export async function collectHiring(client: Tabstack, url: string) {
  const careersUrl = new URL('/careers', url).toString()
  const stream = await client.agent.automate({
    task:
      'Summarize the open roles listed on this public careers page: how many, and which teams ' +
      'or functions are hiring. If there are no public roles, say so.',
    url: careersUrl,
  } as never)
  const answer = await drainStream(
    stream as never,
    (d) => (d as { finalAnswer?: unknown })?.finalAnswer,
  )
  return {
    summary: typeof answer === 'string' && answer ? answer : 'No public roles found.',
  }
}

export function collectMessaging(client: Tabstack, url: string) {
  return client.generate.json({
    url,
    json_schema: messagingSchema,
    instructions:
      "Identify this company's tagline, core value propositions, and recurring messaging pillars.",
  } as never)
}

export function collectStrengths(client: Tabstack, url: string) {
  return client.generate.json({
    url,
    json_schema: strengthsSchema,
    instructions:
      'From this page, list what this company does well and where their positioning is weak or unaddressed.',
  } as never)
}
