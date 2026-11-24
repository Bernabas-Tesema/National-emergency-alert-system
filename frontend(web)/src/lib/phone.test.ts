import { describe, expect, it } from 'vitest'
import { isValidPhone, maskPhone } from './phone'

describe('isValidPhone', () => {
  it('accepts Ethiopian mobile numbers in both formats', () => {
    expect(isValidPhone('+251911000001')).toBe(true)
    expect(isValidPhone('0911000001')).toBe(true)
  })

  it('rejects other numbers', () => {
    expect(isValidPhone('12345')).toBe(false)
    expect(isValidPhone('0811000001')).toBe(false)
    expect(isValidPhone('+25191100000')).toBe(false)
    expect(isValidPhone('0911000001x')).toBe(false)
  })
})

describe('maskPhone', () => {
  it('hides the middle of a number', () => {
    expect(maskPhone('+251911000001')).toBe('+251•••••001')
  })

  it('leaves very short values alone', () => {
    expect(maskPhone('12345')).toBe('12345')
  })
})