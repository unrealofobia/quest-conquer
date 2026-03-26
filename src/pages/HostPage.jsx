import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import LobbyView from '../components/host/LobbyView'
import { useGameStore } from '../store/gameStore'

export default function HostPage() {
  const [players, setPlayers] = useState([])
  const setGame = useGameStore(s => s.setGame)

  useEffect(() => {
    // Load active game + players
    async function loadGame() {
      const { data: game } = await supabase
        .from('games')
        .select('*')
        .eq('status', 'waiting')
        .maybeSingle()

      if (!game) return
      setGame(game)

      const { data: dbPlayers } = await supabase
        .from('players')
        .select('*')
        .eq('game_id', game.id)

      setPlayers(dbPlayers ?? [])
    }

    loadGame()

    // Subscribe to players table for real-time joins
    const channel = supabase
      .channel('players-realtime')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'players' }, payload => {
        setPlayers(prev => [...prev, payload.new])
      })
      .subscribe()

    return () => supabase.removeChannel(channel)
  }, [setGame])

  function handleStart() {
    // Game start will be implemented in Task 13 (game controls)
    console.log('start game — handled by GameControls in Task 13')
  }

  return <LobbyView players={players} onStart={handleStart} />
}
