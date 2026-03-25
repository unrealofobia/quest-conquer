import { useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { GAME_CHANNEL } from '../lib/constants'

/**
 * Subscribe to Broadcast events on the "game" channel.
 * Returns an `emit` function to broadcast events.
 *
 * @param {(event: string, payload: object) => void} onEvent
 * @returns {{ emit: (event: string, payload: object) => void }}
 */
export function useGameChannel(onEvent) {
  const channelRef = useRef(null)

  useEffect(() => {
    const channel = supabase.channel(GAME_CHANNEL, {
      config: { broadcast: { self: true } },
    })

    channel.on('broadcast', { event: '*' }, ({ event, payload }) => {
      onEvent(event, payload)
    })

    channel.subscribe()
    channelRef.current = channel

    return () => {
      supabase.removeChannel(channel)
    }
  }, [onEvent])

  function emit(event, payload = {}) {
    channelRef.current?.send({
      type: 'broadcast',
      event,
      payload,
    })
  }

  return { emit }
}
