import { create } from 'zustand'

export const useGameStore = create((set) => ({
  // DB state
  game: null,           // games row
  rounds: [],           // rounds[] for the game
  questions: [],        // questions[] for the active round
  players: [],          // players[] for the game
  items: [],            // game_items[] — shared inventory

  // Live question state (from Broadcast)
  activeQuestion: null,
  assignedPlayerId: null,
  secondsRemaining: null,
  isDoubled: false,
  heartActive: false,
  removedOptionIds: [],
  abilityUsedThisQuestion: false,
  itemUsedThisQuestion: false,
  answered: false,

  // Actions
  setGame: (game) => set({ game }),
  setRounds: (rounds) => set({ rounds }),
  setQuestions: (questions) => set({ questions }),
  setPlayers: (players) => set({ players }),
  setItems: (items) => set({ items }),

  setActiveQuestion: (q, assignedPlayerId, secondsRemaining) =>
    set({
      activeQuestion: q,
      assignedPlayerId,
      secondsRemaining,
      isDoubled: false,
      heartActive: false,
      removedOptionIds: [],
      abilityUsedThisQuestion: false,
      itemUsedThisQuestion: false,
      answered: false,
    }),

  setSecondsRemaining: (s) => set({ secondsRemaining: s }),
  setRemovedOptionIds: (ids) => set({ removedOptionIds: ids }),
  setIsDoubled: (v) => set({ isDoubled: v }),
  setHeartActive: (v) => set({ heartActive: v }),
  setAbilityUsed: () => set({ abilityUsedThisQuestion: true }),
  setItemUsed: () => set({ itemUsedThisQuestion: true }),
  setAnswered: () => set({ answered: true }),

  updatePlayerAbilityUses: (playerId, uses) =>
    set((state) => ({
      players: state.players.map(p =>
        p.id === playerId ? { ...p, ability_uses: uses } : p
      ),
    })),

  resetQuestionState: () =>
    set({
      activeQuestion: null,
      assignedPlayerId: null,
      secondsRemaining: null,
      isDoubled: false,
      heartActive: false,
      removedOptionIds: [],
      abilityUsedThisQuestion: false,
      itemUsedThisQuestion: false,
      answered: false,
    }),
}))
