import { useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'
import { LOBBY_CHANNEL } from '../lib/constants'

/**
 * Track presence in the lobby channel.
 * Each player calls track() with their info.
 *
 * @returns {{ presenceList: object[], track: (info: object) => void }}
 */
export function useLobbyPresence() {
  const channelRef = useRef(null)
  const [presenceList, setPresenceList] = useState([])

  useEffect(() => {
    const channel = supabase.channel(LOBBY_CHANNEL)

    const syncPresence = () => {
      const state = channel.presenceState()
      const list = Object.values(state).flat()
      setPresenceList(list)
    }

    channel
      .on('presence', { event: 'sync' }, syncPresence)
      .on('presence', { event: 'join' }, syncPresence)
      .on('presence', { event: 'leave' }, syncPresence)
      .subscribe()

    channelRef.current = channel

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  function track(info) {
    channelRef.current?.track(info)
  }

  return { presenceList, track }
}
