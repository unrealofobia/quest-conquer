import { describe, it, expect } from 'vitest'
import { applyAbility } from '../abilityResolver'

describe('applyAbility', () => {
  const baseState = {
    skipped: false,
    assignedPlayerId: 'p1',
    isDoubled: false,
    removedOptionIds: [],
    players: [
      { id: 'p1', role: 'paladin',  ability_uses: 1 },
      { id: 'p2', role: 'warrior',  ability_uses: 1 },
      { id: 'p3', role: 'archer',   ability_uses: 1 },
      { id: 'p4', role: 'thief',    ability_uses: 1 },
      { id: 'p5', role: 'bard',     ability_uses: 1 },
    ],
  }

  it('paladin sets skipped=true and decrements uses', () => {
    const result = applyAbility({ ...baseState, players: baseState.players.map(p => ({...p})) }, { playerId: 'p1', role: 'paladin' })
    expect(result.skipped).toBe(true)
    expect(result.players.find(p => p.id === 'p1').ability_uses).toBe(0)
  })

  it('warrior changes assignedPlayerId and decrements uses', () => {
    const result = applyAbility({ ...baseState, players: baseState.players.map(p => ({...p})) }, { playerId: 'p2', role: 'warrior' })
    expect(result.assignedPlayerId).toBe('p2')
    expect(result.players.find(p => p.id === 'p2').ability_uses).toBe(0)
  })

  it('archer removes 2 incorrect option ids and decrements uses', () => {
    const state = { ...baseState, players: baseState.players.map(p => ({...p})) }
    const incorrectOptionIds = ['opt-b', 'opt-c', 'opt-d']
    const result = applyAbility(state, { playerId: 'p3', role: 'archer', incorrectOptionIds })
    expect(result.removedOptionIds).toHaveLength(2)
    result.removedOptionIds.forEach(id => expect(incorrectOptionIds).toContain(id))
    expect(result.players.find(p => p.id === 'p3').ability_uses).toBe(0)
  })

  it('thief sets isDoubled=true and decrements uses', () => {
    const result = applyAbility({ ...baseState, players: baseState.players.map(p => ({...p})) }, { playerId: 'p4', role: 'thief' })
    expect(result.isDoubled).toBe(true)
    expect(result.players.find(p => p.id === 'p4').ability_uses).toBe(0)
  })

  it('bard restores target player uses and decrements bard uses', () => {
    const state = {
      ...baseState,
      players: baseState.players.map(p => p.id === 'p2' ? { ...p, ability_uses: 0 } : { ...p }),
    }
    const result = applyAbility(state, { playerId: 'p5', role: 'bard', targetPlayerId: 'p2' })
    expect(result.players.find(p => p.id === 'p2').ability_uses).toBe(1)
    expect(result.players.find(p => p.id === 'p5').ability_uses).toBe(0)
  })
})
