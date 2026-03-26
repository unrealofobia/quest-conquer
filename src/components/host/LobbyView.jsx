import { ROLES } from '../../lib/constants'

export default function LobbyView({ players, onStart }) {
  const canStart = players.length === 5

  return (
    <div className="min-h-screen bg-gray-900 flex flex-col items-center justify-center gap-8 p-8">
      <h1 className="text-4xl font-bold text-white">Quest & Conquer</h1>
      <p className="text-gray-400">{players.length}/5 jugadores conectados</p>

      <div className="grid grid-cols-5 gap-4">
        {Array.from({ length: 5 }, (_, i) => {
          const player = players[i]
          return (
            <div key={i} className={`w-32 h-40 rounded-xl flex flex-col items-center justify-center gap-2 border-2 ${player ? 'bg-gray-800 border-indigo-500' : 'bg-gray-800/30 border-gray-700 opacity-40'}`}>
              {player ? (
                <>
                  <span className="text-4xl">{ROLES[player.role]?.icon}</span>
                  <span className="text-white font-semibold text-sm text-center px-2">{player.nickname}</span>
                  <span className="text-gray-400 text-xs">{ROLES[player.role]?.label}</span>
                </>
              ) : (
                <span className="text-gray-600 text-3xl">?</span>
              )}
            </div>
          )
        })}
      </div>

      <button
        onClick={onStart}
        disabled={!canStart}
        className="bg-green-600 hover:bg-green-500 disabled:opacity-40 disabled:cursor-not-allowed text-white px-10 py-3 rounded-xl text-lg font-bold transition-all"
      >
        {canStart ? '¡Comenzar!' : 'Esperando jugadores…'}
      </button>
    </div>
  )
}
