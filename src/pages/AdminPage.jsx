// src/pages/AdminPage.jsx
import { useState } from 'react'
import { useGameStore } from '../store/gameStore'
import GameCreator from '../components/admin/GameCreator'
import RoundBuilder from '../components/admin/RoundBuilder'
import GameQR from '../components/admin/GameQR'

export default function AdminPage() {
  const rounds = useGameStore(s => s.rounds)
  const game = useGameStore(s => s.game)
  const [step, setStep] = useState('create') // 'create' | 'build' | 'lobby'

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
            Listo → Ver sala de espera
          </button>
        </div>
        {rounds.map(round => <RoundBuilder key={round.id} round={round} />)}
      </div>
    )
  }

  if (step === 'lobby') {
    return (
      <div className="p-8 bg-gray-900 min-h-screen space-y-6">
        <h1 className="text-2xl font-bold text-white">Sala de espera</h1>
        <GameQR gameId={game?.id} />
        {/* GameControls will be added in Task 13 */}
      </div>
    )
  }

  return null
}
