// src/components/host/QuestionDisplay.jsx
import { DIFFICULTY_LABELS } from '../../lib/constants'

const DIFF_COLORS = { easy: 'text-green-400', medium: 'text-yellow-400', hard: 'text-red-400' }

export default function QuestionDisplay({ question, removedOptionIds, assignedPlayer, roles }) {
  if (!question) return null

  const options = question.question_options ?? []

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <span className={`text-sm font-semibold uppercase ${DIFF_COLORS[question.difficulty]}`}>
          {DIFFICULTY_LABELS[question.difficulty]}
        </span>
        <span className="text-green-400 text-sm font-semibold">+{question.points_correct} pts</span>
        <span className="text-red-400 text-sm font-semibold">-{question.points_wrong} pts</span>
        {assignedPlayer && (
          <span className="ml-auto text-gray-300 text-sm">
            {roles[assignedPlayer.role]?.icon} <strong>{assignedPlayer.nickname}</strong> responde
          </span>
        )}
      </div>

      {/* Question body */}
      <p className="text-3xl font-bold text-white leading-snug">{question.body}</p>

      {/* Options */}
      <div className="grid grid-cols-2 gap-4">
        {options.map((opt, i) => {
          const isRemoved = removedOptionIds.includes(opt.id)
          return (
            <div key={opt.id} className={`rounded-xl px-6 py-4 text-lg font-semibold transition-all border-2 ${isRemoved ? 'opacity-25 border-gray-700 bg-gray-800 line-through text-gray-500' : 'border-gray-600 bg-gray-800 text-white'}`}>
              <span className="text-gray-400 mr-2">{['A', 'B', 'C', 'D'][i]}.</span>
              {opt.body}
            </div>
          )
        })}
      </div>
    </div>
  )
}
