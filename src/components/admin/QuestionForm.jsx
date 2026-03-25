// src/components/admin/QuestionForm.jsx
import { useState } from 'react'
import { supabase } from '../../lib/supabase'

const DIFFICULTIES = ['easy', 'medium', 'hard']
const DIFF_LABELS = { easy: 'Fácil', medium: 'Medio', hard: 'Difícil' }

export default function QuestionForm({ roundId, onSaved }) {
  const [body, setBody] = useState('')
  const [difficulty, setDifficulty] = useState('medium')
  const [pointsCorrect, setPointsCorrect] = useState(100)
  const [pointsWrong, setPointsWrong] = useState(50)
  const [timeLimit, setTimeLimit] = useState(30)
  const [options, setOptions] = useState([
    { body: '', is_correct: true },
    { body: '', is_correct: false },
    { body: '', is_correct: false },
    { body: '', is_correct: false },
  ])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  function updateOption(index, field, value) {
    setOptions(prev => prev.map((opt, i) => {
      if (i !== index) return field === 'is_correct' && value ? { ...opt, is_correct: false } : opt
      return { ...opt, [field]: value }
    }))
  }

  async function handleSave() {
    if (!body.trim()) { setError('El texto de la pregunta es requerido.'); return }
    if (options.some(o => !o.body.trim())) { setError('Todas las opciones deben tener texto.'); return }
    if (!options.some(o => o.is_correct)) { setError('Debes marcar una opción como correcta.'); return }

    setSaving(true)
    setError(null)

    // Get current question count for order
    const { count } = await supabase
      .from('questions')
      .select('*', { count: 'exact', head: true })
      .eq('round_id', roundId)

    const { data: question, error: qErr } = await supabase
      .from('questions')
      .insert({ round_id: roundId, body, difficulty, points_correct: pointsCorrect, points_wrong: pointsWrong, time_limit: timeLimit, order: count ?? 0 })
      .select()
      .single()

    if (qErr) { setError(qErr.message); setSaving(false); return }

    const { error: oErr } = await supabase
      .from('question_options')
      .insert(options.map(o => ({ question_id: question.id, body: o.body, is_correct: o.is_correct })))

    if (oErr) { setError(oErr.message); setSaving(false); return }

    setSaving(false)
    // Reset form
    setBody('')
    setOptions([
      { body: '', is_correct: true },
      { body: '', is_correct: false },
      { body: '', is_correct: false },
      { body: '', is_correct: false },
    ])
    onSaved(question)
  }

  return (
    <div className="bg-gray-800 rounded-lg p-4 space-y-3">
      <textarea
        placeholder="Texto de la pregunta"
        value={body}
        onChange={e => setBody(e.target.value)}
        className="w-full bg-gray-700 text-white rounded px-3 py-2 resize-none"
        rows={2}
      />
      <div className="flex gap-4 flex-wrap">
        <label className="text-gray-300 text-sm">
          Dificultad
          <select value={difficulty} onChange={e => setDifficulty(e.target.value)} className="ml-2 bg-gray-700 text-white rounded px-2 py-1">
            {DIFFICULTIES.map(d => <option key={d} value={d}>{DIFF_LABELS[d]}</option>)}
          </select>
        </label>
        <label className="text-gray-300 text-sm">
          Pts correcta
          <input type="number" min={0} value={pointsCorrect} onChange={e => setPointsCorrect(Number(e.target.value))} className="ml-2 w-16 bg-gray-700 text-white rounded px-2 py-1" />
        </label>
        <label className="text-gray-300 text-sm">
          Pts incorrecta
          <input type="number" min={0} value={pointsWrong} onChange={e => setPointsWrong(Number(e.target.value))} className="ml-2 w-16 bg-gray-700 text-white rounded px-2 py-1" />
        </label>
        <label className="text-gray-300 text-sm">
          Tiempo (s)
          <input type="number" min={5} max={120} value={timeLimit} onChange={e => setTimeLimit(Number(e.target.value))} className="ml-2 w-16 bg-gray-700 text-white rounded px-2 py-1" />
        </label>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {options.map((opt, i) => (
          <div key={i} className="flex items-center gap-2">
            <input
              type="radio"
              name="correct"
              checked={opt.is_correct}
              onChange={() => updateOption(i, 'is_correct', true)}
              className="text-green-500"
            />
            <input
              type="text"
              placeholder={`Opción ${i + 1}`}
              value={opt.body}
              onChange={e => updateOption(i, 'body', e.target.value)}
              className={`flex-1 bg-gray-700 rounded px-2 py-1 text-sm ${opt.is_correct ? 'text-green-400 border border-green-500' : 'text-white'}`}
            />
          </div>
        ))}
      </div>
      {error && <p className="text-red-400 text-sm">{error}</p>}
      <button onClick={handleSave} disabled={saving} className="bg-green-600 hover:bg-green-500 disabled:opacity-50 text-white px-4 py-1.5 rounded text-sm">
        {saving ? 'Guardando…' : '+ Agregar pregunta'}
      </button>
    </div>
  )
}
