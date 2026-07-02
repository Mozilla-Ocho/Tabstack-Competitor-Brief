# Competitor Brief

You shipped a product. Now you have to out-position competitors who have marketing teams you don't. This gives you their whole playbook from one URL: what they ship, what their users actually complain about, and the opening you can own.

It's a starter app, so it's the foundation you build on, not a throwaway script. Every brief runs on [Tabstack](https://tabstack.ai), which returns finished output from the live web in a single call.

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
