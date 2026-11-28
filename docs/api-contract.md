# API contract: guest session, rooms, match start, moves

Covers US-11 (SCRUM-72), US-13 (SCRUM-74), US-14 (SCRUM-75) and the moves of US-20..22
(SCRUM-81..83).
The types live in `packages/shared` (`guest-session.ts`, `room.ts`, `match.ts`, `events.ts`, `errors.ts`);
this page explains them. **If this page and the types disagree, the types win**: change the
types first, then this page.

## Conventions

- REST is under `/api`, Socket.IO on the same origin (Vite proxy in dev, nginx in Docker).
- Every client → server socket event may carry `requestId` and is answered with `Ack<T>`:
  `{ ok: true, requestId, data }` or `{ ok: false, requestId, error: ApiError }`.
- `ApiError = { code, message, requestId?, details? }`. `details` is new: for
  `VALIDATION_FAILED` it carries `{ field, allowed }` so the UI can list valid values.
  On the server, pass it as the 4th argument of `DomainException`.
- Times are ISO 8601 strings; durations are milliseconds.

## 1. Guest session (US-11) — REST

| Method & path                 | Body                    | Success                       | Errors                                               |
| ----------------------------- | ----------------------- | ----------------------------- | ---------------------------------------------------- |
| `POST /api/guest-session`     | `{ nickname?: string }` | `201` new / `200` reused (A1) | `400 VALIDATION_FAILED` (`details.field = nickname`) |
| `GET /api/guest-session/me`   | —                       | `200`                         | `401 ACCESS_DENIED` (no or expired cookie)           |
| `PATCH /api/guest-session/me` | `{ nickname: string }`  | `200`                         | `400 VALIDATION_FAILED`, `401 ACCESS_DENIED`         |

All success bodies are `GuestSessionView = { guestId, nickname, expiresAt }`.

- Cookie `xq_rt`: `HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=30 days`. Value is a
  random 32-byte (256-bit) token, base64url. The DB stores only its SHA-256
  (`guest_session.reconnect_token_hash`). The token never appears in a body or URL.
- `POST` with a valid cookie reuses that session (A1) and ignores `nickname` unless the session has
  none. Every authenticated request extends `expiresAt` by 30 days (CFG-07).
- `guestId` is a random UUID (not sequential) and is safe to show to the client.
- Nickname: `normalizeNickname()` then `isValidNickname()` (2–20 code points). Both sides use
  the same helpers; empty means "no nickname".
- Socket.IO authenticates from the same cookie at handshake. A socket without a valid
  session gets `ACCESS_DENIED` on every event.

**Client boot (SCRUM-139):** `POST /api/guest-session` → store `{ guestId, nickname }` →
`connectSocket()`.

## 2. Create room (US-13) — socket `CreateRoom`

Request `CreateRoomRequest = { timeControl, preferredSide }` → Ack `RoomView`.

- `timeControl` must be one of `TIME_CONTROL_PRESETS` (check with `isTimeControlPreset`).
  Otherwise `VALIDATION_FAILED` with `details = { field: 'timeControl', allowed: TIME_CONTROL_PRESETS }` (E1).
- `preferredSide` must be one of `SIDE_PREFERENCES`; otherwise `VALIDATION_FAILED` with
  `details = { field: 'preferredSide', allowed: SIDE_PREFERENCES }`.
- `RANDOM` is resolved at creation, so `hostSide` is always `RED` or `BLACK`.
- `roomId`: 32 random bytes, base64url (43 chars). `joinCode`: 8 chars from
  `JOIN_CODE_ALPHABET`; regenerate on unique collision.
- The server joins the host's socket to the Socket.IO room `room:<roomId>`.
- Invite link: `/room/:roomId` (`paths.room`).

## 3. Join room (US-14) — socket `JoinRoom`

Request `JoinRoomRequest = { roomId } | { joinCode }` → Ack `RoomView`.
The client sends `normalizeJoinCode(input)`.

| Case                            | Result                                                 |
| ------------------------------- | ------------------------------------------------------ |
| Unknown room / code             | `ROOM_NOT_FOUND`                                       |
| Status `CLOSED` or `EXPIRED`    | `ROOM_EXPIRED`                                         |
| Guest already holds a seat (A1) | Ack with that seat; nothing new is created             |
| Both seats taken by others      | `ROOM_FULL`                                            |
| Second seat taken               | Ack, then `RoomUpdated` and `MatchStarted` to the room |

- Seat assignment is atomic: insert the `room_seat` row inside a transaction. The primary key
  `(room_id, side)` makes a third seat impossible; map the unique violation to `ROOM_FULL`.
- When both seats are filled, in the same transaction: create the `match` (turn `RED`,
  `version 0`), set the room to `STARTED`.

## 4. Close room — socket `CloseRoom`

Request `{ roomId }` → Ack `RoomView` with `status: 'CLOSED'`. Host only (`ACCESS_DENIED`
otherwise). Later `JoinRoom` calls get `ROOM_EXPIRED` (UC-03 A1). Emits `RoomUpdated`.

## 5. Server → client events

| Event          | Payload               | When                                                             |
| -------------- | --------------------- | ---------------------------------------------------------------- |
| `RoomUpdated`  | `RoomView`            | A seat is taken, a seat's connection changes, the room is closed |
| `MatchStarted` | `MatchStartedPayload` | Second seat taken; sent to both seats                            |

`RoomView.yourSide` is per recipient, so the server sends `RoomUpdated` to each socket
separately rather than broadcasting one object.

`MatchStartedPayload` contains `matchId`, `version`, `turn: 'RED'`, `fen` (`toFen` from
`@xiangqi/rules`), `clocks`, and `players.RED` and `players.BLACK` (`{ guestId, nickname }`).
The client finds its side by comparing its `guestId` with `players`, uses it for the board
orientation, then navigates to `/match/:matchId`.

## 6. Moves (US-20..22) — socket `SubmitMove`

Request `SubmitMoveRequest = { matchId, moveId, version, from, to }` → Ack `MoveAcceptedPayload`.

- `moveId` is a UUID v4 made by the client per move. Resending the same `moveId` (after a
  timeout or reconnect) returns the Ack of the first commit and broadcasts nothing (UC-06 E3).
- `version` is the match version the client saw. The server compares it inside the locked
  transaction (`MatchRepository.commitMove`).
- The Ack is sent only after the move, match snapshot and clocks are committed (NFR-07). A
  failed commit answers `INTERNAL_ERROR` and nothing is broadcast (E4).

On success the server also emits `MoveAccepted` (same payload) to the Socket.IO room
`match:<matchId>`, the mover included. Clients apply a payload only if its `version` is
greater than theirs, so the Ack and the event can arrive in either order. A payload with a
gap (`version > current + 1`) is still safe to apply: `fen` is the whole board.

`MoveAcceptedPayload`: `matchId, moveId, ply, version, actorType, side, from, to, capture,
turn, checkState, fen, stateHash, clocks { redMs, blackMs }, committedAt`.
`checkState` is `NONE | CHECK | CHECKMATE | STALEMATE` for the side to move; a game-ending
move is followed by `GameEnded`. Clients check `stateHash` against `stateHash(parseFen(fen))`
to prove both boards converged (NFR-06).

### Rejection

A rejected move is the failed Ack. The SRS 9.3 `MoveRejected` fields travel in it, so no
separate `MoveRejected` event is emitted:

| `error.code`                  | When                                                         | `error.details`        |
| ----------------------------- | ------------------------------------------------------------ | ---------------------- |
| `MOVE_ILLEGAL`                | Breaks a rule or leaves own General in check                 | `{ moveId, snapshot }` |
| `NOT_YOUR_TURN`               | Not the sender's turn                                        | `{ moveId, snapshot }` |
| `STALE_STATE`                 | `version` is not the current version                         | `{ moveId, snapshot }` |
| `GAME_FINISHED`               | Match finished, also a move after the clock deadline (FR-18) | `{ moveId, snapshot }` |
| `VALIDATION_FAILED`           | Malformed body or square off the board                       | `{ field }`            |
| `ACCESS_DENIED` / `NOT_FOUND` | Sender has no seat / unknown match                           | none (no state leaks)  |

`isMoveRejection(error)` tells the two groups apart. `snapshot` is a `MatchSnapshot`
(`matchId, version, status, turn, fen, stateHash, checkState, lastMove, clocks, serverTime`);
the client replaces its board with it, drops the pending move and keeps its move history (FR-12).

## Flow

```
Host                         Server                          Guest
 | POST /guest-session  -->   | set-cookie xq_rt              |
 | CreateRoom           -->   | room WAITING, seat hostSide   |
 | <-- Ack RoomView           |                               |
 |                            |   <-- POST /guest-session     |
 |                            |   <-- JoinRoom {joinCode}     |
 |                            | seat 2, match, room STARTED   |
 |                            |   Ack RoomView -->            |
 | <-- RoomUpdated            |   RoomUpdated -->             |
 | <-- MatchStarted           |   MatchStarted -->            |
```

## Agreed decisions

Confirmed by the team on 2026-11-25:

1. Nickname length 2–20 (`NICKNAME_MIN_LENGTH`, `NICKNAME_MAX_LENGTH`). The DB column allows 32.
2. Join code alphabet without `0 O 1 I L U` (`JOIN_CODE_ALPHABET`).
3. `SameSite=Lax`. It must become `None` (with `Secure`) if FE and BE are ever deployed on different sites.
