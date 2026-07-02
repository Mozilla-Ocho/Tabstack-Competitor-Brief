export type SectionId =
  | 'snapshot'
  | 'positioning'
  | 'product'
  | 'pricing'
  | 'icp'
  | 'activity'
  | 'sentiment'
  | 'hiring'
  | 'strengths'
  | 'howToWin'
  | 'sources'

export const SECTION_ORDER: SectionId[] = [
  'snapshot',
  'positioning',
  'product',
  'pricing',
  'icp',
  'activity',
  'sentiment',
  'hiring',
  'strengths',
  'howToWin',
  'sources',
]

export type SectionEvent = {
  id: SectionId
  status: 'pending' | 'done' | 'error'
  data?: unknown
  message?: string
}

// Shape returned by every /research-backed section (snapshot, sentiment, howToWin).
export type ResearchResult = {
  report: string
  sources: { title: string; url: string }[]
}

export const productSchema = {
  type: 'object',
  properties: {
    products: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          name: { type: 'string', description: 'Product or feature name' },
          description: { type: 'string', description: 'What it does, one sentence' },
        },
      },
      description: 'Core products and notable features offered on the page',
    },
  },
} as const

export const pricingSchema = {
  type: 'object',
  properties: {
    tiers: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          name: { type: 'string', description: 'Plan/tier name' },
          price: { type: 'string', description: 'Price as shown, including period' },
          highlights: {
            type: 'array',
            items: { type: 'string' },
            description: 'Key included features',
          },
        },
      },
      description: 'Pricing tiers as listed',
    },
    freeTier: { type: 'boolean', description: 'Whether a free tier exists' },
  },
} as const

export const messagingSchema = {
  type: 'object',
  properties: {
    tagline: { type: 'string', description: 'Headline tagline' },
    valueProps: {
      type: 'array',
      items: { type: 'string' },
      description: 'Primary value propositions',
    },
    messagingPillars: {
      type: 'array',
      items: { type: 'string' },
      description: 'Recurring themes in their messaging',
    },
  },
} as const

export const strengthsSchema = {
  type: 'object',
  properties: {
    strengths: {
      type: 'array',
      items: { type: 'string' },
      description: 'What this company does well, from the page',
    },
    gaps: {
      type: 'array',
      items: { type: 'string' },
      description:
        'Likely weaknesses, blind spots, or under-served areas a competitor could exploit, inferred even if not stated on the page',
    },
  },
} as const

export const icpSchema = {
  type: 'object',
  properties: {
    summary: {
      type: 'string',
      description: 'One or two sentences on who this company sells to',
    },
    segments: {
      type: 'array',
      items: { type: 'string' },
      description: 'Primary customer segments, personas, or industries they target',
    },
  },
} as const
