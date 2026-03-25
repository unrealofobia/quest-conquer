import { ITEM_DROP_CHANCE } from '../lib/constants'

const ITEM_TYPES = ['clock', 'heart', 'chest']

/**
 * @returns {'clock'|'heart'|'chest'|null}
 */
export function rollItemDrop() {
  if (Math.random() > ITEM_DROP_CHANCE) return null
  return ITEM_TYPES[Math.floor(Math.random() * ITEM_TYPES.length)]
}
