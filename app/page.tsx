'use client'
import { useEffect, useState } from 'react'
import { SECTION_ORDER, type SectionEvent, type SectionId } from '@/lib/schemas'
import { SECTION_META } from '@/lib/sectionMeta'
import { BriefSection } from '@/components/BriefSection'
import { toMarkdown, toJSON, hostSlug } from '@/lib/exporters'

const STORAGE_KEY = 'competitor-brief:last'

type Saved = {
  url: string
  selfUrl: string
  submittedUrl: string
  events: Record<string, SectionEvent>
}

export default function Home() {
  const [url, setUrl] = useState('')
  const [selfUrl, setSelfUrl] = useState('')
  const [submittedUrl, setSubmittedUrl] = useState('')
  const [running, setRunning] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [events, setEvents] = useState<Record<string, SectionEvent>>({})
  const [copied, setCopied] = useState<'md' | 'json' | null>(null)
  const [hydrated, setHydrated] = useState(false)

  // Restore the last brief from localStorage on mount (client-only).
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) {
        const saved = JSON.parse(raw) as Saved
        setUrl(saved.url ?? '')
        setSelfUrl(saved.selfUrl ?? '')
        setSubmittedUrl(saved.submittedUrl ?? '')
        // A brief saved mid-run has sections stuck in pending/progress that will
        // never resolve after a reload. Mark them as interrupted so they don't
        // spin forever.
        const events = saved.events ?? {}
        for (const id of Object.keys(events)) {
          const e = events[id]
          if (e.status === 'pending' || e.status === 'progress') {
            events[id] = { id: e.id, status: 'error', message: 'Interrupted — rebuild to refresh.' }
          }
        }
        setEvents(events)
      }
    } catch {
      // Corrupt/blocked storage — start fresh.
    }
    setHydrated(true)
  }, [])

  // Persist whenever the brief changes (after hydration, so we don't clobber
  // saved data with the initial empty state).
  useEffect(() => {
    if (!hydrated) return
    try {
      if (Object.keys(events).length === 0) {
        localStorage.removeItem(STORAGE_KEY)
        return
      }
      const saved: Saved = { url, selfUrl, submittedUrl, events }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(saved))
    } catch {
      // Storage full or blocked — non-fatal.
    }
  }, [hydrated, url, selfUrl, submittedUrl, events])

  const doneCount = Object.values(events).filter((e) => e.status === 'done').length

  async function copy(kind: 'md' | 'json') {
    const text = kind === 'md' ? toMarkdown(submittedUrl, events) : toJSON(submittedUrl, events)
    try {
      await navigator.clipboard.writeText(text)
    } catch {
      // Clipboard API is blocked outside secure contexts (e.g. viewing via a
      // LAN IP). Fall back to a hidden textarea + execCommand.
      const ta = document.createElement('textarea')
      ta.value = text
      ta.style.position = 'fixed'
      ta.style.opacity = '0'
      document.body.appendChild(ta)
      ta.select()
      document.execCommand('copy')
      document.body.removeChild(ta)
    }
    setCopied(kind)
    setTimeout(() => setCopied(null), 1800)
  }

  function clearBrief() {
    setEvents({})
    setSubmittedUrl('')
    setError(null)
    // The persist effect removes the storage key when events go empty, but call
    // it directly too in case storage was written outside this session.
    try {
      localStorage.removeItem(STORAGE_KEY)
    } catch {
      // blocked storage — non-fatal
    }
  }

  function downloadMarkdown() {
    const blob = new Blob([toMarkdown(submittedUrl, events)], { type: 'text/markdown;charset=utf-8' })
    const href = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = href
    a.download = `competitor-brief-${hostSlug(submittedUrl)}.md`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    setTimeout(() => URL.revokeObjectURL(href), 1000)
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
        body: JSON.stringify({ url, selfUrl }),
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
          Everything you need to out-position a competitor. Enter your product and theirs, then get
          what they ship, what their users actually say, and where you win.
        </p>
      </header>

      <form onSubmit={run} className="mt-8 space-y-4">
        <div>
          <label className="mb-2 block font-mono text-xs uppercase tracking-widest text-muted">
            Your product
          </label>
          <input
            value={selfUrl}
            onChange={(e) => setSelfUrl(e.target.value)}
            required
            type="url"
            placeholder="https://yourproduct.com"
            className="w-full rounded-lg border border-line bg-panel px-4 py-3 font-mono text-sm text-ink outline-none transition-colors placeholder:text-muted/60 focus:border-accent"
          />
        </div>
        <div>
          <label className="mb-2 block font-mono text-xs uppercase tracking-widest text-muted">
            Competitor
          </label>
          <div className="flex flex-col gap-3 sm:flex-row">
            <input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              required
              type="url"
              placeholder="https://competitor.com"
              className="flex-1 rounded-lg border border-line bg-panel px-4 py-3 font-mono text-sm text-ink outline-none transition-colors placeholder:text-muted/60 focus:border-accent"
            />
            <button
              disabled={running}
              className="rounded-lg bg-accent px-6 py-3 font-medium text-paper transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              {running ? 'Building the brief…' : 'Build brief'}
            </button>
          </div>
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
          <button
            onClick={clearBrief}
            disabled={running}
            className="ml-auto rounded-md border border-line bg-panel px-3 py-1.5 text-sm text-muted transition-colors hover:border-accent hover:text-ink disabled:opacity-50"
          >
            Clear
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

      <footer className="mt-16 flex flex-col gap-4 border-t border-line pt-6 sm:flex-row sm:items-center sm:justify-between">
        <p className="font-display text-lg text-ink">Ship your agent, not the infra.</p>
        <a
          href="https://console.tabstack.ai/signup?utm_source=competitor-brief&utm_medium=template&utm_campaign=stripe-projects"
          target="_blank"
          rel="noreferrer"
          className="shrink-0 font-mono text-xs uppercase tracking-widest text-accent underline decoration-line underline-offset-4 transition-colors hover:decoration-accent"
        >
          Get a Tabstack key →
        </a>
      </footer>
    </main>
  )
}
