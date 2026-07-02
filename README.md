# Competitor Brief

Competitor Brief turns two URLs, your product and a competitor's, into a cited competitive intelligence report: their snapshot, positioning, product, pricing, target customer, recent activity, hiring signals, and what real users actually say, ending with how to position against them.

It's a Stripe Projects build template. Agents run the full brief from the CLI; humans get the same brief as a web app. Every section is a live [Tabstack](https://tabstack.ai) call; the research runs come cited.

## Agent-first: `stripe projects build`

Agents come first here. With Stripe Projects, an agent goes from nothing to real competitive intel in two commands. No keys to paste. No browser. No setup.

```bash
stripe projects build      # clones this template AND provisions TABSTACK_API_KEY
pnpm brief https://you.com https://competitor.com --format json > brief.json
```

`stripe projects build` scaffolds the app and provisions Tabstack for you, so the key is already in the environment by the time the agent runs the brief. `pnpm brief` does the rest, headless.

- **Piped:** clean `markdown` (default) or `json`, ready to use. Reach for `--format json` when you want structured data.
- **In a terminal:** a colorized brief, section by section.

And when a human wants in, the agent rolls out the web app for them (`pnpm dev`, or deploy it). Same `lib/`, same brief, a UI instead of a terminal. The agent works headless. The human gets the app on demand.

## The web app (for humans)

```bash
pnpm install
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000), drop in your product and a competitor, and watch the brief assemble section by section.

You need a `TABSTACK_API_KEY`. If you came in through `stripe projects build`, it's already provisioned. Running the web app on your own? Copy `.env.example` to `.env.local` and add a key from [tabstack.ai](https://tabstack.ai).

## What's in the brief

Eleven sections. Each one is a live call to the web:

| Section | What it tells you | Tabstack endpoint |
| --- | --- | --- |
| Snapshot | What they do, category, founding, size, funding | `/research` |
| Positioning & messaging | Tagline, value props, messaging pillars | `/generate/json` |
| Product | Core products and notable features | `/extract/json` |
| Pricing | Tiers, prices, what's gated | `/extract/json` |
| Target customer / ICP | Who they sell to | `/research` |
| Recent activity | Latest blog posts and changelog | `/extract/markdown` |
| What people are saying | Real user sentiment from Reddit, Hacker News, Product Hunt, reviews | `/research` |
| Hiring signals | Open roles, and what that says about their bets | `/automate` |
| Strengths & gaps | An honest read on both | `/generate/json` |
| **How to position against them** | Where they're weak, what users complain about, and the opening to own | `/research` |
| Sources | Every claim, cited | `/research` |

## How it works

You give it your product and a competitor. The app calls Tabstack on the server and streams each section in as it lands. Your API key never touches the browser. If one section can't be retrieved, it's skipped, and the rest of the brief still finishes.

## Built on

- [Next.js](https://nextjs.org) (App Router)
- [Tabstack SDK](https://www.npmjs.com/package/@tabstack/sdk) for extraction, generation, research, and browser automation
