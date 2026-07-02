import { describe, it, expect, afterEach } from 'vitest'
import { getClient } from './tabstack'

describe('getClient', () => {
  const original = process.env.TABSTACK_API_KEY
  afterEach(() => {
    process.env.TABSTACK_API_KEY = original
  })

  it('throws a clear error when the key is missing', () => {
    delete process.env.TABSTACK_API_KEY
    expect(() => getClient()).toThrow(/TABSTACK_API_KEY/)
  })

  it('returns a client when the key is set', () => {
    process.env.TABSTACK_API_KEY = 'test-key'
    expect(getClient()).toBeTruthy()
  })
})
