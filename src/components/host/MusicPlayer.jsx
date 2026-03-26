// src/components/host/MusicPlayer.jsx
import { useEffect, useRef } from 'react'

export default function MusicPlayer({ musicUrl, playing }) {
  const audioRef = useRef(null)

  useEffect(() => {
    if (!audioRef.current) return
    if (playing && musicUrl) {
      audioRef.current.src = musicUrl
      audioRef.current.play().catch(() => {})
    } else {
      audioRef.current.pause()
      audioRef.current.currentTime = 0
    }
  }, [playing, musicUrl])

  return <audio ref={audioRef} loop className="hidden" />
}
