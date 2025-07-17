import { describe, expect, it } from 'vitest'
import { EntityMetadataSchema, formatEntityName, validateEntityMetadata } from '../src/lib/utils.js'

describe('formatEntityName', () => {
  it('should format logical name to display name', () => {
    expect(formatEntityName('contact')).toBe('Contact')
    expect(formatEntityName('custom_entity')).toBe('Custom Entity')
    expect(formatEntityName('account_profile')).toBe('Account Profile')
  })

  it('should handle empty string', () => {
    expect(formatEntityName('')).toBe('')
  })
})

describe('validateEntityMetadata', () => {
  it('should validate correct metadata', () => {
    const metadata = {
      logicalName: 'contact',
      displayName: 'Contact',
      primaryIdAttribute: 'contactid',
      primaryNameAttribute: 'fullname',
    }

    const result = validateEntityMetadata(metadata)
    expect(result).toEqual(metadata)
  })

  it('should throw error for invalid metadata', () => {
    const invalidMetadata = {
      logicalName: 'contact',
      // missing displayName
      primaryIdAttribute: 'contactid',
    }

    expect(() => validateEntityMetadata(invalidMetadata)).toThrow()
  })

  it('should validate without optional fields', () => {
    const metadata = {
      logicalName: 'contact',
      displayName: 'Contact',
      primaryIdAttribute: 'contactid',
    }

    const result = validateEntityMetadata(metadata)
    expect(result).toEqual(metadata)
  })
})
