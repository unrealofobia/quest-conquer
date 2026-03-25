/**
 * @param {{ isCorrect: boolean, pointsCorrect: number, pointsWrong: number, isDoubled: boolean, heartActive: boolean }} opts
 * @returns {number} score delta (positive = gain, negative = loss)
 */
export function calcScoreDelta({ isCorrect, pointsCorrect, pointsWrong, isDoubled, heartActive }) {
  if (isCorrect) {
    return isDoubled ? pointsCorrect * 2 : pointsCorrect
  }
  return heartActive ? 0 : -pointsWrong
}
