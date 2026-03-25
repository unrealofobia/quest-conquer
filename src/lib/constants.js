export const ROLES = {
  paladin: { label: 'Paladín', icon: '🛡️', ability: 'Pasar pregunta' },
  warrior: { label: 'Guerrero', icon: '⚔️', ability: 'Tomar control' },
  archer:  { label: 'Arquero', icon: '🏹', ability: 'Eliminar 2 opciones' },
  thief:   { label: 'Ladrón',  icon: '🗡️', ability: 'Duplicar puntos' },
  bard:    { label: 'Bardo',   icon: '🎵', ability: 'Restaurar habilidad' },
}

export const ROLE_KEYS = Object.keys(ROLES)

export const ITEMS = {
  clock:  { label: 'Reloj',   icon: '🕐', description: '+10 segundos al timer' },
  heart:  { label: 'Corazón', icon: '❤️', description: 'Evita perder puntos' },
  chest:  { label: 'Cofre',   icon: '📦', description: 'Restaura 1 habilidad' },
}

export const DIFFICULTY_LABELS = {
  easy:   'Fácil',
  medium: 'Medio',
  hard:   'Difícil',
}

export const ITEM_DROP_CHANCE = 0.08  // 8% al responder correctamente

export const CLOCK_BONUS_SECONDS = 10

export const GAME_CHANNEL = 'game'
export const LOBBY_CHANNEL = 'lobby'
