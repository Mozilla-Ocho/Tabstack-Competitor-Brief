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
/**
 * Retry a call a few times before giving up, so a section only shows
 * "Unavailable" after every attempt fails (fast search can miss transiently).
 */
export async function withRetry<T>(fn: () => Promise<T>, attempts = 3): Promise<T> {
  let lastErr: unknown
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn()
    } catch (e) {
      lastErr = e
    }
  }
  throw lastErr
}

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

/** Best-effort brand name from a URL: https://www.tabstack.ai -> "Tabstack". */
function brandFromUrl(url: string): string {
  try {
    const host = new URL(url).hostname.replace(/^www\./, '')
    const name = host.split('.')[0]
    return name.charAt(0).toUpperCase() + name.slice(1)
  } catch {
    return url
  }
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
 * infrastructure this template intentionally avoids. Retries are handled by the
 * `withRetry` wrapper around each section, so this runs a single attempt.
 */
async function researchToReport(client: Tabstack, query: string): Promise<ResearchResult> {
  return runFast(client, query)
}

export async function collectSnapshot(client: Tabstack, url: string): Promise<ResearchResult> {
  const brand = brandFromUrl(url)
  try {
    const r = await withRetry(() =>
      researchToReport(
        client,
        `Give a competitive intelligence snapshot of ${brand} (${url}): what they do, their ` +
          `category, when they were founded, HQ, team size, and funding.`,
      ),
    )
    if (r.report.trim()) return r
  } catch {
    // fall back to reading their own site below
  }
  // Snapshot is the anchor section, so it must never come back empty. If fast
  // research finds nothing, read the homepage directly for a baseline summary.
  try {
    const md = (await client.extract.markdown({ url, metadata: true } as never)) as {
      content?: string
    }
    const content = (md?.content ?? '').trim()
    if (content) return { report: content.slice(0, 1500), sources: [{ title: brand, url }] }
  } catch {
    // ignore; return empty below
  }
  return { report: '', sources: [] }
}

export function collectSentiment(client: Tabstack, url: string): Promise<ResearchResult> {
  const brand = brandFromUrl(url)
  return researchToReport(
    client,
    `What do real users say about ${brand} (${url})? Search Product Hunt for their launch and ` +
      `reviews, Reddit and Hacker News threads that mention them, and software review sites like ` +
      `G2 and Capterra. Summarize recurring praise and complaints. Treat their own website as ` +
      `not independent and say so if that is the only source.`,
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
      'Look at this public careers page. First, one sentence summarizing where they are ' +
      'investing (which teams). Then a markdown bullet list grouped by team or function, one ' +
      'bullet per team in the form "- **Team (count):** example roles". One bullet per team, ' +
      'not one per role. If there are no public roles, say so.',
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
      'Analyze this company from its page. List their genuine strengths. Then, thinking like a ' +
      'competitor, infer their most likely gaps, blind spots, or under-served areas even if the ' +
      'page does not state them (a company never advertises its own weaknesses). Always return ' +
      'at least three concrete gaps.',
  } as never)
}
