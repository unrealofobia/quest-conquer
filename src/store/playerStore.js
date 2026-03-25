import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

export const usePlayerStore = create(
  persist(
    (set) => ({
      playerId: null,
      nickname: null,
      role: null,
      gameId: null,

      setPlayer: ({ playerId, nickname, role, gameId }) =>
        set({ playerId, nickname, role, gameId }),

      clearPlayer: () =>
        set({ playerId: null, nickname: null, role: null, gameId: null }),
    }),
    {
      name: 'qc-player',
      storage: createJSONStorage(() => sessionStorage),
    }
  )
)
