// src/components/admin/RoundBuilder.jsx
import { useState } from 'react'
import { supabase } from '../../lib/supabase'
import QuestionForm from './QuestionForm'

export default function RoundBuilder({ round }) {
  const [questions, setQuestions] = useState([])
  const [musicFile, setMusicFile] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [musicName, setMusicName] = useState('')

  async function handleMusicUpload() {
    if (!musicFile) return
    setUploading(true)
    const path = `${round.game_id}/round-${round.round_number}/${musicFile.name}`
    const { error: upErr } = await supabase.storage.from('round-music').upload(path, musicFile, { upsert: true })
    if (upErr) { alert(upErr.message); setUploading(false); return }

    const { data: { publicUrl } } = supabase.storage.from('round-music').getPublicUrl(path)

    await supabase.from('rounds').update({ music_url: publicUrl, music_name: musicName || musicFile.name }).eq('id', round.id)
    setUploading(false)
    alert('Música subida correctamente')
  }

  return (
    <div className="border border-gray-700 rounded-lg p-4 space-y-4">
      <h3 className="text-white font-semibold">Ronda {round.round_number}</h3>

      {/* Music upload */}
      <div className="flex gap-3 items-end flex-wrap">
        <div className="space-y-1">
          <label className="text-gray-400 text-xs block">Nombre de la música</label>
          <input
            type="text"
            value={musicName}
            onChange={e => setMusicName(e.target.value)}
            placeholder="ej. Ronda épica"
            className="bg-gray-700 text-white rounded px-2 py-1 text-sm"
          />
        </div>
        <div className="space-y-1">
          <label className="text-gray-400 text-xs block">Archivo (MP3/OGG)</label>
          <input type="file" accept="audio/*" onChange={e => setMusicFile(e.target.files[0])} className="text-gray-300 text-sm" />
        </div>
        <button onClick={handleMusicUpload} disabled={!musicFile || uploading} className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white px-3 py-1.5 rounded text-sm">
          {uploading ? 'Subiendo…' : 'Subir música'}
        </button>
      </div>

      {/* Questions list */}
      {questions.length > 0 && (
        <ul className="space-y-1">
          {questions.map((q, i) => (
            <li key={q.id} className="text-gray-300 text-sm">
              {i + 1}. {q.body}
            </li>
          ))}
        </ul>
      )}

      <QuestionForm roundId={round.id} onSaved={q => setQuestions(prev => [...prev, q])} />
    </div>
  )
}
