# Competitor Brief

Enter a competitor's URL and get a deep, cited competitive brief that ends with the section that matters most: **how to position against them.** Built for developers who ship a product and then have to figure out the market around it.

It is a starter app, so it is the foundation you build on, not a one-off script. Every brief runs on [Tabstack](https://tabstack.ai), which returns finished output from the live web in a single API call.

## Run it

```bash
pnpm install
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000), paste a competitor's URL, and watch the brief assemble section by section.

You need a `TABSTACK_API_KEY`. If you scaffolded this through Stripe Projects (`stripe projects build`), it is provisioned for you. Otherwise, copy `.env.example` to `.env.local` and add a key from [tabstack.ai](https://tabstack.ai).

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

The single page posts the URL to `/api/brief`, which orchestrates the five Tabstack endpoints on the server and streams each section back as it completes. Your API key stays server-side and never reaches the browser. Any section that fails degrades on its own so the rest of the brief still finishes.

Research cost scales with depth. This template runs the snapshot and sentiment sections in `fast` mode and the "how to position" synthesis in `balanced` mode. Adjust the modes in `lib/collectors.ts` to trade cost for depth.

## Built on

- [Next.js](https://nextjs.org) (App Router)
- [Tabstack SDK](https://www.npmjs.com/package/@tabstack/sdk) for extraction, generation, research, and browser automation
