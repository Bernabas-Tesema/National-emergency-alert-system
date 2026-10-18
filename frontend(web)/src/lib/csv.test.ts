import { describe, expect, it } from 'vitest'
import { toCsv } from './csv'

describe('toCsv', () => {
  it('joins cells with commas and rows with line breaks', () => {
    expect(toCsv([['a', 'b'], ['c', 'd']])).toBe('a,b\r\nc,d')
  })

  it('quotes cells that contain commas, quotes or line breaks', () => {
    expect(toCsv([['a,b', 'say "hi"', 'two\nlines']])).toBe(
      '"a,b","say ""hi""","two\nlines"',
    )
  })

  it('defuses cells that a spreadsheet could run as a formula', () => {
    expect(toCsv([['=1+1', '+1', '-1', '@sum', 'safe']])).toBe(
      "'=1+1,'+1,'-1,'@sum,safe",
    )
  })
})