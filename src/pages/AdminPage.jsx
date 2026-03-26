// src/pages/AdminPage.jsx
import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { useGameStore } from '../store/gameStore'
import { ROLES } from '../lib/constants'
import GamesDashboard from '../components/admin/GamesDashboard'
import GameCreator from '../components/admin/GameCreator'
import RoundBuilder from '../components/admin/RoundBuilder'
import GameQR from '../components/admin/GameQR'
import GameControls from '../components/admin/GameControls'

export default function AdminPage() {
  const rounds = useGameStore(s => s.rounds)
  const game = useGameStore(s => s.game)
  const players = useGameStore(s => s.players)
  const setGame = useGameStore(s => s.setGame)
  const setRounds = useGameStore(s => s.setRounds)
  const [step, setStep] = useState('dashboard') // 'dashboard' | 'create' | 'build' | 'lobby'

  async function handleSelectGame(selectedGame) {
    const { data: roundsData } = await supabase
      .from('rounds')
      .select('*, questions(*, question_options(*))')
      .eq('game_id', selectedGame.id)
      .order('round_number', { ascending: true })

    setGame(selectedGame)
    setRounds(roundsData ?? [])
    setStep('lobby')
  }

  if (step === 'dashboard') {
    return <GamesDashboard onSelectGame={handleSelectGame} onNewGame={() => setStep('create')} />
  }

  if (step === 'create') {
    return (
      <div className="p-8 bg-gray-900 min-h-screen">
        <h1 className="text-2xl font-bold text-white mb-6">Quest & Conquer — Admin</h1>
        <GameCreator onCreated={() => setStep('build')} />
      </div>
    )
  }

  if (step === 'build') {
    return (
      <div className="p-8 bg-gray-900 min-h-screen space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold text-white">Configurar rondas</h1>
          <button onClick={() => setStep('lobby')} className="bg-indigo-600 hover:bg-indigo-500 text-white px-5 py-2 rounded">
            Listo → Sala de espera
          </button>
        </div>
        {rounds.map(round => <RoundBuilder key={round.id} round={round} />)}
      </div>
    )
  }

  return (
    <div className="p-8 bg-gray-900 min-h-screen space-y-6">
      <h1 className="text-2xl font-bold text-white">Quest & Conquer — Admin</h1>
      <div className="flex gap-8 flex-wrap">
        <GameQR gameId={game?.id} />
        <div className="space-y-4">
          <div>
            <p className="text-gray-400 text-sm">Jugadores ({players.length}/5)</p>
            <ul className="mt-2 space-y-1">
              {players.map(p => (
                <li key={p.id} className="text-white text-sm">{ROLES[p.role]?.icon} {p.nickname} — {ROLES[p.role]?.label}</li>
              ))}
            </ul>
          </div>
          {game && rounds.length > 0 && <GameControls game={game} rounds={rounds} />}
        </div>
      </div>
    </div>
  )
}
