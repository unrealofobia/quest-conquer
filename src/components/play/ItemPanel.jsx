import { ITEMS } from '../../lib/constants'

export default function ItemPanel({ items, onUse, disabled }) {
  const available = items.filter(it => !it.is_used)

  if (available.length === 0) return (
    <div className="bg-gray-800 rounded-xl p-4 text-center text-gray-500 text-sm">Sin items disponibles</div>
  )

  return (
    <div className="space-y-2">
      <p className="text-gray-400 text-sm">Items del equipo</p>
      <div className="grid grid-cols-3 gap-2">
        {available.map(item => (
          <button
            key={item.id}
            onClick={() => onUse(item)}
            disabled={disabled}
            className="bg-gray-800 border border-gray-600 hover:border-yellow-500 hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed rounded-lg p-3 flex flex-col items-center gap-1 transition-all"
          >
            <span className="text-3xl">{ITEMS[item.type]?.icon}</span>
            <span className="text-white text-xs font-semibold">{ITEMS[item.type]?.label}</span>
            <span className="text-gray-400 text-xs text-center leading-tight">{ITEMS[item.type]?.description}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
