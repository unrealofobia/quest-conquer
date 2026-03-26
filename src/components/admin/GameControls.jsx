// src/components/admin/GameControls.jsx
import { useState, useCallback, useRef } from 'react'
import { supabase } from '../../lib/supabase'
import { useGameStore } from '../../store/gameStore'
import { useGameChannel } from '../../hooks/useGameChannel'
import { useGameTimer } from '../../hooks/useGameTimer'
import { rollItemDrop } from '../../engine/itemDrop'
import { calcScoreDelta } from '../../engine/scoreEngine'
import { ROLES, CLOCK_BONUS_SECONDS } from '../../lib/constants'

export default function GameControls({ game, rounds }) {
  const players = useGameStore(s => s.players)
  const setPlayers = useGameStore(s => s.setPlayers)
  const activeQuestion = useGameStore(s => s.activeQuestion)
  const isDoubled = useGameStore(s => s.isDoubled)
  const heartActive = useGameStore(s => s.heartActive)
  const setActiveQuestion = useGameStore(s => s.setActiveQuestion)
  const setAnswered = useGameStore(s => s.setAnswered)
  const resetQuestionState = useGameStore(s => s.resetQuestionState)

  const [currentRoundIdx, setCurrentRoundIdx] = useState(0)
  const [questionQueue, setQuestionQueue] = useState([])
  const [currentQIdx, setCurrentQIdx] = useState(0)
  const [gamePhase, setGamePhase] = useState('lobby') // lobby | round | question | finished
  const [paused, setPaused] = useState(false)

  // Use a ref for emit to avoid circular dependency between handleEvent and useGameChannel
  const emitRef = useRef(null)

  const handleTick = useCallback((s) => {
    emitRef.current?.('timer:tick', { seconds_remaining: s })
    useGameStore.getState().setSecondsRemaining(s)
  }, [])

  const handleExpire = useCallback(async () => {
    const q = useGameStore.getState().activeQuestion
    if (!q) return
    const heartOn = useGameStore.getState().heartActive
    const delta = heartOn ? 0 : -q.points_wrong
    const { data: g } = await supabase.from('games').select('team_score').eq('id', game.id).single()
    const newScore = g.team_score + delta
    await supabase.from('games').update({ team_score: newScore }).eq('id', game.id)
    emitRef.current?.('question:timeout', { question_id: q.id, new_team_score: newScore })
    useGameStore.getState().setAnswered()
  }, [game])

  const { startTimer, stopTimer } = useGameTimer(handleTick, handleExpire)

  const handleEvent = useCallback((event, payload) => {
    if (event === 'item:used' && payload.type === 'clock') {
      const current = useGameStore.getState().secondsRemaining ?? 0
      startTimer(current + CLOCK_BONUS_SECONDS)
    }
  }, [startTimer])

  const { emit } = useGameChannel(handleEvent)

  // Keep the ref in sync with the latest emit function
  emitRef.current = emit

  async function startGame() {
    const { data: dbPlayers } = await supabase.from('players').select('*').eq('game_id', game.id)
    setPlayers(dbPlayers)

    await supabase.from('games').update({ status: 'in_progress' }).eq('id', game.id)
    emit('game:started', { game_id: game.id })
    setGamePhase('round')
    await startRound(0, dbPlayers)
  }

  async function startRound(roundIdx, currentPlayers) {
    const round = rounds[roundIdx]
    await supabase.from('rounds').update({ status: 'active' }).eq('id', round.id)
    emit('round:started', { round_number: round.round_number, music_url: round.music_url })

    await supabase.from('players').update({ ability_uses: 1 }).eq('game_id', game.id)
    const { data: refreshedPlayers } = await supabase.from('players').select('*').eq('game_id', game.id)
    setPlayers(refreshedPlayers)

    const { data: qs } = await supabase
      .from('questions')
      .select('*, question_options(*)')
      .eq('round_id', round.id)
      .order('"order"')

    setQuestionQueue(qs)
    setCurrentQIdx(0)
    setCurrentRoundIdx(roundIdx)
    setGamePhase('question')
    await activateQuestion(qs, 0, refreshedPlayers)
  }

  async function activateQuestion(qs, qIdx, currentPlayers) {
    const q = qs[qIdx]
    const playerList = currentPlayers || useGameStore.getState().players

    const assignedPlayer = playerList[Math.floor(Math.random() * playerList.length)]

    setActiveQuestion(q, assignedPlayer.id, q.time_limit)
    emit('question:active', {
      question_id: q.id,
      assigned_player_id: assignedPlayer.id,
      time_limit: q.time_limit,
      points_correct: q.points_correct,
      points_wrong: q.points_wrong,
      difficulty: q.difficulty,
    })

    startTimer(q.time_limit)
  }

  async function nextQuestion() {
    resetQuestionState()
    const nextQIdx = currentQIdx + 1

    if (nextQIdx < questionQueue.length) {
      setCurrentQIdx(nextQIdx)
      await activateQuestion(questionQueue, nextQIdx, null)
    } else {
      const round = rounds[currentRoundIdx]
      await supabase.from('rounds').update({ status: 'completed' }).eq('id', round.id)
      const { data: g } = await supabase.from('games').select('team_score').eq('id', game.id).single()
      emit('round:completed', { round_number: round.round_number, team_score: g.team_score })

      const nextRoundIdx = currentRoundIdx + 1
      if (nextRoundIdx < rounds.length) {
        await startRound(nextRoundIdx, null)
      } else {
        await supabase.from('games').update({ status: 'finished' }).eq('id', game.id)
        emit('game:finished', { final_score: g.team_score })
        setGamePhase('finished')
      }
    }
  }

  async function togglePause() {
    if (paused) {
      emit('game:resumed', {})
      setPaused(false)
    } else {
      stopTimer()
      emit('game:paused', {})
      setPaused(true)
    }
  }

  async function restartGame() {
    stopTimer()
    resetQuestionState()
    await supabase.from('games').update({ status: 'waiting', team_score: 0 }).eq('id', game.id)
    await supabase.from('rounds').update({ status: 'pending' }).eq('game_id', game.id)
    emit('game:restarted', {})
    setGamePhase('lobby')
  }

  if (gamePhase === 'lobby') {
    return (
      <button onClick={startGame} className="bg-green-600 hover:bg-green-500 text-white px-8 py-3 rounded-xl font-bold text-lg">
        Iniciar partida
      </button>
    )
  }

  const answered = useGameStore.getState().answered

  return (
    <div className="space-y-4">
      <div className="text-gray-300 text-sm">
        Ronda {currentRoundIdx + 1}/{rounds.length} · Pregunta {currentQIdx + 1}/{questionQueue.length}
      </div>
      <div className="flex gap-3 flex-wrap">
        <button onClick={togglePause} className={`px-4 py-2 rounded font-semibold text-white ${paused ? 'bg-green-600 hover:bg-green-500' : 'bg-yellow-600 hover:bg-yellow-500'}`}>
          {paused ? '▶ Continuar' : '⏸ Pausar'}
        </button>
        {!paused && answered && (
          <button onClick={nextQuestion} className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded font-semibold">
            Siguiente pregunta →
          </button>
        )}
        <button onClick={restartGame} className="bg-red-700 hover:bg-red-600 text-white px-4 py-2 rounded font-semibold">
          ↺ Reiniciar
        </button>
      </div>
      {gamePhase === 'finished' && (
        <p className="text-green-400 font-bold text-lg">¡Juego terminado!</p>
      )}
    </div>
  )
}
