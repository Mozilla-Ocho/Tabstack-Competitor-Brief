# Competitor Brief

Enter a competitor's URL and get a deep, cited competitive brief that ends with the section that matters most: **how to position against them.** Built for developers who ship a product and then have to figure out the market around it.

It is a starter app, so it is the foundation you build on, not a one-off script. Every brief runs on [Tabstack](https://tabstack.ai), which returns finished output from the live web in a single API call.

## Run it

```bash
pnpm install
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000), paste a competitor's URL (for example `https://tabstack.ai`), and watch the brief assemble section by section.

You need a `TABSTACK_API_KEY`. If you scaffolded this through Stripe Projects (`stripe projects build`), it is provisioned for you. Otherwise, copy `.env.example` to `.env.local` and add a key from [tabstack.ai](https://tabstack.ai).

## Agent-first: `stripe projects build`

This template is built for agents first. With Stripe Projects, an agent goes from nothing to structured competitive intel in two commands, no keys to paste, no browser, no manual setup:

```bash
stripe projects build      # clones this template AND provisions TABSTACK_API_KEY
pnpm brief https://you.com https://competitor.com --format json > brief.json
```

`stripe projects build` scaffolds the app and provisions Tabstack automatically, so the key is already in the environment by the time the agent runs the brief. `pnpm brief` then produces the full brief headlessly.

- **Piped (agent):** emits clean `markdown` (default) or `json`, ready to consume. `--format json` for structured data.
- **In a terminal (human):** streams a colorized, section-by-section brief; run `--format pretty` explicitly if you're piping but still want it.

And when a human needs it too, the agent can roll out the web app for them (`pnpm dev` locally, or deploy it), same `lib/`, same brief, a UI instead of a terminal. The agent works headless; the human gets the app on demand.

## What's in the brief

Eleven sections, each built from a live-web call:

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

Enter your product and a competitor. The app calls Tabstack's endpoints on the server and streams each section into the page as it lands. Your API key never leaves the server, and if a section can't be retrieved it's skipped so the rest of the brief still completes.

Research runs in fast mode, so the whole thing runs on free serverless tiers like Vercel or Netlify.

## Built on

- [Next.js](https://nextjs.org) (App Router)
- [Tabstack SDK](https://www.npmjs.com/package/@tabstack/sdk) for extraction, generation, research, and browser automation
