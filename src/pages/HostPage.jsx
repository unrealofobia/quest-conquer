// src/pages/HostPage.jsx
import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useGameStore } from '../store/gameStore'
import { useGameChannel } from '../hooks/useGameChannel'
import { ROLES } from '../lib/constants'
import LobbyView from '../components/host/LobbyView'
import QuestionDisplay from '../components/host/QuestionDisplay'
import CountdownTimer from '../components/host/CountdownTimer'
import ScoreBoard from '../components/host/ScoreBoard'
import MusicPlayer from '../components/host/MusicPlayer'
import ItemInventory from '../components/host/ItemInventory'

export default function HostPage() {
  const game = useGameStore(s => s.game)
  const setGame = useGameStore(s => s.setGame)
  const players = useGameStore(s => s.players)
  const setPlayers = useGameStore(s => s.setPlayers)
  const items = useGameStore(s => s.items)
  const setItems = useGameStore(s => s.setItems)
  const activeQuestion = useGameStore(s => s.activeQuestion)
  const setActiveQuestion = useGameStore(s => s.setActiveQuestion)
  const secondsRemaining = useGameStore(s => s.secondsRemaining)
  const setSecondsRemaining = useGameStore(s => s.setSecondsRemaining)
  const removedOptionIds = useGameStore(s => s.removedOptionIds)
  const setRemovedOptionIds = useGameStore(s => s.setRemovedOptionIds)
  const updatePlayerAbilityUses = useGameStore(s => s.updatePlayerAbilityUses)
  const setAnswered = useGameStore(s => s.setAnswered)
  const resetQuestionState = useGameStore(s => s.resetQuestionState)

  const [phase, setPhase] = useState('lobby')
  const [teamScore, setTeamScore] = useState(0)
  const [roundInfo, setRoundInfo] = useState({ current: 1, total: 1, questionCurrent: 1, questionTotal: 1 })
  const [musicUrl, setMusicUrl] = useState(null)
  const [musicPlaying, setMusicPlaying] = useState(false)
  const [finalScore, setFinalScore] = useState(null)

  useEffect(() => {
    async function loadGame() {
      const { data: g } = await supabase.from('games').select('*').neq('status', 'finished').maybeSingle()
      if (!g) return
      setGame(g)
      setTeamScore(g.team_score)

      const { data: dbPlayers } = await supabase.from('players').select('*').eq('game_id', g.id)
      setPlayers(dbPlayers ?? [])

      const { data: dbItems } = await supabase.from('game_items').select('*').eq('game_id', g.id)
      setItems(dbItems ?? [])
    }
    loadGame()

    const ch = supabase.channel('host-players')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'players' }, p => {
        setPlayers(prev => [...prev, p.new])
      })
      .subscribe()

    return () => supabase.removeChannel(ch)
  }, [setGame, setPlayers, setItems])

  const handleEvent = useCallback((event, payload) => {
    switch (event) {
      case 'game:started':
        setPhase('playing')
        break

      case 'round:started':
        setMusicUrl(payload.music_url)
        setMusicPlaying(true)
        setRoundInfo(prev => ({ ...prev, current: payload.round_number, questionCurrent: 1 }))
        break

      case 'question:active':
        supabase.from('questions').select('*, question_options(*)').eq('id', payload.question_id).single()
          .then(({ data: q }) => {
            setActiveQuestion(q, payload.assigned_player_id, payload.time_limit)
            setRoundInfo(prev => ({ ...prev, total: prev.total }))
          })
        break

      case 'timer:tick':
        setSecondsRemaining(payload.seconds_remaining)
        break

      case 'ability:used':
        if (payload.role === 'archer') {
          setRemovedOptionIds(payload.removed_option_ids ?? [])
        }
        updatePlayerAbilityUses(payload.player_id, 0)
        if (payload.role === 'bard' && payload.target_player_id) {
          updatePlayerAbilityUses(payload.target_player_id, 1)
        }
        break

      case 'question:answered':
        setTeamScore(payload.new_team_score)
        setAnswered()
        break

      case 'question:timeout':
        setTeamScore(payload.new_team_score)
        setAnswered()
        break

      case 'item:dropped':
        setItems(prev => [...prev, { id: payload.game_item_id, type: payload.item_type, is_used: false }])
        break

      case 'item:used':
        setItems(prev => prev.map(it => it.id === payload.item_id ? { ...it, is_used: true } : it))
        break

      case 'round:completed':
        setMusicPlaying(false)
        resetQuestionState()
        break

      case 'game:paused':
        setPhase('paused')
        setMusicPlaying(false)
        break

      case 'game:resumed':
        setPhase('playing')
        setMusicPlaying(true)
        break

      case 'game:finished':
        setFinalScore(payload.final_score)
        setPhase('finished')
        setMusicPlaying(false)
        break

      case 'game:restarted':
        setPhase('lobby')
        resetQuestionState()
        setTeamScore(0)
        setMusicPlaying(false)
        break
    }
  }, [setActiveQuestion, setSecondsRemaining, setRemovedOptionIds, updatePlayerAbilityUses, setAnswered, resetQuestionState, setItems])

  useGameChannel(handleEvent)

  const assignedPlayer = players.find(p => p.id === useGameStore.getState().assignedPlayerId)

  if (phase === 'lobby') {
    return <LobbyView players={players} onStart={() => {}} />
  }

  if (phase === 'finished') {
    return (
      <div className="min-h-screen bg-gray-900 flex flex-col items-center justify-center gap-6 text-white">
        <h1 className="text-5xl font-extrabold">¡Juego terminado!</h1>
        <p className="text-3xl text-indigo-400 font-bold">Puntuación final: {finalScore}</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-900 p-8 space-y-6">
      <MusicPlayer musicUrl={musicUrl} playing={musicPlaying} />

      <div className="flex justify-between items-start">
        <ScoreBoard
          score={teamScore}
          roundNumber={roundInfo.current}
          totalRounds={roundInfo.total}
          questionNumber={roundInfo.questionCurrent}
          totalQuestions={roundInfo.questionTotal}
        />
        <CountdownTimer seconds={secondsRemaining} total={activeQuestion?.time_limit} />
      </div>

      {phase === 'paused' && (
        <div className="text-center text-yellow-400 text-2xl font-bold">⏸ Juego pausado</div>
      )}

      <QuestionDisplay
        question={activeQuestion}
        removedOptionIds={removedOptionIds}
        assignedPlayer={assignedPlayer}
        roles={ROLES}
      />

      <ItemInventory items={items} />
    </div>
  )
}
