import { useRef, useCallback } from 'react'

/**
 * Admin-side timer that counts down from `seconds` and calls
 * onTick(secondsRemaining) each second and onExpire() at 0.
 *
 * @returns {{ startTimer: (seconds: number) => void, stopTimer: () => void }}
 */
export function useGameTimer(onTick, onExpire) {
  const intervalRef = useRef(null)
  const remainingRef = useRef(0)

  const stopTimer = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
  }, [])

  const startTimer = useCallback((seconds) => {
    stopTimer()
    remainingRef.current = seconds
    onTick(seconds)

    intervalRef.current = setInterval(() => {
      remainingRef.current -= 1
      onTick(remainingRef.current)
      if (remainingRef.current <= 0) {
        stopTimer()
        onExpire()
      }
    }, 1000)
  }, [onTick, onExpire, stopTimer])

  return { startTimer, stopTimer }
}
