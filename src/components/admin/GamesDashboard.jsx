// src/components/admin/GamesDashboard.jsx
import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'

const STATUS_LABELS = {
  waiting:     { label: 'En espera',    color: 'text-yellow-400 bg-yellow-400/10 border-yellow-400/30' },
  in_progress: { label: 'En juego',     color: 'text-green-400 bg-green-400/10 border-green-400/30' },
  paused:      { label: 'Pausado',      color: 'text-orange-400 bg-orange-400/10 border-orange-400/30' },
  finished:    { label: 'Finalizado',   color: 'text-gray-400 bg-gray-400/10 border-gray-400/30' },
}

export default function GamesDashboard({ onSelectGame, onNewGame }) {
  const [games, setGames] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from('games')
        .select(`
          *,
          rounds (
            id,
            round_number,
            status,
            music_name,
            questions (
              id,
              body,
              difficulty,
              question_options ( id )
            )
          )
        `)
        .order('created_at', { ascending: false })

      setGames(data ?? [])
      setLoading(false)
    }
    load()
  }, [])

  if (loading) {
    return (
      <div className="p-8 bg-gray-900 min-h-screen flex items-center justify-center">
        <p className="text-gray-400">Cargando partidas…</p>
      </div>
    )
  }

  return (
    <div className="p-8 bg-gray-900 min-h-screen space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-white">Quest & Conquer — Admin</h1>
        <button
          onClick={onNewGame}
          className="bg-indigo-600 hover:bg-indigo-500 text-white px-5 py-2 rounded font-semibold"
        >
          + Nueva partida
        </button>
      </div>

      {games.length === 0 ? (
        <div className="text-center py-20">
          <p className="text-gray-500 text-lg">No hay partidas creadas aún.</p>
          <button
            onClick={onNewGame}
            className="mt-4 bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-2 rounded"
          >
            Crear la primera partida
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {games.map(game => {
            const rounds = game.rounds ?? []
            const totalQuestions = rounds.reduce((sum, r) => sum + (r.questions?.length ?? 0), 0)
            const totalOptions = rounds.reduce((sum, r) =>
              sum + (r.questions ?? []).reduce((s, q) => s + (q.question_options?.length ?? 0), 0), 0)
            const status = STATUS_LABELS[game.status] ?? STATUS_LABELS.waiting
            const canManage = game.status !== 'finished'

            return (
              <div key={game.id} className="bg-gray-800 rounded-xl border border-gray-700 p-5">
                <div className="flex justify-between items-start gap-4">
                  {/* Left: status + meta */}
                  <div className="space-y-3 flex-1">
                    <div className="flex items-center gap-3">
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded border ${status.color}`}>
                        {status.label}
                      </span>
                      <span className="text-gray-500 text-xs font-mono">
                        {new Date(game.created_at).toLocaleString('es', { dateStyle: 'short', timeStyle: 'short' })}
                      </span>
                    </div>

                    {/* Stats */}
                    <div className="flex gap-6">
                      <Stat label="Rondas" value={rounds.length} total={game.total_rounds} />
                      <Stat label="Preguntas" value={totalQuestions} />
                      <Stat label="Respuestas" value={totalOptions} />
                      <Stat label="Puntuación" value={game.team_score} suffix="pts" />
                    </div>

                    {/* Rounds breakdown */}
                    {rounds.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-1">
                        {rounds
                          .sort((a, b) => a.round_number - b.round_number)
                          .map(r => (
                            <div key={r.id} className="bg-gray-700/60 rounded-lg px-3 py-1.5 text-xs space-y-0.5">
                              <p className="text-white font-semibold">Ronda {r.round_number}</p>
                              <p className="text-gray-400">
                                {r.questions?.length ?? 0} preg.
                                {r.music_name && <span className="ml-1 text-indigo-400">· 🎵 {r.music_name}</span>}
                              </p>
                            </div>
                          ))}
                      </div>
                    )}
                  </div>

                  {/* Right: action */}
                  <button
                    onClick={() => canManage && onSelectGame(game)}
                    disabled={!canManage}
                    className="shrink-0 bg-green-600 hover:bg-green-500 disabled:opacity-40 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg font-semibold text-sm"
                  >
                    {game.status === 'waiting' ? '▶ Iniciar' : game.status === 'finished' ? 'Finalizado' : '▶ Continuar'}
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

function Stat({ label, value, total, suffix = '' }) {
  return (
    <div>
      <p className="text-gray-500 text-xs">{label}</p>
      <p className="text-white font-bold">
        {value}{total !== undefined ? `/${total}` : ''}{suffix ? ` ${suffix}` : ''}
      </p>
    </div>
  )
}
