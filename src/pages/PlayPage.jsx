// src/pages/PlayPage.jsx
import { useEffect, useState, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { usePlayerStore } from '../store/playerStore'
import { useGameStore } from '../store/gameStore'
import { useGameChannel } from '../hooks/useGameChannel'
import { useLobbyPresence } from '../hooks/useLobbyPresence'
import { ROLES, CLOCK_BONUS_SECONDS } from '../lib/constants'
import AnswerOptions from '../components/play/AnswerOptions'
import AbilityPanel from '../components/play/AbilityPanel'
import BardSelector from '../components/play/BardSelector'
import ItemPanel from '../components/play/ItemPanel'

export default function PlayPage() {
  const { role } = useParams()
  const navigate = useNavigate()
  const playerId = usePlayerStore(s => s.playerId)
  const nickname = usePlayerStore(s => s.nickname)
  const playerRole = usePlayerStore(s => s.role)
  const gameId = usePlayerStore(s => s.gameId)
  const clearPlayer = usePlayerStore(s => s.clearPlayer)

  const setGame = useGameStore(s => s.setGame)
  const players = useGameStore(s => s.players)
  const setPlayers = useGameStore(s => s.setPlayers)
  const items = useGameStore(s => s.items)
  const setItems = useGameStore(s => s.setItems)
  const activeQuestion = useGameStore(s => s.activeQuestion)
  const setActiveQuestion = useGameStore(s => s.setActiveQuestion)
  const assignedPlayerId = useGameStore(s => s.assignedPlayerId)
  const secondsRemaining = useGameStore(s => s.secondsRemaining)
  const setSecondsRemaining = useGameStore(s => s.setSecondsRemaining)
  const abilityUsedThisQuestion = useGameStore(s => s.abilityUsedThisQuestion)
  const setAbilityUsed = useGameStore(s => s.setAbilityUsed)
  const itemUsedThisQuestion = useGameStore(s => s.itemUsedThisQuestion)
  const setItemUsed = useGameStore(s => s.setItemUsed)
  const setAnswered = useGameStore(s => s.setAnswered)
  const resetQuestionState = useGameStore(s => s.resetQuestionState)
  const updatePlayerAbilityUses = useGameStore(s => s.updatePlayerAbilityUses)
  const removedOptionIds = useGameStore(s => s.removedOptionIds)
  const setRemovedOptionIds = useGameStore(s => s.setRemovedOptionIds)
  const setIsDoubled = useGameStore(s => s.setIsDoubled)
  const setHeartActive = useGameStore(s => s.setHeartActive)

  const [phase, setPhase] = useState('lobby')
  const [showBardSelector, setShowBardSelector] = useState(false)
  const [teamScore, setTeamScore] = useState(0)

  const { track } = useLobbyPresence()

  useEffect(() => {
    if (!playerId) { navigate('/join', { replace: true }); return }

    track({ playerId, nickname, role: playerRole })

    async function load() {
      const { data: g } = await supabase.from('games').select('*').eq('id', gameId).single()
      setGame(g)
      setTeamScore(g?.team_score ?? 0)

      const { data: ps } = await supabase.from('players').select('*').eq('game_id', gameId)
      setPlayers(ps ?? [])

      const { data: its } = await supabase.from('game_items').select('*').eq('game_id', gameId)
      setItems(its ?? [])
    }
    load()
  }, [playerId, nickname, playerRole, gameId, navigate, track, setGame, setPlayers, setItems])

  const isAssigned = assignedPlayerId === playerId
  const canAct = !!activeQuestion && !abilityUsedThisQuestion && !itemUsedThisQuestion
  const myPlayer = players.find(p => p.id === playerId)
  const abilityUses = myPlayer?.ability_uses ?? 0
  const teammates = players.filter(p => p.id !== playerId)

  const handleEvent = useCallback((event, payload) => {
    switch (event) {
      case 'game:started':
        setPhase('playing')
        break

      case 'question:active':
        supabase.from('questions').select('*, question_options(*)').eq('id', payload.question_id).single()
          .then(({ data: q }) => {
            setActiveQuestion(q, payload.assigned_player_id, payload.time_limit)
          })
        setShowBardSelector(false)
        break

      case 'timer:tick':
        setSecondsRemaining(payload.seconds_remaining)
        break

      case 'question:answered':
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

      case 'ability:used':
        updatePlayerAbilityUses(payload.player_id, 0)
        if (payload.role === 'bard' && payload.target_player_id === playerId) {
          updatePlayerAbilityUses(playerId, 1)
        }
        if (payload.role === 'archer') {
          setRemovedOptionIds(payload.removed_option_ids ?? [])
        }
        if (payload.role === 'thief') setIsDoubled(true)
        break

      case 'round:completed':
        resetQuestionState()
        break

      case 'game:paused':
        setPhase('paused')
        break

      case 'game:resumed':
        setPhase('playing')
        break

      case 'game:finished':
        setPhase('finished')
        break

      case 'game:restarted':
        resetQuestionState()
        setTeamScore(0)
        setPhase('exited')
        break
    }
  }, [setActiveQuestion, setSecondsRemaining, setAnswered, setItems, updatePlayerAbilityUses, setRemovedOptionIds, setIsDoubled, resetQuestionState, playerId])

  const { emit } = useGameChannel(handleEvent)

  async function handleAnswer(optionId, isCorrect) {
    emit('question:answered', {
      player_id: playerId,
      option_id: optionId,
      is_correct: isCorrect,
    })
    setAnswered()
  }

  function handleUseAbility() {
    if (!canAct || abilityUses <= 0) return

    if (role === 'bard') {
      setShowBardSelector(true)
      return
    }

    const incorrectOptionIds = role === 'archer'
      ? (activeQuestion.question_options ?? []).filter(o => !o.is_correct).map(o => o.id)
      : []

    emit('ability:used', {
      player_id: playerId,
      role,
      ability: ROLES[role]?.ability,
      removed_option_ids: incorrectOptionIds,
    })
    setAbilityUsed()
    updatePlayerAbilityUses(playerId, 0)

    if (role === 'thief') setIsDoubled(true)
    if (role === 'archer') setRemovedOptionIds(incorrectOptionIds.slice(0, 2))
  }

  function handleBardSelect(targetPlayerId) {
    emit('ability:used', {
      player_id: playerId,
      role: 'bard',
      ability: ROLES.bard.ability,
      target_player_id: targetPlayerId,
    })
    setAbilityUsed()
    updatePlayerAbilityUses(playerId, 0)
    updatePlayerAbilityUses(targetPlayerId, 1)
    setShowBardSelector(false)
  }

  async function handleUseItem(item) {
    if (!canAct) return

    await supabase.from('game_items').update({ is_used: true }).eq('id', item.id)
    emit('item:used', { player_id: playerId, item_id: item.id, type: item.type })
    setItemUsed()
    setItems(prev => prev.map(it => it.id === item.id ? { ...it, is_used: true } : it))

    if (item.type === 'heart') setHeartActive(true)
    if (item.type === 'chest') updatePlayerAbilityUses(playerId, 1)
    // clock item: admin handles the timer extension on receiving item:used event
  }

  if (phase === 'lobby') {
    return (
      <div className="min-h-screen bg-gray-900 flex flex-col items-center justify-center gap-4 text-white">
        <span className="text-6xl">{ROLES[role]?.icon}</span>
        <h2 className="text-2xl font-bold">{nickname}</h2>
        <p className="text-indigo-400 font-semibold">{ROLES[role]?.label}</p>
        <p className="text-gray-400 mt-4">Esperando que inicie la partida…</p>
      </div>
    )
  }

  if (phase === 'exited') {
    return (
      <div className="min-h-screen bg-gray-900 flex flex-col items-center justify-center gap-6 text-white px-4">
        <span className="text-6xl">🎉</span>
        <h1 className="text-3xl font-bold">¡Gracias por participar!</h1>
        <p className="text-gray-400 text-lg">Puntuación del equipo: <span className="text-indigo-400 font-bold">{teamScore}</span></p>
        <button
          onClick={() => { clearPlayer(); navigate('/join', { replace: true }) }}
          className="mt-4 bg-indigo-600 hover:bg-indigo-500 text-white px-8 py-3 rounded-xl font-bold text-lg transition-all"
        >
          Volver a jugar
        </button>
      </div>
    )
  }

  if (phase === 'finished') {
    return (
      <div className="min-h-screen bg-gray-900 flex flex-col items-center justify-center gap-4 text-white">
        <h1 className="text-3xl font-bold">¡Juego terminado!</h1>
        <p className="text-indigo-400 text-2xl font-bold">Puntuación: {teamScore}</p>
      </div>
    )
  }

  if (showBardSelector) {
    return (
      <div className="min-h-screen bg-gray-900 flex flex-col items-center justify-center p-6">
        <BardSelector teammates={teammates} onSelect={handleBardSelect} />
      </div>
    )
  }

  if (isAssigned) {
    return (
      <div className="min-h-screen bg-gray-900 p-6 space-y-6">
        <div className="flex justify-between items-center">
          <p className="text-indigo-400 font-semibold">¡Te toca responder!</p>
          <p className="text-white font-bold tabular-nums">{secondsRemaining ?? '--'}s</p>
        </div>
        <AnswerOptions
          question={activeQuestion}
          onAnswer={handleAnswer}
          disabled={phase === 'paused'}
          removedOptionIds={removedOptionIds}
        />
      </div>
    )
  }

  const assignedNickname = players.find(p => p.id === assignedPlayerId)?.nickname ?? '...'
  return (
    <div className="min-h-screen bg-gray-900 p-6 space-y-6">
      <div className="flex justify-between items-center">
        <p className="text-gray-400 text-sm">{assignedNickname} está respondiendo</p>
        <p className="text-white font-bold tabular-nums">{secondsRemaining ?? '--'}s</p>
      </div>
      <AbilityPanel
        role={role}
        abilityUses={abilityUses}
        onUse={handleUseAbility}
        disabled={!canAct || phase === 'paused'}
      />
      <ItemPanel
        items={items}
        onUse={handleUseItem}
        disabled={!canAct || phase === 'paused'}
      />
      <div className="text-center text-gray-500 text-sm">
        Puntos del equipo: <span className="text-white font-bold">{teamScore}</span>
      </div>
    </div>
  )
}
