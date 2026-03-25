# Quest & Conquer — Diseño del sistema

**Fecha:** 2026-03-25
**Stack:** React + Vite + Supabase (PostgreSQL + Realtime + Storage + Auth)
**Contexto:** Juego de trivia colaborativo para sesiones de teambuilding. Una partida activa por vez, hasta 5 jugadores simultáneos.

---

## 1. Arquitectura general

```
┌─────────────────────────────────────────────────────┐
│                    React + Vite                      │
│                                                      │
│  /admin        Panel admin (crear partida, flujo)    │
│  /host         Vista pública/proyector               │
│  /join         QR landing → nickname + rol           │
│  /play/:role   Vista del jugador (responder/habilidad)│
└──────────────────────┬──────────────────────────────┘
                       │
          ┌────────────┴────────────┐
          │        Supabase         │
          │                         │
          │  PostgreSQL             │  ← datos persistentes
          │  Realtime Broadcast     │  ← estado efímero del juego
          │  channel: "game"        │
          │  Realtime Presence      │  ← jugadores conectados
          │  channel: "lobby"       │
          │  Storage                │  ← archivos de música por ronda
          │  Auth                   │  ← solo para admin
          └─────────────────────────┘
```

**Principio de separación de estado:**
- **PostgreSQL** almacena datos persistentes: partida, rondas, preguntas, jugadores, score final, inventario de items.
- **Realtime Broadcast** transporta eventos efímeros: pregunta activa, timer, habilidades usadas, items activados.
- **Realtime Presence** gestiona la sala de espera: qué jugadores están conectados en tiempo real.
- **Storage** aloja los archivos de audio (MP3/OGG) configurados por ronda.

---

## 2. Stack tecnológico

| Capa | Tecnología |
|---|---|
| Frontend | React 18 + Vite |
| Estilos | Tailwind CSS + shadcn/ui |
| Estado global | Zustand |
| Routing | React Router v6 |
| Base de datos | Supabase PostgreSQL |
| Tiempo real | Supabase Realtime (Broadcast + Presence) |
| Almacenamiento | Supabase Storage (bucket: `round-music`) |
| Auth | Supabase Auth (magic link o email/password, solo admin) |
| QR | qrcode.react |

---

## 3. Modelo de datos

```sql
-- Partida
games
  id            uuid PK
  status        enum ('waiting', 'in_progress', 'paused', 'finished')
  total_rounds  integer
  team_score    integer  DEFAULT 0
  created_at    timestamp

-- Rondas
rounds
  id            uuid PK
  game_id       uuid FK → games
  round_number  integer
  status        enum ('pending', 'active', 'completed')
  music_url     text          -- URL en Supabase Storage
  music_name    varchar(100)  -- nombre descriptivo para el admin

-- Preguntas
questions
  id             uuid PK
  round_id       uuid FK → rounds
  body           text
  difficulty     enum ('easy', 'medium', 'hard')
  points_correct integer   -- puntos que suma al equipo si acierta
  points_wrong   integer   -- puntos que resta al equipo si falla
  time_limit     integer   -- segundos para responder
  order          integer   -- orden dentro de la ronda

-- Opciones de respuesta (1 correcta + 3 incorrectas por pregunta)
question_options
  id          uuid PK
  question_id uuid FK → questions
  body        text
  is_correct  boolean

-- Jugadores
players
  id           uuid PK
  game_id      uuid FK → games
  nickname     varchar(32)
  role         enum ('paladin', 'warrior', 'archer', 'thief', 'bard')
  ability_uses integer  DEFAULT 1  -- usos restantes de habilidad en la ronda actual
  joined_at    timestamp

-- Items del equipo (inventario compartido)
game_items
  id          uuid PK
  game_id     uuid FK → games
  type        enum ('clock', 'heart', 'chest')
  is_used     boolean  DEFAULT false
  obtained_at timestamp
```

**Notas:**
- Cada `role` es único por partida: no pueden existir dos jugadores con el mismo rol.
- `ability_uses` se resetea a 1 al inicio de cada ronda. El Bardo puede restaurarlo durante la ronda.
- `game_items` es inventario compartido: cualquier jugador puede activar cualquier item disponible.
- Timer y estado de la pregunta activa NO se persisten en DB — viajan por Broadcast.

---

## 4. Roles y habilidades

| Rol | Habilidad | Usos por ronda | Descripción |
|---|---|---|---|
| Paladín 🛡️ | Pasar pregunta | 1 | Salta la pregunta activa sin perder puntos |
| Guerrero ⚔️ | Tomar control | 1 | Contesta la pregunta en lugar del jugador asignado |
| Arquero 🏹 | Eliminar 2 opciones | 1 | Remueve visualmente 2 respuestas incorrectas del proyector (no del dispositivo del jugador) |
| Ladrón 🗡️ | Duplicar puntos | 1 | Duplica los puntos en juego de la pregunta actual |
| Bardo 🎵 | Restaurar habilidad | 1 | Selecciona a un compañero y restaura 1 uso de su habilidad |

**Reglas de activación:**
- Solo se puede usar 1 habilidad O 1 item por pregunta, nunca ambos simultáneamente.
- Las habilidades e items solo se pueden activar una vez que el timer de la pregunta inicia.
- Si el tiempo expira sin respuesta, se descuentan los puntos como respuesta incorrecta.

---

## 5. Items especiales

| Item | Ícono | Efecto | Activación |
|---|---|---|---|
| Reloj | 🕐 | Agrega segundos al timer de la pregunta activa | Cualquier jugador |
| Corazón | ❤️ | Evita que se resten puntos en caso de respuesta incorrecta | Cualquier jugador |
| Cofre | 📦 | Restaura 1 uso de habilidad al jugador que lo activa | Cualquier jugador |

**Drop de items:** Al responder una pregunta correctamente hay una probabilidad muy baja de obtener un item. El item obtenido se agrega al inventario compartido (`game_items`) y se notifica a todos los jugadores via Broadcast (`item:dropped`).

---

## 6. Protocolo de eventos Realtime (Broadcast)

Canal: `"game"` — todos los clientes están suscritos.

```
EVENTO                   PAYLOAD                                    EMISOR
──────────────────────────────────────────────────────────────────────────
game:started             { game_id }                                Admin
round:started            { round_number, music_url }               Admin
question:active          { question_id, assigned_player_id,        Admin
                           time_limit, points_correct,
                           points_wrong, difficulty }
timer:tick               { seconds_remaining }                      Admin (intervalo)
ability:used             { player_id, role, ability,               Jugador
                           target_player_id? }
item:used                { player_id, item_id, type }              Cualquier jugador
question:answered        { player_id, option_id, is_correct,       Jugador asignado
                           score_delta, new_team_score }            (o Guerrero)
question:timeout         { question_id, new_team_score }           Admin
item:dropped             { item_type, game_item_id }               Admin
round:completed          { round_number, team_score }              Admin
game:paused              {}                                         Admin
game:resumed             {}                                         Admin
game:finished            { final_score }                           Admin
game:restarted           {}                                         Admin
```

---

## 7. Vistas y componentes

### `/host` — Vista proyector (pantalla grande)
- Información de ronda actual y total de rondas
- Texto de la pregunta, nivel de dificultad, puntos en juego (+/-)
- 4 opciones de respuesta (el Arquero puede atenuar/ocultar 2 incorrectas visualmente)
- Timer con cuenta regresiva
- Score actual del equipo
- Nickname e ícono de rol del jugador asignado a responder
- Reproductor de música: inicia automáticamente al recibir `round:started`, se detiene en `round:completed`
- Inventario de items compartidos

### `/join` — Landing del QR
- Campo para ingresar nickname
- Muestra el rol asignado aleatoriamente al confirmar
- Si los 5 slots están ocupados: vista "Cuarto lleno"

### `/host` (lobby) — Sala de espera
- Lista de jugadores conectados con nickname + ícono de rol
- Botón "Comenzar" que se activa solo cuando hay exactamente 5 jugadores
- Visualización en tiempo real via Presence

### `/play/:role` — Dispositivo del jugador asignado
- Texto de la pregunta
- 4 opciones de respuesta como botones seleccionables
- Timer visible
- Nota: el Arquero elimina opciones en el proyector pero NO en esta vista

### `/play/:role` — Dispositivo de jugador NO asignado
- Indicador de quién está respondiendo
- Panel de habilidad propia con botón de activación (se deshabilita si ya fue usada)
- Inventario de items compartidos con botones de activación
- Solo 1 habilidad o 1 item activable por pregunta

### Vista especial Bardo (selección de compañero)
- Cuando el Bardo activa su habilidad, su dispositivo muestra un selector con los 4 compañeros
- Mismo estilo visual que las opciones de respuesta (grid 2x2)
- Cada opción muestra nickname + ícono de rol del compañero

### `/admin` — Panel de administración
**Modo creación:**
- Crear partida: definir número de rondas
- Por cada ronda: subir archivo de música (Supabase Storage), agregar preguntas
- Por cada pregunta: texto, dificultad, tiempo límite, puntos correctos/incorrectos, 4 opciones (marcar la correcta)
- Mostrar QR con la URL de `/join`

**Modo juego:**
- Estado actual: ronda, pregunta, score
- Controles: Pausar, Continuar, Reiniciar
- Lista de jugadores conectados con sus roles
- Score en tiempo real

---

## 8. Flujo completo de una partida

```
1. Admin crea partida (rondas + preguntas + música) desde /admin
2. Admin genera y muestra QR → URL de /join
3. Jugadores escanean QR, ingresan nickname, reciben rol aleatorio único
4. Sala de espera muestra jugadores conectados en tiempo real
5. Al completarse 5 jugadores, admin presiona "Comenzar"
   → Emit: game:started
6. Por cada ronda:
   a. Emit: round:started (con music_url) → reproduce música en /host
   b. Por cada pregunta:
      i.   Admin emite question:active con jugador asignado al azar
      ii.  Timer inicia en todos los dispositivos
      iii. Jugador asignado ve opciones; resto ve habilidades/items
      iv.  Jugadores pueden activar 1 habilidad O 1 item
      v.   Jugador asignado selecciona respuesta → question:answered
           O timer expira → question:timeout (cuenta como incorrecta)
      vi.  Score del equipo se actualiza en DB y se propaga
      vii. Baja probabilidad de drop de item si la respuesta fue correcta
   c. Emit: round:completed → música se detiene
7. Al completar todas las rondas → game:finished con score final
```

---

## 9. Restricciones de acceso

- Solo 1 partida activa (`status != 'finished'`) puede existir en la DB.
- Máximo 5 jugadores por partida; el sexto y siguientes ven la vista "Cuarto lleno".
- Cada rol es único: si Paladín ya está tomado, no se asigna a otro jugador.
- Solo usuarios autenticados con Supabase Auth pueden acceder a `/admin`.
- Los jugadores no requieren autenticación, solo un nickname válido.
