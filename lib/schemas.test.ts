import { describe, it, expect } from 'vitest'
import { SECTION_ORDER, pricingSchema, strengthsSchema } from './schemas'

describe('schemas', () => {
  it('defines all eleven sections in order', () => {
    expect(SECTION_ORDER).toHaveLength(11)
    expect(SECTION_ORDER[0]).toBe('snapshot')
    expect(SECTION_ORDER.at(-1)).toBe('sources')
    expect(SECTION_ORDER).toContain('sentiment')
  })

  it('pricing schema targets structured tiers', () => {
    expect(pricingSchema.properties.tiers).toBeTruthy()
  })

  it('strengths schema captures strengths and gaps', () => {
    expect(strengthsSchema.properties.strengths).toBeTruthy()
    expect(strengthsSchema.properties.gaps).toBeTruthy()
  })
})
