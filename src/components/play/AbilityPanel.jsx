import { ROLES } from '../../lib/constants'

export default function AbilityPanel({ role, abilityUses, onUse, disabled }) {
  const roleInfo = ROLES[role]
  const canUse = abilityUses > 0 && !disabled

  return (
    <div className="bg-gray-800 rounded-xl p-5 space-y-3">
      <div className="flex items-center gap-3">
        <span className="text-4xl">{roleInfo?.icon}</span>
        <div>
          <p className="text-white font-bold">{roleInfo?.label}</p>
          <p className="text-gray-400 text-sm">{roleInfo?.ability}</p>
        </div>
      </div>
      <button
        onClick={onUse}
        disabled={!canUse}
        className="w-full py-3 rounded-lg font-semibold text-white transition-all bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed"
      >
        {abilityUses <= 0 ? 'Habilidad usada' : disabled ? 'No disponible' : 'Usar habilidad'}
      </button>
    </div>
  )
}
