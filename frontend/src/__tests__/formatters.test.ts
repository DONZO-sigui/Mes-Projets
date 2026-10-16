import { describe, it, expect } from 'vitest'
import { formatDate, truncateHash, formatAmount } from '../utils/formatters'

describe('formatDate', () => {
  it('returns — for null', () => {
    expect(formatDate(null)).toBe('—')
  })

  it('returns — for undefined', () => {
    expect(formatDate(undefined)).toBe('—')
  })

  it('formats a valid ISO date string', () => {
    const result = formatDate('2024-01-15T10:30:00Z')
    expect(typeof result).toBe('string')
    expect(result).not.toBe('—')
  })
})

describe('truncateHash', () => {
  it('returns — for null', () => {
    expect(truncateHash(null)).toBe('—')
  })

  it('truncates a long hash', () => {
    const hash = 'abcdef1234567890abcdef1234567890'
    const result = truncateHash(hash, 4)
    expect(result).toBe('abcd…7890')
  })

  it('uses 8 chars by default', () => {
    const hash = 'a'.repeat(20) + 'b'.repeat(20)
    const result = truncateHash(hash)
    expect(result).toContain('…')
    expect(result.length).toBe(17) // 8 + … + 8
  })
})

describe('formatAmount', () => {
  it('formats GNF correctly', () => {
    const result = formatAmount(50000, 'GNF')
    expect(result).toContain('50')
    expect(typeof result).toBe('string')
  })

  it('formats EUR correctly', () => {
    const result = formatAmount(100, 'EUR')
    expect(result).toContain('100')
  })

  it('falls back to GNF for unknown devise', () => {
    const result = formatAmount(100, 'XYZ')
    expect(typeof result).toBe('string')
  })
})
