// src/components/admin/GameCreator.jsx
import { useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useGameStore } from '../../store/gameStore'

export default function GameCreator({ onCreated }) {
  const [totalRounds, setTotalRounds] = useState(3)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const setGame = useGameStore(s => s.setGame)
  const setRounds = useGameStore(s => s.setRounds)

  async function handleCreate() {
    setLoading(true)
    setError(null)

    // Ensure no active game exists
    const { data: existing } = await supabase
      .from('games')
      .select('id')
      .neq('status', 'finished')
      .maybeSingle()

    if (existing) {
      setError('Ya existe una partida activa. Finalizala antes de crear una nueva.')
      setLoading(false)
      return
    }

    const { data: game, error: gameErr } = await supabase
      .from('games')
      .insert({ total_rounds: totalRounds, status: 'waiting' })
      .select()
      .single()

    if (gameErr) { setError(gameErr.message); setLoading(false); return }

    // Create round rows
    const roundRows = Array.from({ length: totalRounds }, (_, i) => ({
      game_id: game.id,
      round_number: i + 1,
      status: 'pending',
    }))

    const { data: rounds, error: roundErr } = await supabase
      .from('rounds')
      .insert(roundRows)
      .select()

    if (roundErr) { setError(roundErr.message); setLoading(false); return }

    setGame(game)
    setRounds(rounds)
    setLoading(false)
    onCreated(game, rounds)
  }

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold text-white">Nueva partida</h2>
      <label className="block text-gray-300">
        Número de rondas
        <input
          type="number"
          min={1}
          max={10}
          value={totalRounds}
          onChange={e => setTotalRounds(Number(e.target.value))}
          className="ml-3 w-16 rounded bg-gray-700 text-white px-2 py-1"
        />
      </label>
      {error && <p className="text-red-400">{error}</p>}
      <button
        onClick={handleCreate}
        disabled={loading}
        className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white px-6 py-2 rounded"
      >
        {loading ? 'Creando…' : 'Crear partida'}
      </button>
    </div>
  )
}
