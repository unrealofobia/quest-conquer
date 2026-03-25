# Quest & Conquer — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a collaborative trivia game for teambuilding sessions — 5 players with unique roles, shared score, real-time gameplay via Supabase.

**Architecture:** React + Vite SPA with 4 routes (`/admin`, `/host`, `/join`, `/play/:role`). Persistent data lives in Supabase PostgreSQL; ephemeral game state propagates via Supabase Realtime Broadcast on a `"game"` channel; lobby presence via Supabase Realtime Presence on a `"lobby"` channel. Pure game logic (score calculation, item drop, ability resolution) is unit-tested with Vitest.

**Tech Stack:** React 18, Vite, React Router v6, Zustand, Tailwind CSS, shadcn/ui, Supabase JS v2, qrcode.react, Vitest.

---

## File Map

```
src/
├── lib/
│   ├── supabase.js            Supabase client singleton
│   └── constants.js           Roles, items, ability metadata
├── store/
│   ├── gameStore.js           Zustand — persistent game state (DB mirror)
│   └── playerStore.js         Zustand — local player identity
├── hooks/
│   ├── useGameChannel.js      Subscribe/emit Broadcast events on "game"
│   ├── useLobbyPresence.js    Presence on "lobby" channel
│   └── useGameTimer.js        Countdown timer (admin-side tick emitter)
├── engine/
│   ├── scoreEngine.js         Score delta calculation
│   ├── itemDrop.js            Item drop probability logic
│   └── abilityResolver.js     Apply ability effects to game state
├── pages/
│   ├── AdminPage.jsx          /admin — creation + game controls
│   ├── HostPage.jsx           /host — projector view
│   ├── JoinPage.jsx           /join — nickname + role assignment
│   └── PlayPage.jsx           /play/:role — player device view
├── components/
│   ├── admin/
│   │   ├── GameCreator.jsx    Step 1: define rounds count
│   │   ├── RoundBuilder.jsx   Step 2: add questions + upload music per round
│   │   ├── QuestionForm.jsx   Form for one question (body, options, difficulty, points, timer)
│   │   ├── GameQR.jsx         QR code display for /join URL
│   │   └── GameControls.jsx   Pause / Resume / Restart buttons
│   ├── host/
│   │   ├── LobbyView.jsx      Waiting room with player list + Start button
│   │   ├── QuestionDisplay.jsx Question + 4 options (archer can grey 2 out)
│   │   ├── CountdownTimer.jsx  Circular or bar countdown
│   │   ├── ScoreBoard.jsx      Team score + round/question info
│   │   ├── MusicPlayer.jsx     Hidden audio element, auto-play on round:started
│   │   └── ItemInventory.jsx   Shared item chips (read-only on host)
│   └── play/
│       ├── AnswerOptions.jsx   4-button grid for assigned player
│       ├── AbilityPanel.jsx    Ability card + use button
│       ├── BardSelector.jsx    2x2 grid of teammates for Bard to pick
│       └── ItemPanel.jsx       Shared items the player can activate
├── App.jsx                    Router + protected /admin route
└── main.jsx                   Entry point

supabase/
└── migrations/
    └── 001_initial_schema.sql

.env.local                     VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY
```

---

## Task 1: Install dependencies and configure Vitest

**Files:**
- Modify: `package.json`
- Modify: `vite.config.js`
- Create: `src/test/setup.js`

- [ ] **Step 1: Install runtime dependencies**

```bash
cd react-project
npm install @supabase/supabase-js react-router-dom zustand qrcode.react
npm install tailwindcss @tailwindcss/vite
```

- [ ] **Step 2: Install shadcn/ui peer deps and dev tools**

```bash
npm install class-variance-authority clsx tailwind-merge lucide-react
npm install -D vitest @vitest/ui jsdom @testing-library/react @testing-library/jest-dom
```

- [ ] **Step 3: Configure Vite with Tailwind and Vitest**

Replace `vite.config.js` with:

```js
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/test/setup.js',
  },
})
```

- [ ] **Step 4: Create test setup file**

```js
// src/test/setup.js
import '@testing-library/jest-dom'
```

- [ ] **Step 5: Add test script to package.json**

Add to `"scripts"`:
```json
"test": "vitest",
"test:ui": "vitest --ui"
```

- [ ] **Step 6: Configure Tailwind CSS**

Replace `src/index.css` with:
```css
@import "tailwindcss";
```

- [ ] **Step 7: Verify Vitest runs**

```bash
npx vitest run
```
Expected: `No test files found` (not an error — means setup is correct).

- [ ] **Step 8: Commit**

```bash
git add package.json vite.config.js src/index.css src/test/setup.js
git commit -m "chore: install dependencies, configure Tailwind and Vitest"
```

---

## Task 2: Environment and Supabase client

**Files:**
- Create: `.env.local`
- Create: `src/lib/supabase.js`
- Create: `src/lib/constants.js`

- [ ] **Step 1: Create `.env.local`**

```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

Replace values with your actual Supabase project credentials from the Supabase dashboard → Settings → API.

- [ ] **Step 2: Create Supabase client**

```js
// src/lib/supabase.js
import { createClient } from '@supabase/supabase-js'

export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
)
```

- [ ] **Step 3: Create constants**

```js
// src/lib/constants.js
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
```

- [ ] **Step 4: Commit**

```bash
git add src/lib/supabase.js src/lib/constants.js
git commit -m "feat: add Supabase client and game constants"
```

Note: `.env.local` is in `.gitignore` — never commit it.

---

## Task 3: Database schema

**Files:**
- Create: `supabase/migrations/001_initial_schema.sql`

- [ ] **Step 1: Write migration**

```sql
-- supabase/migrations/001_initial_schema.sql

-- Enums
create type game_status as enum ('waiting', 'in_progress', 'paused', 'finished');
create type round_status as enum ('pending', 'active', 'completed');
create type difficulty_level as enum ('easy', 'medium', 'hard');
create type player_role as enum ('paladin', 'warrior', 'archer', 'thief', 'bard');
create type item_type as enum ('clock', 'heart', 'chest');

-- Games
create table games (
  id            uuid primary key default gen_random_uuid(),
  status        game_status not null default 'waiting',
  total_rounds  integer not null,
  team_score    integer not null default 0,
  created_at    timestamptz not null default now()
);

-- Rounds
create table rounds (
  id            uuid primary key default gen_random_uuid(),
  game_id       uuid not null references games(id) on delete cascade,
  round_number  integer not null,
  status        round_status not null default 'pending',
  music_url     text,
  music_name    varchar(100),
  unique(game_id, round_number)
);

-- Questions
create table questions (
  id             uuid primary key default gen_random_uuid(),
  round_id       uuid not null references rounds(id) on delete cascade,
  body           text not null,
  difficulty     difficulty_level not null,
  points_correct integer not null,
  points_wrong   integer not null,
  time_limit     integer not null default 30,
  "order"        integer not null default 0
);

-- Question options
create table question_options (
  id          uuid primary key default gen_random_uuid(),
  question_id uuid not null references questions(id) on delete cascade,
  body        text not null,
  is_correct  boolean not null default false
);

-- Players
create table players (
  id            uuid primary key default gen_random_uuid(),
  game_id       uuid not null references games(id) on delete cascade,
  nickname      varchar(32) not null,
  role          player_role not null,
  ability_uses  integer not null default 1,
  joined_at     timestamptz not null default now(),
  unique(game_id, role)
);

-- Game items (shared inventory)
create table game_items (
  id          uuid primary key default gen_random_uuid(),
  game_id     uuid not null references games(id) on delete cascade,
  type        item_type not null,
  is_used     boolean not null default false,
  obtained_at timestamptz not null default now()
);

-- RLS: disable for now (internal app, single session)
alter table games disable row level security;
alter table rounds disable row level security;
alter table questions disable row level security;
alter table question_options disable row level security;
alter table players disable row level security;
alter table game_items disable row level security;
```

- [ ] **Step 2: Apply migration in Supabase dashboard**

Go to Supabase Dashboard → SQL Editor → paste the contents of `001_initial_schema.sql` → Run.

Verify in Table Editor that all 6 tables appear: `games`, `rounds`, `questions`, `question_options`, `players`, `game_items`.

- [ ] **Step 3: Create Storage bucket**

In Supabase Dashboard → Storage → New bucket → Name: `round-music` → Public: ON → Save.

- [ ] **Step 4: Commit**

```bash
git add supabase/
git commit -m "feat: add database schema migration"
```

---

## Task 4: Game engine — score, item drop, ability resolver (TDD)

**Files:**
- Create: `src/engine/scoreEngine.js`
- Create: `src/engine/itemDrop.js`
- Create: `src/engine/abilityResolver.js`
- Create: `src/engine/__tests__/scoreEngine.test.js`
- Create: `src/engine/__tests__/itemDrop.test.js`
- Create: `src/engine/__tests__/abilityResolver.test.js`

- [ ] **Step 1: Write failing tests for scoreEngine**

```js
// src/engine/__tests__/scoreEngine.test.js
import { describe, it, expect } from 'vitest'
import { calcScoreDelta } from '../scoreEngine'

describe('calcScoreDelta', () => {
  it('returns points_correct on correct answer', () => {
    expect(calcScoreDelta({ isCorrect: true, pointsCorrect: 100, pointsWrong: 50, isDoubled: false, heartActive: false }))
      .toBe(100)
  })

  it('returns negative points_wrong on wrong answer', () => {
    expect(calcScoreDelta({ isCorrect: false, pointsCorrect: 100, pointsWrong: 50, isDoubled: false, heartActive: false }))
      .toBe(-50)
  })

  it('doubles points_correct when thief ability is active', () => {
    expect(calcScoreDelta({ isCorrect: true, pointsCorrect: 100, pointsWrong: 50, isDoubled: true, heartActive: false }))
      .toBe(200)
  })

  it('returns 0 on wrong answer when heart item is active', () => {
    expect(calcScoreDelta({ isCorrect: false, pointsCorrect: 100, pointsWrong: 50, isDoubled: false, heartActive: true }))
      .toBe(0)
  })

  it('does not double when wrong even with isDoubled', () => {
    expect(calcScoreDelta({ isCorrect: false, pointsCorrect: 100, pointsWrong: 50, isDoubled: true, heartActive: false }))
      .toBe(-50)
  })
})
```

- [ ] **Step 2: Run to confirm failure**

```bash
npx vitest run src/engine/__tests__/scoreEngine.test.js
```
Expected: FAIL — `calcScoreDelta` is not defined.

- [ ] **Step 3: Implement scoreEngine**

```js
// src/engine/scoreEngine.js

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
```

- [ ] **Step 4: Run scoreEngine tests**

```bash
npx vitest run src/engine/__tests__/scoreEngine.test.js
```
Expected: PASS — 5 tests.

- [ ] **Step 5: Write failing tests for itemDrop**

```js
// src/engine/__tests__/itemDrop.test.js
import { describe, it, expect, vi } from 'vitest'
import { rollItemDrop } from '../itemDrop'
import { ITEM_DROP_CHANCE } from '../../lib/constants'

describe('rollItemDrop', () => {
  it('returns an item type when random is below drop chance', () => {
    vi.spyOn(Math, 'random').mockReturnValue(ITEM_DROP_CHANCE - 0.01)
    const result = rollItemDrop()
    expect(['clock', 'heart', 'chest']).toContain(result)
    vi.restoreAllMocks()
  })

  it('returns null when random is above drop chance', () => {
    vi.spyOn(Math, 'random').mockReturnValue(ITEM_DROP_CHANCE + 0.01)
    const result = rollItemDrop()
    expect(result).toBeNull()
    vi.restoreAllMocks()
  })
})
```

- [ ] **Step 6: Run to confirm failure**

```bash
npx vitest run src/engine/__tests__/itemDrop.test.js
```
Expected: FAIL.

- [ ] **Step 7: Implement itemDrop**

```js
// src/engine/itemDrop.js
import { ITEM_DROP_CHANCE } from '../lib/constants'

const ITEM_TYPES = ['clock', 'heart', 'chest']

/**
 * @returns {'clock'|'heart'|'chest'|null}
 */
export function rollItemDrop() {
  if (Math.random() > ITEM_DROP_CHANCE) return null
  return ITEM_TYPES[Math.floor(Math.random() * ITEM_TYPES.length)]
}
```

- [ ] **Step 8: Run itemDrop tests**

```bash
npx vitest run src/engine/__tests__/itemDrop.test.js
```
Expected: PASS — 2 tests.

- [ ] **Step 9: Write failing tests for abilityResolver**

```js
// src/engine/__tests__/abilityResolver.test.js
import { describe, it, expect } from 'vitest'
import { applyAbility } from '../abilityResolver'

describe('applyAbility', () => {
  const baseState = {
    skipped: false,
    assignedPlayerId: 'p1',
    isDoubled: false,
    removedOptionIds: [],
    players: [
      { id: 'p1', role: 'paladin',  ability_uses: 1 },
      { id: 'p2', role: 'warrior',  ability_uses: 1 },
      { id: 'p3', role: 'archer',   ability_uses: 1 },
      { id: 'p4', role: 'thief',    ability_uses: 1 },
      { id: 'p5', role: 'bard',     ability_uses: 1 },
    ],
  }

  it('paladin sets skipped=true and decrements uses', () => {
    const result = applyAbility({ ...baseState, players: baseState.players.map(p => ({...p})) }, { playerId: 'p1', role: 'paladin' })
    expect(result.skipped).toBe(true)
    expect(result.players.find(p => p.id === 'p1').ability_uses).toBe(0)
  })

  it('warrior changes assignedPlayerId and decrements uses', () => {
    const result = applyAbility({ ...baseState, players: baseState.players.map(p => ({...p})) }, { playerId: 'p2', role: 'warrior' })
    expect(result.assignedPlayerId).toBe('p2')
    expect(result.players.find(p => p.id === 'p2').ability_uses).toBe(0)
  })

  it('archer removes 2 incorrect option ids and decrements uses', () => {
    const state = { ...baseState, players: baseState.players.map(p => ({...p})) }
    const incorrectOptionIds = ['opt-b', 'opt-c', 'opt-d']
    const result = applyAbility(state, { playerId: 'p3', role: 'archer', incorrectOptionIds })
    expect(result.removedOptionIds).toHaveLength(2)
    result.removedOptionIds.forEach(id => expect(incorrectOptionIds).toContain(id))
    expect(result.players.find(p => p.id === 'p3').ability_uses).toBe(0)
  })

  it('thief sets isDoubled=true and decrements uses', () => {
    const result = applyAbility({ ...baseState, players: baseState.players.map(p => ({...p})) }, { playerId: 'p4', role: 'thief' })
    expect(result.isDoubled).toBe(true)
    expect(result.players.find(p => p.id === 'p4').ability_uses).toBe(0)
  })

  it('bard restores target player uses and decrements bard uses', () => {
    const state = {
      ...baseState,
      players: baseState.players.map(p => p.id === 'p2' ? { ...p, ability_uses: 0 } : { ...p }),
    }
    const result = applyAbility(state, { playerId: 'p5', role: 'bard', targetPlayerId: 'p2' })
    expect(result.players.find(p => p.id === 'p2').ability_uses).toBe(1)
    expect(result.players.find(p => p.id === 'p5').ability_uses).toBe(0)
  })
})
```

- [ ] **Step 10: Run to confirm failure**

```bash
npx vitest run src/engine/__tests__/abilityResolver.test.js
```
Expected: FAIL.

- [ ] **Step 11: Implement abilityResolver**

```js
// src/engine/abilityResolver.js

/**
 * Applies an ability to the current question state.
 * Returns a new state object (immutable update).
 *
 * @param {object} state - Current question state
 * @param {object} action - { playerId, role, targetPlayerId?, incorrectOptionIds? }
 * @returns {object} Updated state
 */
export function applyAbility(state, { playerId, role, targetPlayerId, incorrectOptionIds = [] }) {
  const players = state.players.map(p =>
    p.id === playerId ? { ...p, ability_uses: p.ability_uses - 1 } : p
  )

  switch (role) {
    case 'paladin':
      return { ...state, players, skipped: true }

    case 'warrior':
      return { ...state, players, assignedPlayerId: playerId }

    case 'archer': {
      const toRemove = incorrectOptionIds.slice(0, 2)
      return { ...state, players, removedOptionIds: toRemove }
    }

    case 'thief':
      return { ...state, players, isDoubled: true }

    case 'bard': {
      const restoredPlayers = players.map(p =>
        p.id === targetPlayerId ? { ...p, ability_uses: 1 } : p
      )
      return { ...state, players: restoredPlayers }
    }

    default:
      return state
  }
}
```

- [ ] **Step 12: Run all engine tests**

```bash
npx vitest run src/engine/
```
Expected: PASS — 11 tests total.

- [ ] **Step 13: Commit**

```bash
git add src/engine/
git commit -m "feat: game engine — score, item drop, ability resolver with tests"
```

---

## Task 5: Zustand stores

**Files:**
- Create: `src/store/gameStore.js`
- Create: `src/store/playerStore.js`

- [ ] **Step 1: Create gameStore**

This store mirrors the live game state received from Broadcast events and DB queries.

```js
// src/store/gameStore.js
import { create } from 'zustand'

export const useGameStore = create((set) => ({
  // DB state
  game: null,           // games row
  rounds: [],           // rounds[] for the game
  questions: [],        // questions[] for the active round
  players: [],          // players[] for the game
  items: [],            // game_items[] — shared inventory

  // Live question state (from Broadcast)
  activeQuestion: null,         // full question object with options
  assignedPlayerId: null,
  secondsRemaining: null,
  isDoubled: false,
  heartActive: false,
  removedOptionIds: [],         // archer ability — ids hidden on host
  abilityUsedThisQuestion: false,
  itemUsedThisQuestion: false,
  answered: false,

  // Actions
  setGame: (game) => set({ game }),
  setRounds: (rounds) => set({ rounds }),
  setQuestions: (questions) => set({ questions }),
  setPlayers: (players) => set({ players }),
  setItems: (items) => set({ items }),

  setActiveQuestion: (q, assignedPlayerId, secondsRemaining) =>
    set({
      activeQuestion: q,
      assignedPlayerId,
      secondsRemaining,
      isDoubled: false,
      heartActive: false,
      removedOptionIds: [],
      abilityUsedThisQuestion: false,
      itemUsedThisQuestion: false,
      answered: false,
    }),

  setSecondsRemaining: (s) => set({ secondsRemaining: s }),
  setRemovedOptionIds: (ids) => set({ removedOptionIds: ids }),
  setIsDoubled: (v) => set({ isDoubled: v }),
  setHeartActive: (v) => set({ heartActive: v }),
  setAbilityUsed: () => set({ abilityUsedThisQuestion: true }),
  setItemUsed: () => set({ itemUsedThisQuestion: true }),
  setAnswered: () => set({ answered: true }),

  updatePlayerAbilityUses: (playerId, uses) =>
    set((state) => ({
      players: state.players.map(p =>
        p.id === playerId ? { ...p, ability_uses: uses } : p
      ),
    })),

  resetQuestionState: () =>
    set({
      activeQuestion: null,
      assignedPlayerId: null,
      secondsRemaining: null,
      isDoubled: false,
      heartActive: false,
      removedOptionIds: [],
      abilityUsedThisQuestion: false,
      itemUsedThisQuestion: false,
      answered: false,
    }),
}))
```

- [ ] **Step 2: Create playerStore**

Stores the current player's identity (set at /join and persisted in sessionStorage).

```js
// src/store/playerStore.js
import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

export const usePlayerStore = create(
  persist(
    (set) => ({
      playerId: null,
      nickname: null,
      role: null,
      gameId: null,

      setPlayer: ({ playerId, nickname, role, gameId }) =>
        set({ playerId, nickname, role, gameId }),

      clearPlayer: () =>
        set({ playerId: null, nickname: null, role: null, gameId: null }),
    }),
    {
      name: 'qc-player',
      storage: createJSONStorage(() => sessionStorage),
    }
  )
)
```

- [ ] **Step 3: Commit**

```bash
git add src/store/
git commit -m "feat: Zustand stores for game and player state"
```

---

## Task 6: Routing and page scaffolds

**Files:**
- Modify: `src/App.jsx`
- Create: `src/pages/AdminPage.jsx`
- Create: `src/pages/HostPage.jsx`
- Create: `src/pages/JoinPage.jsx`
- Create: `src/pages/PlayPage.jsx`

- [ ] **Step 1: Rewrite App.jsx with router**

```jsx
// src/App.jsx
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import AdminPage from './pages/AdminPage'
import HostPage from './pages/HostPage'
import JoinPage from './pages/JoinPage'
import PlayPage from './pages/PlayPage'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/admin" element={<AdminPage />} />
        <Route path="/host" element={<HostPage />} />
        <Route path="/join" element={<JoinPage />} />
        <Route path="/play/:role" element={<PlayPage />} />
        <Route path="*" element={<Navigate to="/join" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
```

- [ ] **Step 2: Create placeholder pages**

```jsx
// src/pages/AdminPage.jsx
export default function AdminPage() {
  return <div className="p-8 text-white bg-gray-900 min-h-screen">Admin Panel</div>
}
```

```jsx
// src/pages/HostPage.jsx
export default function HostPage() {
  return <div className="p-8 text-white bg-gray-900 min-h-screen">Host / Projector</div>
}
```

```jsx
// src/pages/JoinPage.jsx
export default function JoinPage() {
  return <div className="p-8 text-white bg-gray-900 min-h-screen">Join Game</div>
}
```

```jsx
// src/pages/PlayPage.jsx
export default function PlayPage() {
  return <div className="p-8 text-white bg-gray-900 min-h-screen">Play</div>
}
```

- [ ] **Step 3: Run dev server and verify routes**

```bash
npm run dev
```

Visit `http://localhost:5173/admin`, `/host`, `/join`, `/play/paladin` — each should show its placeholder text.

- [ ] **Step 4: Commit**

```bash
git add src/App.jsx src/pages/
git commit -m "feat: routing scaffold with 4 pages"
```

---

## Task 7: Realtime hooks — Broadcast and Presence

**Files:**
- Create: `src/hooks/useGameChannel.js`
- Create: `src/hooks/useLobbyPresence.js`

- [ ] **Step 1: Create useGameChannel**

```js
// src/hooks/useGameChannel.js
import { useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { GAME_CHANNEL } from '../lib/constants'

/**
 * Subscribe to Broadcast events on the "game" channel.
 * Returns an `emit` function to broadcast events.
 *
 * @param {(event: string, payload: object) => void} onEvent
 * @returns {{ emit: (event: string, payload: object) => void }}
 */
export function useGameChannel(onEvent) {
  const channelRef = useRef(null)

  useEffect(() => {
    const channel = supabase.channel(GAME_CHANNEL, {
      config: { broadcast: { self: true } },
    })

    channel.on('broadcast', { event: '*' }, ({ event, payload }) => {
      onEvent(event, payload)
    })

    channel.subscribe()
    channelRef.current = channel

    return () => {
      supabase.removeChannel(channel)
    }
  }, [onEvent])

  function emit(event, payload = {}) {
    channelRef.current?.send({
      type: 'broadcast',
      event,
      payload,
    })
  }

  return { emit }
}
```

- [ ] **Step 2: Create useLobbyPresence**

```js
// src/hooks/useLobbyPresence.js
import { useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'
import { LOBBY_CHANNEL } from '../lib/constants'

/**
 * Track presence in the lobby channel.
 * Each player calls track() with their info.
 *
 * @returns {{ presenceList: object[], track: (info: object) => void }}
 */
export function useLobbyPresence() {
  const channelRef = useRef(null)
  const [presenceList, setPresenceList] = useState([])

  useEffect(() => {
    const channel = supabase.channel(LOBBY_CHANNEL)

    const syncPresence = () => {
      const state = channel.presenceState()
      const list = Object.values(state).flat()
      setPresenceList(list)
    }

    channel
      .on('presence', { event: 'sync' }, syncPresence)
      .on('presence', { event: 'join' }, syncPresence)
      .on('presence', { event: 'leave' }, syncPresence)
      .subscribe()

    channelRef.current = channel

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  function track(info) {
    channelRef.current?.track(info)
  }

  return { presenceList, track }
}
```

- [ ] **Step 3: Commit**

```bash
git add src/hooks/
git commit -m "feat: Realtime hooks — Broadcast and Presence"
```

---

## Task 8: Admin — Game creator and round builder

**Files:**
- Create: `src/components/admin/GameCreator.jsx`
- Create: `src/components/admin/RoundBuilder.jsx`
- Create: `src/components/admin/QuestionForm.jsx`
- Modify: `src/pages/AdminPage.jsx`

- [ ] **Step 1: Create GameCreator**

```jsx
// src/components/admin/GameCreator.jsx
import { useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useGameStore } from '../../store/gameStore'

export default function GameCreator({ onCreated }) {
  const [totalRounds, setTotalRounds] = useState(3)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const setGame = useGameStore(s => s.setGame)
  const setRounds = useGameStore(s => s.setRounds)

  async function handleCreate() {
    setLoading(true)
    setError(null)

    // Ensure no active game exists
    const { data: existing } = await supabase
      .from('games')
      .select('id')
      .neq('status', 'finished')
      .maybeSingle()

    if (existing) {
      setError('Ya existe una partida activa. Finalizala antes de crear una nueva.')
      setLoading(false)
      return
    }

    const { data: game, error: gameErr } = await supabase
      .from('games')
      .insert({ total_rounds: totalRounds, status: 'waiting' })
      .select()
      .single()

    if (gameErr) { setError(gameErr.message); setLoading(false); return }

    // Create round rows
    const roundRows = Array.from({ length: totalRounds }, (_, i) => ({
      game_id: game.id,
      round_number: i + 1,
      status: 'pending',
    }))

    const { data: rounds, error: roundErr } = await supabase
      .from('rounds')
      .insert(roundRows)
      .select()

    if (roundErr) { setError(roundErr.message); setLoading(false); return }

    setGame(game)
    setRounds(rounds)
    setLoading(false)
    onCreated(game, rounds)
  }

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold text-white">Nueva partida</h2>
      <label className="block text-gray-300">
        Número de rondas
        <input
          type="number"
          min={1}
          max={10}
          value={totalRounds}
          onChange={e => setTotalRounds(Number(e.target.value))}
          className="ml-3 w-16 rounded bg-gray-700 text-white px-2 py-1"
        />
      </label>
      {error && <p className="text-red-400">{error}</p>}
      <button
        onClick={handleCreate}
        disabled={loading}
        className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white px-6 py-2 rounded"
      >
        {loading ? 'Creando…' : 'Crear partida'}
      </button>
    </div>
  )
}
```

- [ ] **Step 2: Create QuestionForm**

```jsx
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
```

- [ ] **Step 3: Create RoundBuilder**

```jsx
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
```

- [ ] **Step 4: Update AdminPage to use GameCreator and RoundBuilder**

```jsx
// src/pages/AdminPage.jsx
import { useState } from 'react'
import { useGameStore } from '../store/gameStore'
import GameCreator from '../components/admin/GameCreator'
import RoundBuilder from '../components/admin/RoundBuilder'
import GameQR from '../components/admin/GameQR'

export default function AdminPage() {
  const rounds = useGameStore(s => s.rounds)
  const game = useGameStore(s => s.game)
  const [step, setStep] = useState('create') // 'create' | 'build' | 'lobby' | 'play'

  if (step === 'create') {
    return (
      <div className="p-8 bg-gray-900 min-h-screen">
        <h1 className="text-2xl font-bold text-white mb-6">Quest & Conquer — Admin</h1>
        <GameCreator onCreated={() => setStep('build')} />
      </div>
    )
  }

  if (step === 'build') {
    return (
      <div className="p-8 bg-gray-900 min-h-screen space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold text-white">Configurar rondas</h1>
          <button onClick={() => setStep('lobby')} className="bg-indigo-600 hover:bg-indigo-500 text-white px-5 py-2 rounded">
            Listo → Ver sala de espera
          </button>
        </div>
        {rounds.map(round => <RoundBuilder key={round.id} round={round} />)}
      </div>
    )
  }

  if (step === 'lobby') {
    return (
      <div className="p-8 bg-gray-900 min-h-screen space-y-6">
        <h1 className="text-2xl font-bold text-white">Sala de espera</h1>
        <GameQR gameId={game?.id} />
        {/* GameControls will be added in Task 10 */}
      </div>
    )
  }

  return null
}
```

- [ ] **Step 5: Verify in browser**

Start dev server (`npm run dev`), go to `/admin`, create a game, fill in rounds and questions. Check Supabase dashboard that rows are inserted correctly.

- [ ] **Step 6: Commit**

```bash
git add src/components/admin/ src/pages/AdminPage.jsx
git commit -m "feat: admin panel — game creator, round builder, question form"
```

---

## Task 9: Admin — QR code display

**Files:**
- Create: `src/components/admin/GameQR.jsx`

- [ ] **Step 1: Create GameQR**

```jsx
// src/components/admin/GameQR.jsx
import { QRCodeSVG } from 'qrcode.react'

const JOIN_BASE_URL = import.meta.env.VITE_JOIN_URL || `${window.location.origin}/join`

export default function GameQR({ gameId }) {
  if (!gameId) return null
  const url = JOIN_BASE_URL

  return (
    <div className="flex flex-col items-center gap-4 bg-white rounded-xl p-6 w-fit">
      <QRCodeSVG value={url} size={200} />
      <p className="text-gray-800 text-sm font-mono">{url}</p>
      <p className="text-gray-500 text-xs">Escanea para unirse a la partida</p>
    </div>
  )
}
```

- [ ] **Step 2: Add `VITE_JOIN_URL` to `.env.local`**

```
VITE_JOIN_URL=http://192.168.x.x:5173/join
```

Replace with your local IP so players on the same WiFi can scan and reach the app.

- [ ] **Step 3: Verify QR renders in `/admin` lobby step**

Navigate to `/admin`, complete the game creation flow until the lobby step. The QR code should appear.

- [ ] **Step 4: Commit**

```bash
git add src/components/admin/GameQR.jsx
git commit -m "feat: QR code display for /join URL"
```

---

## Task 10: Join page — nickname + role assignment

**Files:**
- Modify: `src/pages/JoinPage.jsx`

- [ ] **Step 1: Implement JoinPage**

```jsx
// src/pages/JoinPage.jsx
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { usePlayerStore } from '../store/playerStore'
import { ROLES, ROLE_KEYS } from '../lib/constants'

export default function JoinPage() {
  const [nickname, setNickname] = useState('')
  const [joining, setJoining] = useState(false)
  const [error, setError] = useState(null)
  const [roomFull, setRoomFull] = useState(false)
  const setPlayer = usePlayerStore(s => s.setPlayer)
  const existingRole = usePlayerStore(s => s.role)
  const existingGameId = usePlayerStore(s => s.gameId)
  const navigate = useNavigate()

  // If player already joined, redirect to play
  useEffect(() => {
    if (existingRole && existingGameId) {
      navigate(`/play/${existingRole}`, { replace: true })
    }
  }, [existingRole, existingGameId, navigate])

  async function handleJoin() {
    if (!nickname.trim()) { setError('Ingresa un nickname.'); return }
    setJoining(true)
    setError(null)

    // Get active game
    const { data: game } = await supabase
      .from('games')
      .select('id')
      .eq('status', 'waiting')
      .maybeSingle()

    if (!game) { setError('No hay partida activa en este momento.'); setJoining(false); return }

    // Check player count
    const { count } = await supabase
      .from('players')
      .select('*', { count: 'exact', head: true })
      .eq('game_id', game.id)

    if (count >= 5) { setRoomFull(true); setJoining(false); return }

    // Get taken roles
    const { data: existingPlayers } = await supabase
      .from('players')
      .select('role')
      .eq('game_id', game.id)

    const takenRoles = existingPlayers.map(p => p.role)
    const availableRoles = ROLE_KEYS.filter(r => !takenRoles.includes(r))

    if (availableRoles.length === 0) { setRoomFull(true); setJoining(false); return }

    // Assign random available role
    const role = availableRoles[Math.floor(Math.random() * availableRoles.length)]

    const { data: player, error: pErr } = await supabase
      .from('players')
      .insert({ game_id: game.id, nickname: nickname.trim(), role, ability_uses: 1 })
      .select()
      .single()

    if (pErr) {
      // Unique constraint violation means role was taken (race condition) — retry
      if (pErr.code === '23505') { setError('Rol tomado por otro jugador, intenta de nuevo.'); setJoining(false); return }
      setError(pErr.message); setJoining(false); return
    }

    setPlayer({ playerId: player.id, nickname: player.nickname, role: player.role, gameId: game.id })
    navigate(`/play/${player.role}`, { replace: true })
  }

  if (roomFull) {
    return (
      <div className="min-h-screen bg-gray-900 flex flex-col items-center justify-center text-white gap-4">
        <div className="text-6xl">🚫</div>
        <h1 className="text-3xl font-bold">Cuarto lleno</h1>
        <p className="text-gray-400">Ya hay 5 jugadores en la partida. ¡Gracias por intentarlo!</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-900 flex flex-col items-center justify-center gap-6 px-4">
      <h1 className="text-3xl font-bold text-white">Quest & Conquer</h1>
      <div className="bg-gray-800 rounded-xl p-6 w-full max-w-sm space-y-4">
        <label className="block text-gray-300">
          Tu nickname
          <input
            type="text"
            maxLength={32}
            value={nickname}
            onChange={e => setNickname(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleJoin()}
            placeholder="Ej. DarkWizard"
            className="mt-1 w-full bg-gray-700 text-white rounded px-3 py-2"
            autoFocus
          />
        </label>
        {error && <p className="text-red-400 text-sm">{error}</p>}
        <button
          onClick={handleJoin}
          disabled={joining}
          className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white py-2.5 rounded font-semibold"
        >
          {joining ? 'Uniéndose…' : 'Unirse al juego'}
        </button>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Test manually**

Open `/join` in 5 different browser tabs. Each one should get a different role. The 6th tab should show "Cuarto lleno".

- [ ] **Step 3: Commit**

```bash
git add src/pages/JoinPage.jsx
git commit -m "feat: join page with nickname entry, role assignment, room full guard"
```

---

## Task 11: Host page — lobby view with Presence

**Files:**
- Create: `src/components/host/LobbyView.jsx`
- Modify: `src/pages/HostPage.jsx`

- [ ] **Step 1: Create LobbyView**

```jsx
// src/components/host/LobbyView.jsx
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
```

- [ ] **Step 2: Update HostPage with lobby + Presence**

```jsx
// src/pages/HostPage.jsx
import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import LobbyView from '../components/host/LobbyView'
import { useGameStore } from '../store/gameStore'

export default function HostPage() {
  const [players, setPlayers] = useState([])
  const [gameId, setGameId] = useState(null)
  const setGame = useGameStore(s => s.setGame)

  useEffect(() => {
    // Load active game + players
    async function loadGame() {
      const { data: game } = await supabase
        .from('games')
        .select('*')
        .eq('status', 'waiting')
        .maybeSingle()

      if (!game) return
      setGame(game)
      setGameId(game.id)

      const { data: dbPlayers } = await supabase
        .from('players')
        .select('*')
        .eq('game_id', game.id)

      setPlayers(dbPlayers ?? [])
    }

    loadGame()

    // Subscribe to players table for real-time joins
    const channel = supabase
      .channel('players-realtime')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'players' }, payload => {
        setPlayers(prev => [...prev, payload.new])
      })
      .subscribe()

    return () => supabase.removeChannel(channel)
  }, [setGame])

  function handleStart() {
    // Game start will be implemented in Task 13 (game controls)
    console.log('start game', gameId)
  }

  return <LobbyView players={players} onStart={handleStart} />
}
```

- [ ] **Step 3: Verify lobby**

Open `/host` on one browser, then open `/join` in multiple tabs. Players should appear in the lobby in real time.

- [ ] **Step 4: Commit**

```bash
git add src/components/host/LobbyView.jsx src/pages/HostPage.jsx
git commit -m "feat: host lobby with real-time player list and start button"
```

---

## Task 12: Game timer hook

**Files:**
- Create: `src/hooks/useGameTimer.js`

The admin (and only the admin) runs the timer and emits `timer:tick` broadcasts. All other clients receive ticks and update their local countdown display.

- [ ] **Step 1: Create useGameTimer**

```js
// src/hooks/useGameTimer.js
import { useRef, useCallback } from 'react'

/**
 * Admin-side timer that counts down from `seconds` and calls
 * onTick(secondsRemaining) each second and onExpire() at 0.
 *
 * @returns {{ startTimer: (seconds: number) => void, stopTimer: () => void }}
 */
export function useGameTimer(onTick, onExpire) {
  const intervalRef = useRef(null)
  const remainingRef = useRef(0)

  const stopTimer = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
  }, [])

  const startTimer = useCallback((seconds) => {
    stopTimer()
    remainingRef.current = seconds
    onTick(seconds)

    intervalRef.current = setInterval(() => {
      remainingRef.current -= 1
      onTick(remainingRef.current)
      if (remainingRef.current <= 0) {
        stopTimer()
        onExpire()
      }
    }, 1000)
  }, [onTick, onExpire, stopTimer])

  return { startTimer, stopTimer }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/hooks/useGameTimer.js
git commit -m "feat: admin-side game timer hook"
```

---

## Task 13: Admin — Game controls and game orchestration

**Files:**
- Create: `src/components/admin/GameControls.jsx`
- Modify: `src/pages/AdminPage.jsx`

- [ ] **Step 1: Create GameControls**

```jsx
// src/components/admin/GameControls.jsx
import { useState, useCallback } from 'react'
import { supabase } from '../../lib/supabase'
import { useGameStore } from '../../store/gameStore'
import { useGameChannel } from '../../hooks/useGameChannel'
import { useGameTimer } from '../../hooks/useGameTimer'
import { rollItemDrop } from '../../engine/itemDrop'
import { calcScoreDelta } from '../../engine/scoreEngine'
import { ROLES } from '../../lib/constants'

export default function GameControls({ game, rounds }) {
  const players = useGameStore(s => s.players)
  const setPlayers = useGameStore(s => s.setPlayers)
  const activeQuestion = useGameStore(s => s.activeQuestion)
  const isDoubled = useGameStore(s => s.isDoubled)
  const heartActive = useGameStore(s => s.heartActive)
  const setActiveQuestion = useGameStore(s => s.setActiveQuestion)
  const setAnswered = useGameStore(s => s.setAnswered)
  const resetQuestionState = useGameStore(s => s.resetQuestionState)

  const [currentRoundIdx, setCurrentRoundIdx] = useState(0)
  const [questionQueue, setQuestionQueue] = useState([])
  const [currentQIdx, setCurrentQIdx] = useState(0)
  const [gamePhase, setGamePhase] = useState('lobby') // lobby | round | question | finished
  const [paused, setPaused] = useState(false)

  const handleEvent = useCallback((event, payload) => {
    // Admin also receives events but ignores them (no-op)
  }, [])

  const { emit } = useGameChannel(handleEvent)

  const handleTick = useCallback((s) => {
    emit('timer:tick', { seconds_remaining: s })
    useGameStore.getState().setSecondsRemaining(s)
  }, [emit])

  const handleExpire = useCallback(async () => {
    const q = useGameStore.getState().activeQuestion
    if (!q) return
    // Timeout counts as wrong — apply heart protection if active
    const heartOn = useGameStore.getState().heartActive
    const delta = heartOn ? 0 : -q.points_wrong
    const newScore = game.team_score + delta

    await supabase.from('games').update({ team_score: newScore }).eq('id', game.id)
    emit('question:timeout', { question_id: q.id, new_team_score: newScore })
    setAnswered()
  }, [emit, game, setAnswered])

  const { startTimer, stopTimer } = useGameTimer(handleTick, handleExpire)

  async function startGame() {
    // Load players
    const { data: dbPlayers } = await supabase.from('players').select('*').eq('game_id', game.id)
    setPlayers(dbPlayers)

    await supabase.from('games').update({ status: 'in_progress' }).eq('id', game.id)
    emit('game:started', { game_id: game.id })
    setGamePhase('round')
    await startRound(0, dbPlayers)
  }

  async function startRound(roundIdx, currentPlayers) {
    const round = rounds[roundIdx]
    await supabase.from('rounds').update({ status: 'active' }).eq('id', round.id)
    emit('round:started', { round_number: round.round_number, music_url: round.music_url })

    // Reset ability_uses for all players
    await supabase.from('players').update({ ability_uses: 1 }).eq('game_id', game.id)
    const { data: refreshedPlayers } = await supabase.from('players').select('*').eq('game_id', game.id)
    setPlayers(refreshedPlayers)

    // Load questions for this round
    const { data: qs } = await supabase
      .from('questions')
      .select('*, question_options(*)')
      .eq('round_id', round.id)
      .order('"order"')

    setQuestionQueue(qs)
    setCurrentQIdx(0)
    setCurrentRoundIdx(roundIdx)
    setGamePhase('question')
    await activateQuestion(qs, 0, refreshedPlayers)
  }

  async function activateQuestion(qs, qIdx, currentPlayers) {
    const q = qs[qIdx]
    const playerList = currentPlayers || useGameStore.getState().players

    // Assign random player
    const assignedPlayer = playerList[Math.floor(Math.random() * playerList.length)]

    setActiveQuestion(q, assignedPlayer.id, q.time_limit)
    emit('question:active', {
      question_id: q.id,
      assigned_player_id: assignedPlayer.id,
      time_limit: q.time_limit,
      points_correct: q.points_correct,
      points_wrong: q.points_wrong,
      difficulty: q.difficulty,
    })

    startTimer(q.time_limit)
  }

  async function handleAnswered(playerId, optionId, isCorrect) {
    stopTimer()
    const q = useGameStore.getState().activeQuestion
    const doubled = useGameStore.getState().isDoubled
    const heart = useGameStore.getState().heartActive

    const delta = calcScoreDelta({ isCorrect, pointsCorrect: q.points_correct, pointsWrong: q.points_wrong, isDoubled: doubled, heartActive: heart })
    const newScore = (await supabase.from('games').select('team_score').eq('id', game.id).single()).data.team_score + delta
    await supabase.from('games').update({ team_score: newScore }).eq('id', game.id)

    emit('question:answered', { player_id: playerId, option_id: optionId, is_correct: isCorrect, score_delta: delta, new_team_score: newScore })
    setAnswered()

    // Item drop on correct answer
    if (isCorrect) {
      const itemType = rollItemDrop()
      if (itemType) {
        const { data: item } = await supabase.from('game_items').insert({ game_id: game.id, type: itemType }).select().single()
        emit('item:dropped', { item_type: itemType, game_item_id: item.id })
      }
    }
  }

  async function nextQuestion() {
    resetQuestionState()
    const nextQIdx = currentQIdx + 1

    if (nextQIdx < questionQueue.length) {
      setCurrentQIdx(nextQIdx)
      await activateQuestion(questionQueue, nextQIdx, null)
    } else {
      // Round complete
      const round = rounds[currentRoundIdx]
      await supabase.from('rounds').update({ status: 'completed' }).eq('id', round.id)
      const { data: g } = await supabase.from('games').select('team_score').eq('id', game.id).single()
      emit('round:completed', { round_number: round.round_number, team_score: g.team_score })

      const nextRoundIdx = currentRoundIdx + 1
      if (nextRoundIdx < rounds.length) {
        await startRound(nextRoundIdx, null)
      } else {
        await supabase.from('games').update({ status: 'finished' }).eq('id', game.id)
        emit('game:finished', { final_score: g.team_score })
        setGamePhase('finished')
      }
    }
  }

  async function togglePause() {
    if (paused) {
      emit('game:resumed', {})
      setPaused(false)
    } else {
      stopTimer()
      emit('game:paused', {})
      setPaused(true)
    }
  }

  async function restartGame() {
    stopTimer()
    resetQuestionState()
    await supabase.from('games').update({ status: 'waiting', team_score: 0 }).eq('id', game.id)
    await supabase.from('rounds').update({ status: 'pending' }).eq('game_id', game.id)
    emit('game:restarted', {})
    setGamePhase('lobby')
  }

  if (gamePhase === 'lobby') {
    return (
      <button onClick={startGame} className="bg-green-600 hover:bg-green-500 text-white px-8 py-3 rounded-xl font-bold text-lg">
        Iniciar partida
      </button>
    )
  }

  return (
    <div className="space-y-4">
      <div className="text-gray-300 text-sm">
        Ronda {currentRoundIdx + 1}/{rounds.length} · Pregunta {currentQIdx + 1}/{questionQueue.length}
      </div>
      <div className="flex gap-3 flex-wrap">
        <button onClick={togglePause} className={`px-4 py-2 rounded font-semibold text-white ${paused ? 'bg-green-600 hover:bg-green-500' : 'bg-yellow-600 hover:bg-yellow-500'}`}>
          {paused ? '▶ Continuar' : '⏸ Pausar'}
        </button>
        {!paused && useGameStore.getState().answered && (
          <button onClick={nextQuestion} className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded font-semibold">
            Siguiente pregunta →
          </button>
        )}
        <button onClick={restartGame} className="bg-red-700 hover:bg-red-600 text-white px-4 py-2 rounded font-semibold">
          ↺ Reiniciar
        </button>
      </div>
      {gamePhase === 'finished' && (
        <p className="text-green-400 font-bold text-lg">¡Juego terminado!</p>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Update AdminPage to show GameControls in lobby step**

```jsx
// src/pages/AdminPage.jsx
import { useState } from 'react'
import { useGameStore } from '../store/gameStore'
import GameCreator from '../components/admin/GameCreator'
import RoundBuilder from '../components/admin/RoundBuilder'
import GameQR from '../components/admin/GameQR'
import GameControls from '../components/admin/GameControls'

export default function AdminPage() {
  const rounds = useGameStore(s => s.rounds)
  const game = useGameStore(s => s.game)
  const players = useGameStore(s => s.players)
  const [step, setStep] = useState('create')

  if (step === 'create') {
    return (
      <div className="p-8 bg-gray-900 min-h-screen">
        <h1 className="text-2xl font-bold text-white mb-6">Quest & Conquer — Admin</h1>
        <GameCreator onCreated={() => setStep('build')} />
      </div>
    )
  }

  if (step === 'build') {
    return (
      <div className="p-8 bg-gray-900 min-h-screen space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold text-white">Configurar rondas</h1>
          <button onClick={() => setStep('lobby')} className="bg-indigo-600 hover:bg-indigo-500 text-white px-5 py-2 rounded">
            Listo → Sala de espera
          </button>
        </div>
        {rounds.map(round => <RoundBuilder key={round.id} round={round} />)}
      </div>
    )
  }

  return (
    <div className="p-8 bg-gray-900 min-h-screen space-y-6">
      <h1 className="text-2xl font-bold text-white">Quest & Conquer — Admin</h1>
      <div className="flex gap-8 flex-wrap">
        <GameQR gameId={game?.id} />
        <div className="space-y-4">
          <div>
            <p className="text-gray-400 text-sm">Jugadores ({players.length}/5)</p>
            <ul className="mt-2 space-y-1">
              {players.map(p => (
                <li key={p.id} className="text-white text-sm">{ROLES[p.role]?.icon} {p.nickname} — {ROLES[p.role]?.label}</li>
              ))}
            </ul>
          </div>
          <GameControls game={game} rounds={rounds} />
        </div>
      </div>
    </div>
  )
}
```

Add the missing import at the top of AdminPage: `import { ROLES } from '../lib/constants'`

- [ ] **Step 3: Commit**

```bash
git add src/components/admin/GameControls.jsx src/pages/AdminPage.jsx
git commit -m "feat: admin game controls — start, pause, resume, restart, question sequencing"
```

---

## Task 14: Host projector — question display, timer, score, music

**Files:**
- Create: `src/components/host/QuestionDisplay.jsx`
- Create: `src/components/host/CountdownTimer.jsx`
- Create: `src/components/host/ScoreBoard.jsx`
- Create: `src/components/host/MusicPlayer.jsx`
- Create: `src/components/host/ItemInventory.jsx`
- Modify: `src/pages/HostPage.jsx`

- [ ] **Step 1: Create CountdownTimer**

```jsx
// src/components/host/CountdownTimer.jsx
export default function CountdownTimer({ seconds, total }) {
  const pct = total > 0 ? seconds / total : 0
  const color = pct > 0.5 ? 'text-green-400' : pct > 0.25 ? 'text-yellow-400' : 'text-red-400'

  return (
    <div className={`text-6xl font-bold tabular-nums ${color}`}>
      {seconds ?? '--'}
    </div>
  )
}
```

- [ ] **Step 2: Create ScoreBoard**

```jsx
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
```

- [ ] **Step 3: Create QuestionDisplay**

```jsx
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
```

- [ ] **Step 4: Create MusicPlayer**

```jsx
// src/components/host/MusicPlayer.jsx
import { useEffect, useRef } from 'react'

export default function MusicPlayer({ musicUrl, playing }) {
  const audioRef = useRef(null)

  useEffect(() => {
    if (!audioRef.current) return
    if (playing && musicUrl) {
      audioRef.current.src = musicUrl
      audioRef.current.play().catch(() => {})
    } else {
      audioRef.current.pause()
      audioRef.current.currentTime = 0
    }
  }, [playing, musicUrl])

  return <audio ref={audioRef} loop className="hidden" />
}
```

- [ ] **Step 5: Create ItemInventory**

```jsx
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
```

- [ ] **Step 6: Rewrite HostPage with game view**

```jsx
// src/pages/HostPage.jsx
import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useGameStore } from '../store/gameStore'
import { useGameChannel } from '../hooks/useGameChannel'
import { ROLES } from '../lib/constants'
import LobbyView from '../components/host/LobbyView'
import QuestionDisplay from '../components/host/QuestionDisplay'
import CountdownTimer from '../components/host/CountdownTimer'
import ScoreBoard from '../components/host/ScoreBoard'
import MusicPlayer from '../components/host/MusicPlayer'
import ItemInventory from '../components/host/ItemInventory'

export default function HostPage() {
  const game = useGameStore(s => s.game)
  const setGame = useGameStore(s => s.setGame)
  const players = useGameStore(s => s.players)
  const setPlayers = useGameStore(s => s.setPlayers)
  const items = useGameStore(s => s.items)
  const setItems = useGameStore(s => s.setItems)
  const activeQuestion = useGameStore(s => s.activeQuestion)
  const setActiveQuestion = useGameStore(s => s.setActiveQuestion)
  const secondsRemaining = useGameStore(s => s.secondsRemaining)
  const setSecondsRemaining = useGameStore(s => s.setSecondsRemaining)
  const removedOptionIds = useGameStore(s => s.removedOptionIds)
  const setRemovedOptionIds = useGameStore(s => s.setRemovedOptionIds)
  const updatePlayerAbilityUses = useGameStore(s => s.updatePlayerAbilityUses)
  const setAnswered = useGameStore(s => s.setAnswered)
  const resetQuestionState = useGameStore(s => s.resetQuestionState)

  const [phase, setPhase] = useState('lobby') // lobby | playing | paused | finished
  const [teamScore, setTeamScore] = useState(0)
  const [roundInfo, setRoundInfo] = useState({ current: 1, total: 1, questionCurrent: 1, questionTotal: 1 })
  const [musicUrl, setMusicUrl] = useState(null)
  const [musicPlaying, setMusicPlaying] = useState(false)
  const [finalScore, setFinalScore] = useState(null)

  useEffect(() => {
    async function loadGame() {
      const { data: g } = await supabase.from('games').select('*').neq('status', 'finished').maybeSingle()
      if (!g) return
      setGame(g)
      setTeamScore(g.team_score)

      const { data: dbPlayers } = await supabase.from('players').select('*').eq('game_id', g.id)
      setPlayers(dbPlayers ?? [])

      const { data: dbItems } = await supabase.from('game_items').select('*').eq('game_id', g.id)
      setItems(dbItems ?? [])
    }
    loadGame()

    // Real-time player joins
    const ch = supabase.channel('host-players')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'players' }, p => {
        setPlayers(prev => [...prev, p.new])
      })
      .subscribe()

    return () => supabase.removeChannel(ch)
  }, [setGame, setPlayers, setItems])

  const handleEvent = useCallback((event, payload) => {
    switch (event) {
      case 'game:started':
        setPhase('playing')
        break

      case 'round:started':
        setMusicUrl(payload.music_url)
        setMusicPlaying(true)
        setRoundInfo(prev => ({ ...prev, current: payload.round_number, questionCurrent: 1 }))
        break

      case 'question:active': {
        // Load full question from DB
        supabase.from('questions').select('*, question_options(*)').eq('id', payload.question_id).single()
          .then(({ data: q }) => {
            setActiveQuestion(q, payload.assigned_player_id, payload.time_limit)
            setRoundInfo(prev => ({ ...prev, questionTotal: prev.questionTotal }))
          })
        break
      }

      case 'timer:tick':
        setSecondsRemaining(payload.seconds_remaining)
        break

      case 'ability:used':
        if (payload.role === 'archer') {
          setRemovedOptionIds(payload.removed_option_ids ?? [])
        }
        updatePlayerAbilityUses(payload.player_id, 0)
        if (payload.role === 'bard' && payload.target_player_id) {
          updatePlayerAbilityUses(payload.target_player_id, 1)
        }
        break

      case 'question:answered':
        setTeamScore(payload.new_team_score)
        setAnswered()
        break

      case 'question:timeout':
        setTeamScore(payload.new_team_score)
        setAnswered()
        break

      case 'item:dropped':
        setItems(prev => [...prev, { id: payload.game_item_id, type: payload.item_type, is_used: false }])
        break

      case 'item:used':
        setItems(prev => prev.map(it => it.id === payload.item_id ? { ...it, is_used: true } : it))
        break

      case 'round:completed':
        setMusicPlaying(false)
        resetQuestionState()
        break

      case 'game:paused':
        setPhase('paused')
        setMusicPlaying(false)
        break

      case 'game:resumed':
        setPhase('playing')
        setMusicPlaying(true)
        break

      case 'game:finished':
        setFinalScore(payload.final_score)
        setPhase('finished')
        setMusicPlaying(false)
        break

      case 'game:restarted':
        setPhase('lobby')
        resetQuestionState()
        setTeamScore(0)
        setMusicPlaying(false)
        break
    }
  }, [setActiveQuestion, setSecondsRemaining, setRemovedOptionIds, updatePlayerAbilityUses, setAnswered, resetQuestionState, setItems])

  useGameChannel(handleEvent)

  const assignedPlayer = players.find(p => p.id === useGameStore.getState().assignedPlayerId)

  if (phase === 'lobby') {
    return <LobbyView players={players} onStart={() => {}} />
  }

  if (phase === 'finished') {
    return (
      <div className="min-h-screen bg-gray-900 flex flex-col items-center justify-center gap-6 text-white">
        <h1 className="text-5xl font-extrabold">¡Juego terminado!</h1>
        <p className="text-3xl text-indigo-400 font-bold">Puntuación final: {finalScore}</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-900 p-8 space-y-6">
      <MusicPlayer musicUrl={musicUrl} playing={musicPlaying} />

      <div className="flex justify-between items-start">
        <ScoreBoard
          score={teamScore}
          roundNumber={roundInfo.current}
          totalRounds={roundInfo.total}
          questionNumber={roundInfo.questionCurrent}
          totalQuestions={roundInfo.questionTotal}
        />
        <CountdownTimer seconds={secondsRemaining} total={activeQuestion?.time_limit} />
      </div>

      {phase === 'paused' && (
        <div className="text-center text-yellow-400 text-2xl font-bold">⏸ Juego pausado</div>
      )}

      <QuestionDisplay
        question={activeQuestion}
        removedOptionIds={removedOptionIds}
        assignedPlayer={assignedPlayer}
        roles={ROLES}
      />

      <ItemInventory items={items} />
    </div>
  )
}
```

- [ ] **Step 7: Commit**

```bash
git add src/components/host/ src/pages/HostPage.jsx
git commit -m "feat: host projector view — question, timer, score, music, items"
```

---

## Task 15: Player view — assigned player (answer options)

**Files:**
- Create: `src/components/play/AnswerOptions.jsx`

- [ ] **Step 1: Create AnswerOptions**

```jsx
// src/components/play/AnswerOptions.jsx
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
```

- [ ] **Step 2: Commit**

```bash
git add src/components/play/AnswerOptions.jsx
git commit -m "feat: answer options component for assigned player"
```

---

## Task 16: Player view — ability panel, item panel, Bard selector

**Files:**
- Create: `src/components/play/AbilityPanel.jsx`
- Create: `src/components/play/ItemPanel.jsx`
- Create: `src/components/play/BardSelector.jsx`

- [ ] **Step 1: Create AbilityPanel**

```jsx
// src/components/play/AbilityPanel.jsx
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
```

- [ ] **Step 2: Create BardSelector**

```jsx
// src/components/play/BardSelector.jsx
import { ROLES } from '../../lib/constants'

export default function BardSelector({ teammates, onSelect }) {
  return (
    <div className="space-y-4">
      <p className="text-white font-bold text-lg text-center">🎵 ¿A quién restauras la habilidad?</p>
      <div className="grid grid-cols-2 gap-3">
        {teammates.map(player => (
          <button
            key={player.id}
            onClick={() => onSelect(player.id)}
            className="bg-gray-800 border-2 border-gray-600 hover:border-indigo-500 hover:bg-gray-700 rounded-xl p-5 flex flex-col items-center gap-2 transition-all"
          >
            <span className="text-4xl">{ROLES[player.role]?.icon}</span>
            <span className="text-white font-semibold">{player.nickname}</span>
            <span className="text-gray-400 text-xs">{ROLES[player.role]?.label}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Create ItemPanel**

```jsx
// src/components/play/ItemPanel.jsx
import { ITEMS } from '../../lib/constants'

export default function ItemPanel({ items, onUse, disabled }) {
  const available = items.filter(it => !it.is_used)

  if (available.length === 0) return (
    <div className="bg-gray-800 rounded-xl p-4 text-center text-gray-500 text-sm">Sin items disponibles</div>
  )

  return (
    <div className="space-y-2">
      <p className="text-gray-400 text-sm">Items del equipo</p>
      <div className="grid grid-cols-3 gap-2">
        {available.map(item => (
          <button
            key={item.id}
            onClick={() => onUse(item)}
            disabled={disabled}
            className="bg-gray-800 border border-gray-600 hover:border-yellow-500 hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed rounded-lg p-3 flex flex-col items-center gap-1 transition-all"
          >
            <span className="text-3xl">{ITEMS[item.type]?.icon}</span>
            <span className="text-white text-xs font-semibold">{ITEMS[item.type]?.label}</span>
            <span className="text-gray-400 text-xs text-center leading-tight">{ITEMS[item.type]?.description}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Commit**

```bash
git add src/components/play/
git commit -m "feat: ability panel, bard selector, item panel for player view"
```

---

## Task 17: PlayPage — full player device view

**Files:**
- Modify: `src/pages/PlayPage.jsx`

- [ ] **Step 1: Implement PlayPage**

```jsx
// src/pages/PlayPage.jsx
import { useEffect, useState, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { usePlayerStore } from '../store/playerStore'
import { useGameStore } from '../store/gameStore'
import { useGameChannel } from '../hooks/useGameChannel'
import { useLobbyPresence } from '../hooks/useLobbyPresence'
import { applyAbility } from '../engine/abilityResolver'
import { ROLES, CLOCK_BONUS_SECONDS } from '../lib/constants'
import AnswerOptions from '../components/play/AnswerOptions'
import AbilityPanel from '../components/play/AbilityPanel'
import BardSelector from '../components/play/BardSelector'
import ItemPanel from '../components/play/ItemPanel'

export default function PlayPage() {
  const { role } = useParams()
  const navigate = useNavigate()
  const playerId = usePlayerStore(s => s.playerId)
  const nickname = usePlayerStore(s => s.nickname)
  const playerRole = usePlayerStore(s => s.role)
  const gameId = usePlayerStore(s => s.gameId)

  const game = useGameStore(s => s.game)
  const setGame = useGameStore(s => s.setGame)
  const players = useGameStore(s => s.players)
  const setPlayers = useGameStore(s => s.setPlayers)
  const items = useGameStore(s => s.items)
  const setItems = useGameStore(s => s.setItems)
  const activeQuestion = useGameStore(s => s.activeQuestion)
  const setActiveQuestion = useGameStore(s => s.setActiveQuestion)
  const assignedPlayerId = useGameStore(s => s.assignedPlayerId)
  const secondsRemaining = useGameStore(s => s.secondsRemaining)
  const setSecondsRemaining = useGameStore(s => s.setSecondsRemaining)
  const abilityUsedThisQuestion = useGameStore(s => s.abilityUsedThisQuestion)
  const setAbilityUsed = useGameStore(s => s.setAbilityUsed)
  const itemUsedThisQuestion = useGameStore(s => s.itemUsedThisQuestion)
  const setItemUsed = useGameStore(s => s.setItemUsed)
  const setAnswered = useGameStore(s => s.setAnswered)
  const resetQuestionState = useGameStore(s => s.resetQuestionState)
  const updatePlayerAbilityUses = useGameStore(s => s.updatePlayerAbilityUses)
  const setRemovedOptionIds = useGameStore(s => s.setRemovedOptionIds)
  const setIsDoubled = useGameStore(s => s.setIsDoubled)
  const setHeartActive = useGameStore(s => s.setHeartActive)

  const [phase, setPhase] = useState('lobby') // lobby | playing | paused | finished
  const [showBardSelector, setShowBardSelector] = useState(false)
  const [teamScore, setTeamScore] = useState(0)

  const { track } = useLobbyPresence()

  useEffect(() => {
    if (!playerId) { navigate('/join', { replace: true }); return }

    // Track in lobby presence
    track({ playerId, nickname, role: playerRole })

    async function load() {
      const { data: g } = await supabase.from('games').select('*').eq('id', gameId).single()
      setGame(g)
      setTeamScore(g?.team_score ?? 0)

      const { data: ps } = await supabase.from('players').select('*').eq('game_id', gameId)
      setPlayers(ps ?? [])

      const { data: its } = await supabase.from('game_items').select('*').eq('game_id', gameId)
      setItems(its ?? [])
    }
    load()
  }, [playerId, nickname, playerRole, gameId, navigate, track, setGame, setPlayers, setItems])

  const isAssigned = assignedPlayerId === playerId
  const canAct = !!activeQuestion && !abilityUsedThisQuestion && !itemUsedThisQuestion
  const myPlayer = players.find(p => p.id === playerId)
  const abilityUses = myPlayer?.ability_uses ?? 0
  const teammates = players.filter(p => p.id !== playerId)

  const handleEvent = useCallback((event, payload) => {
    switch (event) {
      case 'game:started':
        setPhase('playing')
        break

      case 'question:active':
        supabase.from('questions').select('*, question_options(*)').eq('id', payload.question_id).single()
          .then(({ data: q }) => {
            setActiveQuestion(q, payload.assigned_player_id, payload.time_limit)
          })
        setShowBardSelector(false)
        break

      case 'timer:tick':
        setSecondsRemaining(payload.seconds_remaining)
        break

      case 'question:answered':
      case 'question:timeout':
        setTeamScore(payload.new_team_score)
        setAnswered()
        break

      case 'item:dropped':
        setItems(prev => [...prev, { id: payload.game_item_id, type: payload.item_type, is_used: false }])
        break

      case 'item:used':
        setItems(prev => prev.map(it => it.id === payload.item_id ? { ...it, is_used: true } : it))
        break

      case 'ability:used':
        updatePlayerAbilityUses(payload.player_id, 0)
        if (payload.role === 'bard' && payload.target_player_id === playerId) {
          updatePlayerAbilityUses(playerId, 1)
        }
        if (payload.role === 'archer') {
          setRemovedOptionIds(payload.removed_option_ids ?? [])
        }
        if (payload.role === 'thief') setIsDoubled(true)
        break

      case 'round:completed':
        resetQuestionState()
        break

      case 'game:paused':
        setPhase('paused')
        break

      case 'game:resumed':
        setPhase('playing')
        break

      case 'game:finished':
        setPhase('finished')
        break

      case 'game:restarted':
        setPhase('lobby')
        resetQuestionState()
        setTeamScore(0)
        break
    }
  }, [setActiveQuestion, setSecondsRemaining, setAnswered, setItems, updatePlayerAbilityUses, setRemovedOptionIds, setIsDoubled, setHeartActive, resetQuestionState, playerId])

  const { emit } = useGameChannel(handleEvent)

  async function handleAnswer(optionId, isCorrect) {
    emit('question:answered', {
      player_id: playerId,
      option_id: optionId,
      is_correct: isCorrect,
      // score_delta and new_team_score are computed by admin; this event triggers admin handler
    })
    setAnswered()
  }

  function handleUseAbility() {
    if (!canAct || abilityUses <= 0) return

    if (role === 'bard') {
      setShowBardSelector(true)
      return
    }

    const incorrectOptionIds = role === 'archer'
      ? (activeQuestion.question_options ?? []).filter(o => !o.is_correct).map(o => o.id)
      : []

    emit('ability:used', {
      player_id: playerId,
      role,
      ability: ROLES[role]?.ability,
      removed_option_ids: incorrectOptionIds,
    })
    setAbilityUsed()
    updatePlayerAbilityUses(playerId, 0)

    if (role === 'thief') setIsDoubled(true)
    if (role === 'archer') setRemovedOptionIds(incorrectOptionIds.slice(0, 2))
  }

  function handleBardSelect(targetPlayerId) {
    emit('ability:used', {
      player_id: playerId,
      role: 'bard',
      ability: ROLES.bard.ability,
      target_player_id: targetPlayerId,
    })
    setAbilityUsed()
    updatePlayerAbilityUses(playerId, 0)
    updatePlayerAbilityUses(targetPlayerId, 1)
    setShowBardSelector(false)
  }

  async function handleUseItem(item) {
    if (!canAct) return

    await supabase.from('game_items').update({ is_used: true }).eq('id', item.id)
    emit('item:used', { player_id: playerId, item_id: item.id, type: item.type })
    setItemUsed()
    setItems(prev => prev.map(it => it.id === item.id ? { ...it, is_used: true } : it))

    if (item.type === 'heart') setHeartActive(true)
    if (item.type === 'chest') updatePlayerAbilityUses(playerId, 1)
    // 'clock' handled by admin (adds seconds)
  }

  if (phase === 'lobby') {
    return (
      <div className="min-h-screen bg-gray-900 flex flex-col items-center justify-center gap-4 text-white">
        <span className="text-6xl">{ROLES[role]?.icon}</span>
        <h2 className="text-2xl font-bold">{nickname}</h2>
        <p className="text-indigo-400 font-semibold">{ROLES[role]?.label}</p>
        <p className="text-gray-400 mt-4">Esperando que inicie la partida…</p>
      </div>
    )
  }

  if (phase === 'finished') {
    return (
      <div className="min-h-screen bg-gray-900 flex flex-col items-center justify-center gap-4 text-white">
        <h1 className="text-3xl font-bold">¡Juego terminado!</h1>
        <p className="text-indigo-400 text-2xl font-bold">Puntuación: {teamScore}</p>
      </div>
    )
  }

  // Bard is selecting a teammate
  if (showBardSelector) {
    return (
      <div className="min-h-screen bg-gray-900 flex flex-col items-center justify-center p-6">
        <BardSelector teammates={teammates} onSelect={handleBardSelect} />
      </div>
    )
  }

  // Assigned player — show answers
  if (isAssigned) {
    return (
      <div className="min-h-screen bg-gray-900 p-6 space-y-6">
        <div className="flex justify-between items-center">
          <p className="text-indigo-400 font-semibold">¡Te toca responder!</p>
          <p className="text-white font-bold tabular-nums">{secondsRemaining ?? '--'}s</p>
        </div>
        <AnswerOptions
          question={activeQuestion}
          onAnswer={handleAnswer}
          disabled={phase === 'paused'}
        />
      </div>
    )
  }

  // Non-assigned player — show ability + items
  const assignedNickname = players.find(p => p.id === assignedPlayerId)?.nickname ?? '...'
  return (
    <div className="min-h-screen bg-gray-900 p-6 space-y-6">
      <div className="flex justify-between items-center">
        <p className="text-gray-400 text-sm">{assignedNickname} está respondiendo</p>
        <p className="text-white font-bold tabular-nums">{secondsRemaining ?? '--'}s</p>
      </div>
      <AbilityPanel
        role={role}
        abilityUses={abilityUses}
        onUse={handleUseAbility}
        disabled={!canAct || phase === 'paused'}
      />
      <ItemPanel
        items={items}
        onUse={handleUseItem}
        disabled={!canAct || phase === 'paused'}
      />
      <div className="text-center text-gray-500 text-sm">
        Puntos del equipo: <span className="text-white font-bold">{teamScore}</span>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/pages/PlayPage.jsx
git commit -m "feat: player device view — answer mode, ability/item mode, bard selector"
```

---

## Task 18: Clock item — add seconds to timer (admin side)

The `clock` item needs the admin to extend the timer. The admin listens for `item:used` events with `type: 'clock'` and restarts the timer with extra seconds.

**Files:**
- Modify: `src/components/admin/GameControls.jsx`

- [ ] **Step 1: Handle clock item in GameControls handleEvent**

In `GameControls.jsx`, update `handleEvent` (the callback passed to `useGameChannel`):

```js
// Inside handleEvent in GameControls.jsx
const handleEvent = useCallback((event, payload) => {
  if (event === 'item:used' && payload.type === 'clock') {
    // Extend the current timer
    const current = useGameStore.getState().secondsRemaining ?? 0
    const extended = current + CLOCK_BONUS_SECONDS
    startTimer(extended)
    // Update the active question's effective time limit so timer:tick percentage stays correct
    useGameStore.getState().setSecondsRemaining(extended)
  }
}, [startTimer])
```

Add `import { CLOCK_BONUS_SECONDS } from '../../lib/constants'` at the top if not already present.

- [ ] **Step 2: Commit**

```bash
git add src/components/admin/GameControls.jsx
git commit -m "feat: clock item extends timer via admin broadcast"
```

---

## Task 19: Final integration test and cleanup

**Files:**
- Modify: `src/App.jsx` (add ROLES import fix in AdminPage)

- [ ] **Step 1: Run all unit tests**

```bash
npx vitest run
```
Expected: 11 tests pass.

- [ ] **Step 2: Full manual game flow test**

Open 3 terminal tabs:

1. `npm run dev` — keep the dev server running
2. Browser 1 (incognito) → `/admin` — create a game, add 1 round with 2 questions, upload music if available
3. Browser 2 (full) → `/host`
4. Browsers 3-7 (5 tabs or devices on same network) → scan QR or go to `/join`

Verify:
- [ ] Each of the 5 players gets a unique role
- [ ] 6th player sees "Cuarto lleno"
- [ ] Lobby shows all 5 players with icons in `/host`
- [ ] Admin starts game → `/host` transitions from lobby to game view
- [ ] Question appears on `/host` with options, timer, score
- [ ] Assigned player sees answer options; others see ability panel
- [ ] Timer counts down and syncs on all devices
- [ ] Answering correctly adds points; incorrectly subtracts
- [ ] Timer expiry subtracts points
- [ ] Paladin: skip question works (no point change)
- [ ] Warrior: takes over as answerer
- [ ] Archer: 2 options grey out on `/host` only
- [ ] Thief: next correct answer doubles points
- [ ] Bard: teammate selector appears, restores ability
- [ ] Heart item: wrong answer = 0 point change
- [ ] Clock item: adds 10s to timer
- [ ] Chest item: restores player's ability uses
- [ ] Music plays at round start, stops at round end
- [ ] Pause/Resume/Restart from admin panel work
- [ ] Game ends after all rounds, shows final score

- [ ] **Step 3: Fix any issues found**

Address bugs found during manual testing.

- [ ] **Step 4: Final commit**

```bash
git add -A
git commit -m "feat: Quest & Conquer — complete implementation"
```

---

## Notes on production deployment

- Host on Vercel or Netlify (static React SPA, zero config)
- Set `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_JOIN_URL` as environment variables in the hosting platform
- `VITE_JOIN_URL` should be your production domain (e.g. `https://quest-conquer.vercel.app/join`)
- Players and admin must be on the same Supabase project — no additional backend required
