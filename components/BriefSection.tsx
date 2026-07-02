'use client'
import { type SectionEvent } from '@/lib/schemas'

function StringList({ items }: { items: unknown[] }) {
  return (
    <ul className="list-disc space-y-1 pl-5 text-sm text-neutral-800">
      {items.map((it, i) => (
        <li key={i}>{typeof it === 'string' ? it : JSON.stringify(it)}</li>
      ))}
    </ul>
  )
}

function SectionBody({ data }: { data: unknown }) {
  const d = (data ?? {}) as Record<string, unknown>

  // /research-backed sections: report + optional sources.
  if (typeof d.report === 'string' && d.report) {
    return <p className="whitespace-pre-wrap text-sm leading-relaxed text-neutral-800">{d.report}</p>
  }

  // Sources.
  if (Array.isArray(d.sources)) {
    const sources = d.sources as { title: string; url: string }[]
    if (!sources.length) return <p className="text-sm text-neutral-500">No sources cited.</p>
    return (
      <ul className="space-y-1 text-sm">
        {sources.map((s, i) => (
          <li key={i}>
            <a className="text-blue-700 underline" href={s.url} target="_blank" rel="noreferrer">
              {s.title}
            </a>
          </li>
        ))}
      </ul>
    )
  }

  // Hiring summary.
  if (typeof d.summary === 'string') {
    return <p className="text-sm text-neutral-800">{d.summary}</p>
  }

  // Recent activity markdown.
  if (typeof d.content === 'string') {
    return (
      <p className="whitespace-pre-wrap text-sm text-neutral-800">
        {d.content.slice(0, 1200)}
        {d.content.length > 1200 ? '…' : ''}
      </p>
    )
  }

  // Messaging.
  if (d.tagline || d.valueProps || d.messagingPillars) {
    return (
      <div className="space-y-3 text-sm text-neutral-800">
        {typeof d.tagline === 'string' && <p className="font-medium">{d.tagline}</p>}
        {Array.isArray(d.valueProps) && <StringList items={d.valueProps} />}
        {Array.isArray(d.messagingPillars) && <StringList items={d.messagingPillars} />}
      </div>
    )
  }

  // Strengths & gaps.
  if (d.strengths || d.gaps) {
    return (
      <div className="space-y-3 text-sm text-neutral-800">
        {Array.isArray(d.strengths) && (
          <div>
            <p className="mb-1 font-medium">Strengths</p>
            <StringList items={d.strengths} />
          </div>
        )}
        {Array.isArray(d.gaps) && (
          <div>
            <p className="mb-1 font-medium">Gaps</p>
            <StringList items={d.gaps} />
          </div>
        )}
      </div>
    )
  }

  // Product.
  if (Array.isArray(d.products)) {
    const products = d.products as { name?: string; description?: string }[]
    return (
      <ul className="space-y-2 text-sm text-neutral-800">
        {products.map((p, i) => (
          <li key={i}>
            <span className="font-medium">{p.name}</span>
            {p.description ? ` — ${p.description}` : ''}
          </li>
        ))}
      </ul>
    )
  }

  // Pricing.
  if (Array.isArray(d.tiers)) {
    const tiers = d.tiers as { name?: string; price?: string; highlights?: string[] }[]
    return (
      <ul className="space-y-2 text-sm text-neutral-800">
        {tiers.map((t, i) => (
          <li key={i}>
            <span className="font-medium">{t.name}</span>
            {t.price ? ` — ${t.price}` : ''}
            {Array.isArray(t.highlights) && t.highlights.length > 0 && (
              <span className="text-neutral-600"> ({t.highlights.join(', ')})</span>
            )}
          </li>
        ))}
      </ul>
    )
  }

  return <pre className="whitespace-pre-wrap break-words text-xs text-neutral-600">{JSON.stringify(data, null, 2)}</pre>
}

export function BriefSection({
  title,
  hero,
  event,
}: {
  title: string
  hero?: boolean
  event?: SectionEvent
}) {
  const status = event?.status ?? 'idle'
  return (
    <section className={`rounded-xl border p-5 ${hero ? 'border-black bg-neutral-50 shadow-sm' : 'border-neutral-200'}`}>
      <div className="mb-2 flex items-center justify-between gap-4">
        <h2 className={`font-semibold ${hero ? 'text-xl' : 'text-lg'}`}>{title}</h2>
        <span className="shrink-0 text-xs uppercase tracking-wide text-neutral-500">
          {status === 'pending' ? 'working…' : status === 'error' ? 'unavailable' : status === 'done' ? 'ready' : ''}
        </span>
      </div>
      {status === 'pending' && (
        <div className="space-y-2">
          <div className="h-3 w-2/3 animate-pulse rounded bg-neutral-200" />
          <div className="h-3 w-1/2 animate-pulse rounded bg-neutral-200" />
        </div>
      )}
      {status === 'error' && (
        <p className="text-sm text-neutral-500">Could not retrieve this section. {event?.message}</p>
      )}
      {status === 'done' && <SectionBody data={event?.data} />}
    </section>
  )
}
