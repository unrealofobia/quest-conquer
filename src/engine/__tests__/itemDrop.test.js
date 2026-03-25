import { describe, it, expect, vi } from 'vitest'
import { rollItemDrop } from '../itemDrop'
import { ITEM_DROP_CHANCE } from '../../lib/constants'

describe('rollItemDrop', () => {
  it('returns an item type when random is below drop chance', () => {
    vi.spyOn(Math, 'random').mockReturnValue(ITEM_DROP_CHANCE - 0.01)
    const result = rollItemDrop()
    expect(['clock', 'heart', 'chest']).toContain(result)
    vi.restoreAllMocks()
  })

  it('returns null when random is above drop chance', () => {
    vi.spyOn(Math, 'random').mockReturnValue(ITEM_DROP_CHANCE + 0.01)
    const result = rollItemDrop()
    expect(result).toBeNull()
    vi.restoreAllMocks()
  })
})
