// src/components/host/ScoreBoard.jsx
export default function ScoreBoard({ score, roundNumber, totalRounds, questionNumber, totalQuestions }) {
  return (
    <div className="flex items-center gap-6 text-white">
      <div>
        <p className="text-gray-400 text-xs uppercase tracking-wider">Ronda</p>
        <p className="text-2xl font-bold">{roundNumber}/{totalRounds}</p>
      </div>
      <div>
        <p className="text-gray-400 text-xs uppercase tracking-wider">Pregunta</p>
        <p className="text-2xl font-bold">{questionNumber}/{totalQuestions}</p>
      </div>
      <div className="ml-4">
        <p className="text-gray-400 text-xs uppercase tracking-wider">Puntos del equipo</p>
        <p className="text-4xl font-extrabold text-indigo-400">{score}</p>
      </div>
    </div>
  )
}
