import { type SectionId } from './schemas'

export const SECTION_META: Record<SectionId, { title: string; hero?: boolean }> = {
  snapshot: { title: 'Snapshot' },
  positioning: { title: 'Positioning & messaging' },
  product: { title: 'Product' },
  pricing: { title: 'Pricing' },
  icp: { title: 'Target customer / ICP' },
  activity: { title: 'Recent activity' },
  sentiment: { title: 'What people are saying' },
  hiring: { title: 'Hiring signals' },
  strengths: { title: 'Strengths & gaps' },
  howToWin: { title: 'How to position against them', hero: true },
  sources: { title: 'Sources' },
}
