import { getClient } from '@/lib/tabstack'
import { buildBrief } from '@/lib/brief'

export const runtime = 'nodejs'
export const maxDuration = 300

export async function POST(req: Request) {
  let url: string
  try {
    const body = await req.json()
    url = new URL(body.url).toString()
  } catch {
    return new Response(JSON.stringify({ error: 'A valid competitor URL is required.' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  let client: ReturnType<typeof getClient>
  try {
    client = getClient()
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const encoder = new TextEncoder()
  const stream = new ReadableStream({
    async start(controller) {
      try {
        for await (const event of buildBrief(client, url)) {
          controller.enqueue(encoder.encode(JSON.stringify(event) + '\n'))
        }
      } catch (e) {
        controller.enqueue(
          encoder.encode(
            JSON.stringify({ id: 'snapshot', status: 'error', message: (e as Error).message }) + '\n',
          ),
        )
      } finally {
        controller.close()
      }
    },
  })

  return new Response(stream, {
    headers: { 'Content-Type': 'application/x-ndjson', 'Cache-Control': 'no-store' },
  })
}
