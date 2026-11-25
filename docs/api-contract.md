# API contract: guest session, rooms, match start

Covers US-11 (SCRUM-72), US-13 (SCRUM-74) and US-14 (SCRUM-75).
The types live in `packages/shared` (`guest-session.ts`, `room.ts`, `events.ts`, `errors.ts`);
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

## Decisions to confirm

These values are already in code and are easy to change:

1. Nickname length 2–20 (`NICKNAME_MIN_LENGTH`, `NICKNAME_MAX_LENGTH`). The DB column allows 32.
2. Join code alphabet without `0 O 1 I L U` (`JOIN_CODE_ALPHABET`).
3. `SameSite=Lax`. It must become `None` (with `Secure`) if FE and BE are ever deployed on different sites.
