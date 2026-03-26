import { useState } from 'react'

export default function AnswerOptions({ question, onAnswer, disabled }) {
  const [selected, setSelected] = useState(null)
  const options = question?.question_options ?? []

  function handleSelect(opt) {
    if (disabled || selected) return
    setSelected(opt.id)
    onAnswer(opt.id, opt.is_correct)
  }

  return (
    <div className="space-y-4">
      <p className="text-xl font-bold text-white">{question?.body}</p>
      <div className="grid grid-cols-2 gap-3">
        {options.map((opt, i) => (
          <button
            key={opt.id}
            onClick={() => handleSelect(opt)}
            disabled={disabled || !!selected}
            className={`rounded-xl px-4 py-6 text-left font-semibold text-lg transition-all border-2
              ${selected === opt.id
                ? opt.is_correct ? 'border-green-500 bg-green-900 text-green-200' : 'border-red-500 bg-red-900 text-red-200'
                : 'border-gray-600 bg-gray-800 text-white hover:border-indigo-500 hover:bg-gray-700'}
              disabled:cursor-not-allowed`}
          >
            <span className="text-gray-400 mr-2">{['A', 'B', 'C', 'D'][i]}.</span>
            {opt.body}
          </button>
        ))}
      </div>
    </div>
  )
}
