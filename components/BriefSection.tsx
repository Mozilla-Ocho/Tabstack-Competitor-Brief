'use client'
import { useMemo } from 'react'
import ReactMarkdown from 'react-markdown'
import type { Components } from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { type SectionEvent } from '@/lib/schemas'
import { linkifyCitations, type CiteMap, type Source } from '@/lib/citations'

// Custom link renderer. Citation links (href `#source-n`) render as a small
// superscript `[n]` that jumps to the Sources list; other in-page anchors
// (e.g. GFM footnotes) stay in-page; only true external links open a new tab.
// We set anchor attributes explicitly and never spread react-markdown's props —
// that would leak its `node` hast object onto the DOM element.
const mdComponents: Components = {
  a({ href, children }) {
    if (href?.startsWith('#source-')) {
      return (
        <a href={href} className="brief-cite" aria-label={`Jump to source ${children}`}>
          {children}
        </a>
      )
    }
    if (href?.startsWith('#')) {
      return <a href={href}>{children}</a>
    }
    return (
      <a href={href} target="_blank" rel="noreferrer">
        {children}
      </a>
    )
  },
}

function Markdown({
  text,
  invert,
  sources,
  citeMap,
}: {
  text: string
  invert?: boolean
  sources?: Source[]
  citeMap?: CiteMap
}) {
  const body = useMemo(
    () => (sources && citeMap ? linkifyCitations(text, sources, citeMap) : text),
    [text, sources, citeMap],
  )
  return (
    <div className={`prose prose-sm max-w-none ${invert ? 'prose-invert' : 'prose-neutral'}`}>
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={mdComponents}>
        {body}
      </ReactMarkdown>
    </div>
  )
}

type Post = { title?: string; url?: string; date?: string; summary?: string }

function PostCard({ post }: { post: Post }) {
  const title = post.title || post.url || 'Untitled'
  const card = (
    <>
      <div className="flex items-baseline justify-between gap-3">
        <h3 className="font-display text-base leading-snug text-ink group-hover:text-accent">
          {title}
        </h3>
        {post.date && (
          <span className="shrink-0 font-mono text-xs text-muted">{post.date}</span>
        )}
      </div>
      {post.summary && (
        <p className="mt-1.5 text-sm leading-relaxed text-ink/70">{post.summary}</p>
      )}
    </>
  )
  const cls =
    'group block rounded-lg border border-line bg-paper px-4 py-3 transition-colors hover:border-accent'
  return (
    <li>
      {post.url ? (
        <a href={post.url} target="_blank" rel="noreferrer" className={cls}>
          {card}
        </a>
      ) : (
        <div className={cls}>{card}</div>
      )}
    </li>
  )
}

function Tags({ items }: { items: unknown[] }) {
  return (
    <div className="flex flex-wrap gap-2">
      {items.map((it, i) => (
        <span
          key={i}
          className="rounded-full border border-line bg-paper px-3 py-1 text-sm text-ink/80"
        >
          {typeof it === 'string' ? it : JSON.stringify(it)}
        </span>
      ))}
    </div>
  )
}

function SectionBody({
  data,
  invert,
  citeMap,
}: {
  data: unknown
  invert?: boolean
  citeMap?: CiteMap
}) {
  const d = (data ?? {}) as Record<string, unknown>

  if (typeof d.report === 'string' && d.report)
    return (
      <Markdown
        text={d.report}
        invert={invert}
        sources={Array.isArray(d.sources) ? (d.sources as Source[]) : undefined}
        citeMap={citeMap}
      />
    )

  if (Array.isArray(d.sources)) {
    const sources = d.sources as Source[]
    if (!sources.length) return <p className="text-sm text-muted">No sources cited.</p>
    return (
      <ol className="space-y-1 text-sm">
        {sources.map((s, i) => (
          // `id` is the citation anchor target; `:target` (globals.css) outlines
          // the active source when a [n] marker links here.
          <li key={i} id={`source-${i + 1}`} className="brief-source flex gap-3 rounded-md px-2 py-1">
            <span className="font-mono text-xs text-muted">{String(i + 1).padStart(2, '0')}</span>
            <a className="text-accent underline decoration-line underline-offset-2 hover:decoration-accent" href={s.url} target="_blank" rel="noreferrer">
              {s.title}
            </a>
          </li>
        ))}
      </ol>
    )
  }

  if (Array.isArray(d.segments)) {
    return (
      <div className="space-y-3">
        {typeof d.summary === 'string' && d.summary && (
          <p className="text-[0.95rem] leading-relaxed text-ink/85">{d.summary}</p>
        )}
        {d.segments.length > 0 && <Tags items={d.segments} />}
      </div>
    )
  }

  if (Array.isArray(d.posts)) {
    const posts = (d.posts as Post[]).filter((p) => p && (p.title || p.url)).slice(0, 5)
    return (
      <div className="space-y-3">
        {typeof d.summary === 'string' && d.summary && (
          <p className="text-[0.95rem] leading-relaxed text-ink/85">{d.summary}</p>
        )}
        {posts.length > 0 ? (
          <ul className="grid gap-3">
            {posts.map((p, i) => (
              <PostCard key={i} post={p} />
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted">No recent posts found.</p>
        )}
      </div>
    )
  }

  if (typeof d.summary === 'string') return <Markdown text={d.summary} invert={invert} />

  if (typeof d.content === 'string')
    return <Markdown text={d.content.slice(0, 4000) + (d.content.length > 4000 ? '\n\n…' : '')} invert={invert} />

  if (d.tagline || d.valueProps || d.messagingPillars) {
    return (
      <div className="space-y-4">
        {typeof d.tagline === 'string' && (
          <p className="font-display text-lg italic text-ink">&ldquo;{d.tagline}&rdquo;</p>
        )}
        {Array.isArray(d.valueProps) && d.valueProps.length > 0 && (
          <div>
            <p className="mb-2 font-mono text-xs uppercase tracking-widest text-muted">Value props</p>
            <Tags items={d.valueProps} />
          </div>
        )}
        {Array.isArray(d.messagingPillars) && d.messagingPillars.length > 0 && (
          <div>
            <p className="mb-2 font-mono text-xs uppercase tracking-widest text-muted">Messaging pillars</p>
            <Tags items={d.messagingPillars} />
          </div>
        )}
      </div>
    )
  }

  if (d.strengths || d.gaps) {
    return (
      <div className="grid gap-5 sm:grid-cols-2">
        {Array.isArray(d.strengths) && (
          <div>
            <p className="mb-2 font-mono text-xs uppercase tracking-widest text-muted">Strengths</p>
            <ul className="space-y-1.5 text-sm text-ink/85">
              {d.strengths.map((s, i) => (
                <li key={i} className="flex gap-2">
                  <span className="text-accent">+</span>
                  <span>{String(s)}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
        {Array.isArray(d.gaps) && (
          <div>
            <p className="mb-2 font-mono text-xs uppercase tracking-widest text-muted">Gaps</p>
            <ul className="space-y-1.5 text-sm text-ink/85">
              {d.gaps.map((g, i) => (
                <li key={i} className="flex gap-2">
                  <span className="text-muted">–</span>
                  <span>{String(g)}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    )
  }

  if (Array.isArray(d.products)) {
    const products = d.products as { name?: string; description?: string }[]
    return (
      <ul className="divide-y divide-line">
        {products.map((p, i) => (
          <li key={i} className="py-2.5 first:pt-0 last:pb-0">
            <span className="font-medium text-ink">{p.name}</span>
            {p.description ? <span className="text-ink/70"> — {p.description}</span> : ''}
          </li>
        ))}
      </ul>
    )
  }

  if (Array.isArray(d.tiers)) {
    const tiers = d.tiers as { name?: string; price?: string; highlights?: string[] }[]
    return (
      <ul className="divide-y divide-line">
        {tiers.map((t, i) => (
          <li key={i} className="flex items-baseline justify-between gap-4 py-2.5 first:pt-0 last:pb-0">
            <div>
              <span className="font-medium text-ink">{t.name}</span>
              {Array.isArray(t.highlights) && t.highlights.length > 0 && (
                <span className="text-sm text-ink/60"> — {t.highlights.join(', ')}</span>
              )}
            </div>
            {t.price && <span className="shrink-0 font-mono text-sm text-ink">{t.price}</span>}
          </li>
        ))}
      </ul>
    )
  }

  return <p className="text-sm text-muted">No data returned for this section.</p>
}

function StatusTag({ status }: { status: string }) {
  const active = status === 'pending' || status === 'progress'
  const label =
    status === 'progress'
      ? 'Working'
      : status === 'pending'
        ? 'Gathering'
        : status === 'error'
          ? 'Unavailable'
          : status === 'done'
            ? 'Ready'
            : ''
  const color = status === 'done' ? 'text-accent' : 'text-muted'
  return (
    <span className={`flex items-center gap-1.5 font-mono text-[0.7rem] uppercase tracking-widest ${color}`}>
      {active && <span className="h-1.5 w-1.5 animate-brief-pulse rounded-full bg-accent" />}
      {label}
    </span>
  )
}

/** Live status line shown while a section runs, above its skeleton. */
function Working({ message, invert }: { message?: string; invert?: boolean }) {
  return (
    <div className="space-y-3">
      {message && (
        <p
          className={`font-mono text-xs ${invert ? 'text-paper/70' : 'text-muted'}`}
          aria-live="polite"
        >
          {message}
        </p>
      )}
      <SkeletonLines invert={invert} />
    </div>
  )
}

export function BriefSection({
  index,
  title,
  hero,
  event,
  citeMap,
}: {
  index: number
  title: string
  hero?: boolean
  event?: SectionEvent
  citeMap?: CiteMap
}) {
  const status = event?.status ?? 'idle'
  const num = String(index).padStart(2, '0')

  if (hero) {
    return (
      <section className="animate-rise overflow-hidden rounded-2xl bg-ink p-8 text-paper shadow-[0_20px_50px_-20px_rgba(31,27,22,0.5)]">
        <div className="mb-4 flex items-center justify-between">
          <span className="font-mono text-xs uppercase tracking-[0.2em] text-accent-soft">
            {num} · The opening
          </span>
          <StatusTag status={status} />
        </div>
        <h2 className="mb-5 font-display text-3xl leading-tight text-paper">{title}</h2>
        {(status === 'pending' || status === 'progress') && (
          <Working message={event?.message} invert />
        )}
        {status === 'error' && (
          <p className="text-sm text-paper/60">Could not synthesize this section. {event?.message}</p>
        )}
        {status === 'done' && <SectionBody data={event?.data} invert citeMap={citeMap} />}
      </section>
    )
  }

  return (
    <section className="animate-rise rounded-xl border border-line bg-panel p-6">
      <div className="mb-4 flex items-center justify-between gap-4">
        <div className="flex items-baseline gap-3">
          <span className="font-mono text-xs text-muted">{num}</span>
          <h2 className="font-display text-xl text-ink">{title}</h2>
        </div>
        <StatusTag status={status} />
      </div>
      {(status === 'pending' || status === 'progress') && <Working message={event?.message} />}
      {status === 'error' && (
        <p className="text-sm text-muted">Could not retrieve this section. {event?.message}</p>
      )}
      {status === 'done' && <SectionBody data={event?.data} citeMap={citeMap} />}
    </section>
  )
}

function SkeletonLines({ invert }: { invert?: boolean }) {
  const bar = invert ? 'bg-paper/15' : 'bg-line'
  return (
    <div className="space-y-2.5">
      <div className={`h-3 w-full animate-brief-pulse rounded ${bar}`} />
      <div className={`h-3 w-11/12 animate-brief-pulse rounded ${bar}`} />
      <div className={`h-3 w-2/3 animate-brief-pulse rounded ${bar}`} />
    </div>
  )
}
