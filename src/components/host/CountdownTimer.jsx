// src/components/host/CountdownTimer.jsx
export default function CountdownTimer({ seconds, total }) {
  const pct = total > 0 ? seconds / total : 0
  const color = pct > 0.5 ? 'text-green-400' : pct > 0.25 ? 'text-yellow-400' : 'text-red-400'

  return (
    <div className={`text-6xl font-bold tabular-nums ${color}`}>
      {seconds ?? '--'}
    </div>
  )
}
