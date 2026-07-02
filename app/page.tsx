'use client'
import { useState } from 'react'
import { SECTION_ORDER, type SectionEvent, type SectionId } from '@/lib/schemas'
import { SECTION_META } from '@/lib/sectionMeta'
import { BriefSection } from '@/components/BriefSection'
import { toMarkdown, toJSON, hostSlug } from '@/lib/exporters'

export default function Home() {
  const [url, setUrl] = useState('')
  const [submittedUrl, setSubmittedUrl] = useState('')
  const [running, setRunning] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [events, setEvents] = useState<Record<string, SectionEvent>>({})
  const [copied, setCopied] = useState<'md' | 'json' | null>(null)

  const doneCount = Object.values(events).filter((e) => e.status === 'done').length

  async function copy(kind: 'md' | 'json') {
    const text = kind === 'md' ? toMarkdown(submittedUrl, events) : toJSON(submittedUrl, events)
    await navigator.clipboard.writeText(text)
    setCopied(kind)
    setTimeout(() => setCopied(null), 1800)
  }

  function downloadMarkdown() {
    const blob = new Blob([toMarkdown(submittedUrl, events)], { type: 'text/markdown' })
    const href = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = href
    a.download = `competitor-brief-${hostSlug(submittedUrl)}.md`
    a.click()
    URL.revokeObjectURL(href)
  }

  async function run(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setEvents({})
    setSubmittedUrl(url)
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
    <main className="mx-auto max-w-2xl px-5 py-16 sm:py-24">
      <header className="border-b border-line pb-8">
        <p className="font-mono text-xs uppercase tracking-[0.25em] text-accent">
          Competitive intelligence
        </p>
        <h1 className="mt-3 font-display text-5xl leading-[1.05] tracking-tight text-ink sm:text-6xl">
          Competitor
          <br />
          Brief
        </h1>
        <p className="mt-5 max-w-md text-[0.95rem] leading-relaxed text-muted">
          Point it at a competitor. Get a cited field brief on who they are, what people say about
          them, and, the part that matters, how to position against them.
        </p>
      </header>

      <form onSubmit={run} className="mt-8">
        <label className="mb-2 block font-mono text-xs uppercase tracking-widest text-muted">
          Target URL
        </label>
        <div className="flex flex-col gap-3 sm:flex-row">
          <input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            required
            type="url"
            placeholder="https://tabstack.ai"
            className="flex-1 rounded-lg border border-line bg-panel px-4 py-3 font-mono text-sm text-ink outline-none transition-colors placeholder:text-muted/60 focus:border-accent"
          />
          <button
            disabled={running}
            className="rounded-lg bg-accent px-6 py-3 font-medium text-paper transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {running ? 'Building the brief…' : 'Build brief'}
          </button>
        </div>
      </form>

      {error && (
        <p className="mt-5 rounded-lg border border-accent/30 bg-accent-soft/40 p-3 text-sm text-ink">
          {error}
        </p>
      )}

      {started && doneCount > 0 && (
        <div className="mt-10 flex flex-wrap items-center gap-2 border-y border-line py-4">
          <span className="mr-1 font-mono text-xs uppercase tracking-widest text-muted">
            Export brief
          </span>
          <button
            onClick={() => copy('md')}
            className="rounded-md border border-line bg-panel px-3 py-1.5 text-sm text-ink transition-colors hover:border-accent"
          >
            {copied === 'md' ? 'Copied ✓' : 'Copy as Markdown'}
          </button>
          <button
            onClick={downloadMarkdown}
            className="rounded-md border border-line bg-panel px-3 py-1.5 text-sm text-ink transition-colors hover:border-accent"
          >
            Download .md
          </button>
          <button
            onClick={() => copy('json')}
            className="rounded-md border border-line bg-panel px-3 py-1.5 text-sm text-ink transition-colors hover:border-accent"
          >
            {copied === 'json' ? 'Copied ✓' : 'Copy as JSON'}
          </button>
        </div>
      )}

      {started && (
        <div className="mt-8 space-y-4">
          {SECTION_ORDER.map((id: SectionId, i) => (
            <BriefSection
              key={id}
              index={i + 1}
              title={SECTION_META[id].title}
              hero={SECTION_META[id].hero}
              event={events[id]}
            />
          ))}
        </div>
      )}

      <footer className="mt-16 border-t border-line pt-6">
        <p className="font-mono text-[0.7rem] uppercase leading-relaxed tracking-widest text-muted">
          Every section is finished output from the live web
          <br />
          Powered by Tabstack · extract · generate · research · automate
        </p>
      </footer>
    </main>
  )
}
