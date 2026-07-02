import type Tabstack from '@tabstack/sdk'
import {
  productSchema,
  pricingSchema,
  messagingSchema,
  strengthsSchema,
  icpSchema,
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

async function runFast(client: Tabstack, query: string): Promise<ResearchResult> {
  const stream = await client.agent.research({ query, mode: 'fast' } as never)
  const data = (await drainStream(stream as never, (d) => d)) as
    | { report?: string; metadata?: { citedPages?: { title?: string; url: string }[] } }
    | undefined
  const pages = data?.metadata?.citedPages ?? []
  return {
    report: data?.report ?? '',
    sources: pages.map((p) => ({ title: p.title ?? '(untitled)', url: p.url })),
  }
}

/**
 * Run a /research query in `fast` mode and normalize it to { report, sources }.
 * Fast is the only mode used: it returns quickly enough to run inside free
 * serverless tiers (Vercel, Netlify). Deeper modes need long-running
 * infrastructure this template intentionally avoids. If a fast run errors or
 * comes back empty, we retry fast once before letting the section degrade.
 */
async function researchToReport(client: Tabstack, query: string): Promise<ResearchResult> {
  try {
    const result = await runFast(client, query)
    if (result.report.trim()) return result
  } catch {
    // fall through to a single retry
  }
  return runFast(client, query)
}

export function collectSnapshot(client: Tabstack, url: string): Promise<ResearchResult> {
  return researchToReport(
    client,
    `Give a competitive intelligence snapshot of the company at ${url}: what they do, ` +
      `their category, when they were founded, HQ, team size, and funding.`,
  )
}

export function collectSentiment(client: Tabstack, url: string): Promise<ResearchResult> {
  return researchToReport(
    client,
    `What do real users say about the company at ${url}? Summarize sentiment and recurring ` +
      `themes from Reddit, Hacker News, Product Hunt, and software review sites: what people ` +
      `praise, and what they complain about.`,
  )
}

export function collectHowToWin(
  client: Tabstack,
  competitorUrl: string,
  selfUrl: string,
): Promise<ResearchResult> {
  return researchToReport(
    client,
    `I run the product at ${selfUrl}. I compete with the company at ${competitorUrl}. ` +
      `Compare the two. Using the competitor's positioning and what real users say about them ` +
      `(Reddit, Hacker News, Product Hunt, reviews), tell me how to position ${selfUrl} against ` +
      `them: the specific gaps to exploit, what the competitor is notably NOT saying, and one ` +
      `recommended positioning statement I can act on.`,
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
  const text = typeof answer === 'string' ? answer.trim() : ''
  // The automation can hit navigation limits or find no careers page. Don't
  // surface raw failure narration; show a clean, useful message instead.
  const looksFailed = !text || /abort|error|domain limit|cannot|could not|unable|no public careers/i.test(text)
  return {
    summary: looksFailed ? 'No public careers page or open roles found for this company.' : text,
  }
}

export function collectICP(client: Tabstack, url: string) {
  return client.generate.json({
    url,
    json_schema: icpSchema,
    instructions:
      'Based on this page, describe who this company sells to: their ideal customer profile ' +
      'and their primary customer segments, personas, or industries.',
  } as never)
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
