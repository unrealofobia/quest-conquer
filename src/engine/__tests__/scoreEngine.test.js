import { describe, it, expect } from 'vitest'
import { calcScoreDelta } from '../scoreEngine'

describe('calcScoreDelta', () => {
  it('returns points_correct on correct answer', () => {
    expect(calcScoreDelta({ isCorrect: true, pointsCorrect: 100, pointsWrong: 50, isDoubled: false, heartActive: false }))
      .toBe(100)
  })

  it('returns negative points_wrong on wrong answer', () => {
    expect(calcScoreDelta({ isCorrect: false, pointsCorrect: 100, pointsWrong: 50, isDoubled: false, heartActive: false }))
      .toBe(-50)
  })

  it('doubles points_correct when thief ability is active', () => {
    expect(calcScoreDelta({ isCorrect: true, pointsCorrect: 100, pointsWrong: 50, isDoubled: true, heartActive: false }))
      .toBe(200)
  })

  it('returns 0 on wrong answer when heart item is active', () => {
    expect(calcScoreDelta({ isCorrect: false, pointsCorrect: 100, pointsWrong: 50, isDoubled: false, heartActive: true }))
      .toBe(0)
  })

  it('does not double when wrong even with isDoubled', () => {
    expect(calcScoreDelta({ isCorrect: false, pointsCorrect: 100, pointsWrong: 50, isDoubled: true, heartActive: false }))
      .toBe(-50)
  })
})
