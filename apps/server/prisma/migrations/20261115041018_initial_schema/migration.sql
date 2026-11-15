-- CreateEnum
CREATE TYPE "side" AS ENUM ('RED', 'BLACK');

-- CreateEnum
CREATE TYPE "side_preference" AS ENUM ('RED', 'BLACK', 'RANDOM');

-- CreateEnum
CREATE TYPE "room_status" AS ENUM ('WAITING', 'STARTED', 'CLOSED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "connection_state" AS ENUM ('CONNECTED', 'RECONNECTING', 'DISCONNECTED');

-- CreateEnum
CREATE TYPE "game_mode" AS ENUM ('PVP', 'PVE', 'PVP_RANKED');

-- CreateEnum
CREATE TYPE "ai_difficulty" AS ENUM ('EASY', 'MEDIUM', 'HARD');

-- CreateEnum
CREATE TYPE "match_status" AS ENUM ('IN_PROGRESS', 'FINISHED');

-- CreateEnum
CREATE TYPE "end_reason" AS ENUM ('CHECKMATE', 'STALEMATE', 'RESIGN', 'DRAW_AGREEMENT', 'TIMEOUT', 'DISCONNECT_FORFEIT');

-- CreateEnum
CREATE TYPE "actor_type" AS ENUM ('HUMAN', 'AI');

-- CreateTable
CREATE TABLE "guest_session" (
    "guest_id" UUID NOT NULL,
    "nickname" VARCHAR(32),
    "reconnect_token_hash" CHAR(64) NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_seen_at" TIMESTAMPTZ(3) NOT NULL,
    "expires_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "guest_session_pkey" PRIMARY KEY ("guest_id")
);

-- CreateTable
CREATE TABLE "room" (
    "room_id" VARCHAR(43) NOT NULL,
    "join_code" CHAR(8) NOT NULL,
    "status" "room_status" NOT NULL DEFAULT 'WAITING',
    "time_control" JSONB NOT NULL,
    "preferred_side" "side_preference" NOT NULL,
    "host_guest_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_activity_at" TIMESTAMPTZ(3) NOT NULL,
    "expires_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "room_pkey" PRIMARY KEY ("room_id")
);

-- CreateTable
CREATE TABLE "room_seat" (
    "room_id" VARCHAR(43) NOT NULL,
    "side" "side" NOT NULL,
    "guest_id" UUID NOT NULL,
    "joined_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "connection_state" "connection_state" NOT NULL DEFAULT 'CONNECTED',
    "disconnected_at" TIMESTAMPTZ(3),

    CONSTRAINT "room_seat_pkey" PRIMARY KEY ("room_id","side")
);

-- CreateTable
CREATE TABLE "match" (
    "match_id" UUID NOT NULL,
    "mode" "game_mode" NOT NULL,
    "room_id" VARCHAR(43),
    "red_guest_id" UUID,
    "black_guest_id" UUID,
    "ai_side" "side",
    "ai_difficulty" "ai_difficulty",
    "status" "match_status" NOT NULL DEFAULT 'IN_PROGRESS',
    "time_control" JSONB NOT NULL,
    "turn" "side" NOT NULL DEFAULT 'RED',
    "version" INTEGER NOT NULL DEFAULT 0,
    "snapshot" JSONB NOT NULL,
    "clocks" JSONB NOT NULL,
    "winner" "side",
    "end_reason" "end_reason",
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ended_at" TIMESTAMPTZ(3),

    CONSTRAINT "match_pkey" PRIMARY KEY ("match_id")
);

-- CreateTable
CREATE TABLE "move" (
    "match_id" UUID NOT NULL,
    "ply" INTEGER NOT NULL,
    "move_id" UUID NOT NULL,
    "actor_type" "actor_type" NOT NULL,
    "guest_id" UUID,
    "from_square" JSONB NOT NULL,
    "to_square" JSONB NOT NULL,
    "capture" JSONB,
    "clock_after" JSONB NOT NULL,
    "state_hash" CHAR(64) NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "move_pkey" PRIMARY KEY ("match_id","ply")
);

-- CreateIndex
CREATE UNIQUE INDEX "guest_session_reconnect_token_hash_key" ON "guest_session"("reconnect_token_hash");

-- CreateIndex
CREATE INDEX "guest_session_expires_at_idx" ON "guest_session"("expires_at");

-- CreateIndex
CREATE UNIQUE INDEX "room_join_code_key" ON "room"("join_code");

-- CreateIndex
CREATE INDEX "room_expires_at_idx" ON "room"("expires_at");

-- CreateIndex
CREATE UNIQUE INDEX "uq_room_seat_guest" ON "room_seat"("room_id", "guest_id");

-- CreateIndex
CREATE INDEX "match_red_guest_id_idx" ON "match"("red_guest_id");

-- CreateIndex
CREATE INDEX "match_black_guest_id_idx" ON "match"("black_guest_id");

-- CreateIndex
CREATE INDEX "match_ended_at_idx" ON "match"("ended_at");

-- CreateIndex
CREATE UNIQUE INDEX "uq_move_match_move_id" ON "move"("match_id", "move_id");

-- AddForeignKey
ALTER TABLE "room" ADD CONSTRAINT "room_host_guest_id_fkey" FOREIGN KEY ("host_guest_id") REFERENCES "guest_session"("guest_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "room_seat" ADD CONSTRAINT "room_seat_room_id_fkey" FOREIGN KEY ("room_id") REFERENCES "room"("room_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "room_seat" ADD CONSTRAINT "room_seat_guest_id_fkey" FOREIGN KEY ("guest_id") REFERENCES "guest_session"("guest_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "match" ADD CONSTRAINT "match_room_id_fkey" FOREIGN KEY ("room_id") REFERENCES "room"("room_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "match" ADD CONSTRAINT "match_red_guest_id_fkey" FOREIGN KEY ("red_guest_id") REFERENCES "guest_session"("guest_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "match" ADD CONSTRAINT "match_black_guest_id_fkey" FOREIGN KEY ("black_guest_id") REFERENCES "guest_session"("guest_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "move" ADD CONSTRAINT "move_match_id_fkey" FOREIGN KEY ("match_id") REFERENCES "match"("match_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Rules Prisma cannot express in schema.prisma (keep them when regenerating this migration).
-- PVE matches must name the AI side and difficulty (FR-30).
ALTER TABLE "match" ADD CONSTRAINT "chk_match_pve_has_ai"
  CHECK ("mode" <> 'PVE' OR ("ai_side" IS NOT NULL AND "ai_difficulty" IS NOT NULL));
-- State versions only grow from 0 (SRS 3.3).
ALTER TABLE "match" ADD CONSTRAINT "chk_match_version_non_negative" CHECK ("version" >= 0);
