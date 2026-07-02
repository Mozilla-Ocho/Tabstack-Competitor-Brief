'use client'
import { useState } from 'react'
import { SECTION_ORDER, type SectionEvent, type SectionId } from '@/lib/schemas'
import { SECTION_META } from '@/lib/sectionMeta'
import { BriefSection } from '@/components/BriefSection'

export default function Home() {
  const [url, setUrl] = useState('')
  const [running, setRunning] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [events, setEvents] = useState<Record<string, SectionEvent>>({})

  async function run(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setEvents({})
    setRunning(true)
    try {
      const res = await fetch('/api/brief', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ url }),
      })
      if (!res.ok || !res.body) {
        const body = await res.json().catch(() => ({ error: 'Request failed.' }))
        setError(body.error ?? 'Request failed.')
        return
      }
      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''
      for (;;) {
        const { value, done } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() ?? ''
        for (const line of lines) {
          if (!line.trim()) continue
          const ev = JSON.parse(line) as SectionEvent
          setEvents((prev) => ({ ...prev, [ev.id]: ev }))
        }
      }
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setRunning(false)
    }
  }

  const started = Object.keys(events).length > 0

  return (
    <main className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="text-3xl font-bold tracking-tight">Competitor Brief</h1>
      <p className="mt-2 text-neutral-600">
        Enter a competitor&apos;s URL. Get a cited brief and, most importantly, how to position against them.
      </p>

      <form onSubmit={run} className="mt-6 flex gap-2">
        <input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          required
          type="url"
          placeholder="https://www.firecrawl.dev"
          className="flex-1 rounded-lg border border-neutral-300 px-4 py-2 outline-none focus:border-black"
        />
        <button
          disabled={running}
          className="rounded-lg bg-black px-5 py-2 font-medium text-white disabled:opacity-50"
        >
          {running ? 'Building…' : 'Build brief'}
        </button>
      </form>

      {error && <p className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}

      {started && (
        <div className="mt-8 space-y-4">
          {SECTION_ORDER.map((id: SectionId) => (
            <BriefSection
              key={id}
              title={SECTION_META[id].title}
              hero={SECTION_META[id].hero}
              event={events[id]}
            />
          ))}
        </div>
      )}

      <footer className="mt-12 border-t border-neutral-200 pt-6 text-xs text-neutral-500">
        Every section is finished output from the live web, powered by Tabstack. Runs on the five
        Tabstack endpoints: extract, generate, research, and automate.
      </footer>
    </main>
  )
}
