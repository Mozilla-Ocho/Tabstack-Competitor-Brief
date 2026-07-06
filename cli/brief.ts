/**
 * Competitor Brief — CLI (agent- and terminal-friendly).
 *
 * The web UI is the human front door; this is the agent one. Same lib, same
 * brief, streamed to your terminal.
 *
 *   pnpm brief <yourUrl> <competitorUrl> [--format pretty|markdown|json]
 *
 * Format defaults to `pretty` in a terminal and `markdown` when piped, so an
 * agent that captures stdout gets clean, ready-to-use output with no flags.
 */
import { readFileSync, existsSync } from 'node:fs'
import { getClient } from '../lib/tabstack'
import { buildBrief } from '../lib/brief'
import { SECTION_ORDER, type SectionEvent, type SectionId } from '../lib/schemas'
import { SECTION_META } from '../lib/sectionMeta'
import { toMarkdown, toJSON } from '../lib/exporters'

// Load .env.local when present so local runs work; agents get the key from the
// environment (Stripe Projects provisions it), so a missing file is fine.
function loadEnv() {
  if (process.env.TABSTACK_API_KEY || !existsSync('.env.local')) return
  for (const line of readFileSync('.env.local', 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, '')
  }
}

const tty = process.stdout.isTTY ?? false
const style = (code: string) => (s: string) => (tty ? `\x1b[${code}m${s}\x1b[0m` : s)
const pink = style('38;2;198;55;154')
const bold = style('1')
const dim = style('2')
const underline = style('4')

// Minimal markdown -> terminal. Handles the shapes our sections emit: bold,
// inline code, bullets, headings, and links. Keeps [n] citation markers as-is.
function renderMd(text: string): string {
  return text
    .split('\n')
    .map((line) => {
      let l = line.replace(/^#{1,6}\s+(.*)$/, (_, t) => bold(t))
      l = l.replace(/^\s*[-*]\s+/, '  • ')
      l = l.replace(/\*\*(.+?)\*\*/g, (_, t) => bold(t))
      l = l.replace(/`([^`]+)`/g, (_, t) => dim(t))
      l = l.replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, (_, t, u) => `${t} ${dim(u)}`)
      return l
    })
    .join('\n')
}

function sectionText(id: SectionId, data: unknown): string {
  const d = (data ?? {}) as Record<string, unknown>
  if (typeof d.report === 'string' && d.report) return renderMd(d.report.trim())
  if (typeof d.summary === 'string' && d.summary && !Array.isArray(d.segments))
    return renderMd(d.summary.trim())
  if (typeof d.content === 'string') return renderMd(d.content.trim())
  if (Array.isArray(d.sources)) {
    const s = d.sources as { title: string; url: string }[]
    return s.length
      ? s.map((x, i) => `  ${dim(String(i + 1).padStart(2, '0'))} ${x.title} ${dim(x.url)}`).join('\n')
      : dim('  No sources cited.')
  }
  // Fall back to the shared markdown exporter for structured shapes.
  return renderMd(exporterLine(id, data))
}

// Reuse the markdown exporter for a single section by faking a one-entry event map.
function exporterLine(id: SectionId, data: unknown): string {
  const md = toMarkdown('', { [id]: { id, status: 'done', data } })
  // Strip the doc header + the section heading the exporter adds.
  return md.replace(/^#.*$/m, '').replace(/^##\s+.*$/m, '').replace(/_Generated with Tabstack\._/g, '').trim()
}

function printSection(index: number, id: SectionId, ev: SectionEvent) {
  const meta = SECTION_META[id]
  const num = pink(String(index).padStart(2, '0'))
  const glyph = ev.status === 'done' ? pink('▸') : dim('×')
  const title = meta.hero ? pink(bold(meta.title.toUpperCase())) : bold(meta.title)
  process.stdout.write(`\n${num} ${glyph} ${title}\n`)
  if (ev.status === 'error') {
    process.stdout.write(dim(`   Unavailable. ${ev.message ?? ''}\n`))
    return
  }
  const body = sectionText(id, ev.data)
  process.stdout.write(
    body
      .split('\n')
      .map((l) => (l ? `   ${l}` : ''))
      .join('\n') + '\n',
  )
}

function parseArgs(argv: string[]) {
  const positional: string[] = []
  let format = ''
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]
    if (a === '--help' || a === '-h') return { help: true, you: '', competitor: '', format }
    else if (a === '--format' || a === '-f') format = argv[++i]
    else if (a.startsWith('--you=')) positional[0] = a.slice(6)
    else if (a.startsWith('--competitor=')) positional[1] = a.slice(13)
    else if (!a.startsWith('-')) positional.push(a)
  }
  return { help: false, you: positional[0] ?? '', competitor: positional[1] ?? '', format }
}

const HELP = `Competitor Brief

Usage:
  pnpm brief <yourUrl> <competitorUrl> [--format pretty|markdown|json]

Examples:
  pnpm brief https://tabstack.ai https://firecrawl.dev
  pnpm brief https://tabstack.ai https://firecrawl.dev --format json > brief.json

Format defaults to pretty in a terminal, markdown when piped.
Needs TABSTACK_API_KEY (from .env.local locally, or the environment).`

async function main() {
  loadEnv()
  const args = parseArgs(process.argv.slice(2))
  if (args.help || !args.you || !args.competitor) {
    process.stdout.write(HELP + '\n')
    process.exit(args.help ? 0 : 1)
  }

  let you: string, competitor: string
  try {
    you = new URL(args.you).toString()
    competitor = new URL(args.competitor).toString()
  } catch {
    process.stderr.write('Both URLs must be valid (e.g. https://example.com).\n')
    process.exit(1)
  }

  const format = args.format || (tty ? 'pretty' : 'markdown')
  const client = getClient()
  const events: Record<string, SectionEvent> = {}

  if (format === 'pretty') {
    process.stdout.write(`\n${pink('COMPETITOR BRIEF')}\n`)
    process.stdout.write(`${dim(you)}  ${bold('vs')}  ${underline(competitor)}\n`)
  } else {
    process.stderr.write(`Building brief for ${competitor}…\n`)
  }

  const printed = new Set<string>()
  for await (const ev of buildBrief(client, competitor, you)) {
    events[ev.id] = ev
    if (format !== 'pretty') {
      if (ev.status === 'done' || ev.status === 'error') process.stderr.write('.')
      continue
    }
    if ((ev.status === 'done' || ev.status === 'error') && !printed.has(ev.id)) {
      printed.add(ev.id)
      printSection(SECTION_ORDER.indexOf(ev.id) + 1, ev.id, ev)
    }
  }

  if (format === 'markdown') process.stdout.write('\n' + toMarkdown(competitor, events) + '\n')
  else if (format === 'json') process.stdout.write(toJSON(competitor, events) + '\n')
  else process.stdout.write(`\n${dim('Done. Every section is finished output from the live web, via Tabstack.')}\n`)

  if (format !== 'pretty') process.stderr.write(' done\n')
}

main().catch((e) => {
  process.stderr.write(`\n${(e as Error).message}\n`)
  process.exit(1)
})
