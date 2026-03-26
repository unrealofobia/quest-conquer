// src/pages/JoinPage.jsx
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { usePlayerStore } from '../store/playerStore'
import { ROLES, ROLE_KEYS } from '../lib/constants'

export default function JoinPage() {
  const [nickname, setNickname] = useState('')
  const [joining, setJoining] = useState(false)
  const [error, setError] = useState(null)
  const [roomFull, setRoomFull] = useState(false)
  const setPlayer = usePlayerStore(s => s.setPlayer)
  const existingRole = usePlayerStore(s => s.role)
  const existingGameId = usePlayerStore(s => s.gameId)
  const navigate = useNavigate()

  // If player already joined, redirect to play
  useEffect(() => {
    if (existingRole && existingGameId) {
      navigate(`/play/${existingRole}`, { replace: true })
    }
  }, [existingRole, existingGameId, navigate])

  async function handleJoin() {
    if (!nickname.trim()) { setError('Ingresa un nickname.'); return }
    setJoining(true)
    setError(null)

    // Get active game
    const { data: game } = await supabase
      .from('games')
      .select('id')
      .eq('status', 'waiting')
      .maybeSingle()

    if (!game) { setError('No hay partida activa en este momento.'); setJoining(false); return }

    // Check player count
    const { count } = await supabase
      .from('players')
      .select('*', { count: 'exact', head: true })
      .eq('game_id', game.id)

    if (count >= 5) { setRoomFull(true); setJoining(false); return }

    // Get taken roles
    const { data: existingPlayers } = await supabase
      .from('players')
      .select('role')
      .eq('game_id', game.id)

    const takenRoles = existingPlayers.map(p => p.role)
    const availableRoles = ROLE_KEYS.filter(r => !takenRoles.includes(r))

    if (availableRoles.length === 0) { setRoomFull(true); setJoining(false); return }

    // Assign random available role
    const role = availableRoles[Math.floor(Math.random() * availableRoles.length)]

    const { data: player, error: pErr } = await supabase
      .from('players')
      .insert({ game_id: game.id, nickname: nickname.trim(), role, ability_uses: 1 })
      .select()
      .single()

    if (pErr) {
      // Unique constraint violation means role was taken (race condition) — retry message
      if (pErr.code === '23505') { setError('Rol tomado por otro jugador, intenta de nuevo.'); setJoining(false); return }
      setError(pErr.message); setJoining(false); return
    }

    setPlayer({ playerId: player.id, nickname: player.nickname, role: player.role, gameId: game.id })
    navigate(`/play/${player.role}`, { replace: true })
  }

  if (roomFull) {
    return (
      <div className="min-h-screen bg-gray-900 flex flex-col items-center justify-center text-white gap-4">
        <div className="text-6xl">🚫</div>
        <h1 className="text-3xl font-bold">Cuarto lleno</h1>
        <p className="text-gray-400">Ya hay 5 jugadores en la partida. ¡Gracias por intentarlo!</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-900 flex flex-col items-center justify-center gap-6 px-4">
      <h1 className="text-3xl font-bold text-white">Quest & Conquer</h1>
      <div className="bg-gray-800 rounded-xl p-6 w-full max-w-sm space-y-4">
        <label className="block text-gray-300">
          Tu nickname
          <input
            type="text"
            maxLength={32}
            value={nickname}
            onChange={e => setNickname(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleJoin()}
            placeholder="Ej. DarkWizard"
            className="mt-1 w-full bg-gray-700 text-white rounded px-3 py-2"
            autoFocus
          />
        </label>
        {error && <p className="text-red-400 text-sm">{error}</p>}
        <button
          onClick={handleJoin}
          disabled={joining}
          className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white py-2.5 rounded font-semibold"
        >
          {joining ? 'Uniéndose…' : 'Unirse al juego'}
        </button>
      </div>
    </div>
  )
}
