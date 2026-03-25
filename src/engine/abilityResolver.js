/**
 * Applies an ability to the current question state.
 * Returns a new state object (immutable update).
 *
 * @param {object} state - Current question state
 * @param {object} action - { playerId, role, targetPlayerId?, incorrectOptionIds? }
 * @returns {object} Updated state
 */
export function applyAbility(state, { playerId, role, targetPlayerId, incorrectOptionIds = [] }) {
  const players = state.players.map(p =>
    p.id === playerId ? { ...p, ability_uses: p.ability_uses - 1 } : p
  )

  switch (role) {
    case 'paladin':
      return { ...state, players, skipped: true }

    case 'warrior':
      return { ...state, players, assignedPlayerId: playerId }

    case 'archer': {
      const toRemove = incorrectOptionIds.slice(0, 2)
      return { ...state, players, removedOptionIds: toRemove }
    }

    case 'thief':
      return { ...state, players, isDoubled: true }

    case 'bard': {
      const restoredPlayers = players.map(p =>
        p.id === targetPlayerId ? { ...p, ability_uses: 1 } : p
      )
      return { ...state, players: restoredPlayers }
    }

    default:
      return state
  }
}
