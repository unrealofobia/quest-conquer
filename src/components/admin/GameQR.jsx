import { QRCodeSVG } from 'qrcode.react'

const JOIN_BASE_URL = import.meta.env.VITE_JOIN_URL || `${window.location.origin}/join`

export default function GameQR({ gameId }) {
  if (!gameId) return null
  const url = JOIN_BASE_URL

  return (
    <div className="flex flex-col items-center gap-4 bg-white rounded-xl p-6 w-fit">
      <QRCodeSVG value={url} size={200} />
      <p className="text-gray-800 text-sm font-mono">{url}</p>
      <p className="text-gray-500 text-xs">Escanea para unirse a la partida</p>
    </div>
  )
}
