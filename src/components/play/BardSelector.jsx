import { ROLES } from '../../lib/constants'

export default function BardSelector({ teammates, onSelect }) {
  return (
    <div className="space-y-4">
      <p className="text-white font-bold text-lg text-center">🎵 ¿A quién restauras la habilidad?</p>
      <div className="grid grid-cols-2 gap-3">
        {teammates.map(player => (
          <button
            key={player.id}
            onClick={() => onSelect(player.id)}
            className="bg-gray-800 border-2 border-gray-600 hover:border-indigo-500 hover:bg-gray-700 rounded-xl p-5 flex flex-col items-center gap-2 transition-all"
          >
            <span className="text-4xl">{ROLES[player.role]?.icon}</span>
            <span className="text-white font-semibold">{player.nickname}</span>
            <span className="text-gray-400 text-xs">{ROLES[player.role]?.label}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
