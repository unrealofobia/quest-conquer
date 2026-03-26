// src/components/host/ItemInventory.jsx
import { ITEMS } from '../../lib/constants'

export default function ItemInventory({ items }) {
  const available = items.filter(it => !it.is_used)

  if (available.length === 0) return null

  return (
    <div className="flex gap-3 items-center">
      <span className="text-gray-400 text-sm">Items:</span>
      {available.map(item => (
        <div key={item.id} className="bg-gray-700 rounded-lg px-3 py-1 flex items-center gap-2">
          <span>{ITEMS[item.type]?.icon}</span>
          <span className="text-white text-sm">{ITEMS[item.type]?.label}</span>
        </div>
      ))}
    </div>
  )
}
