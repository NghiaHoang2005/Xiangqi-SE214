import type { MigrationInterface, QueryRunner } from 'typeorm';

/** Tables from SRS 8.2: guest_session, room, room_seat, match, move. */
export class InitialSchema1794715454324 implements MigrationInterface {
  name = 'InitialSchema1794715454324';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            CREATE TABLE "guest_session" (
                "guest_id" uuid NOT NULL DEFAULT gen_random_uuid(),
                "nickname" character varying(32),
                "reconnect_token_hash" character(64) NOT NULL,
                "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                "last_seen_at" TIMESTAMP WITH TIME ZONE NOT NULL,
                "expires_at" TIMESTAMP WITH TIME ZONE NOT NULL,
                CONSTRAINT "PK_e61337df05a64a52120989b7eee" PRIMARY KEY ("guest_id")
            )
        `);
    await queryRunner.query(`
            CREATE UNIQUE INDEX "IDX_d7bee69eb608861148702d5498" ON "guest_session" ("reconnect_token_hash")
        `);
    await queryRunner.query(`
            CREATE INDEX "IDX_b56d5a63b1f3bb49653c0e4c22" ON "guest_session" ("expires_at")
        `);
    await queryRunner.query(`
            CREATE TYPE "public"."side" AS ENUM('RED', 'BLACK')
        `);
    await queryRunner.query(`
            CREATE TYPE "public"."connection_state" AS ENUM('CONNECTED', 'RECONNECTING', 'DISCONNECTED')
        `);
    await queryRunner.query(`
            CREATE TABLE "room_seat" (
                "room_id" character varying(43) NOT NULL,
                "side" "public"."side" NOT NULL,
                "guest_id" uuid NOT NULL,
                "joined_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                "connection_state" "public"."connection_state" NOT NULL DEFAULT 'CONNECTED',
                "disconnected_at" TIMESTAMP WITH TIME ZONE,
                CONSTRAINT "PK_c4c80a5713e02dc5e49aa2afc38" PRIMARY KEY ("room_id", "side")
            )
        `);
    await queryRunner.query(`
            CREATE UNIQUE INDEX "uq_room_seat_guest" ON "room_seat" ("room_id", "guest_id")
        `);
    await queryRunner.query(`
            CREATE TYPE "public"."room_status" AS ENUM('WAITING', 'STARTED', 'CLOSED', 'EXPIRED')
        `);
    await queryRunner.query(`
            CREATE TYPE "public"."side_preference" AS ENUM('RED', 'BLACK', 'RANDOM')
        `);
    await queryRunner.query(`
            CREATE TABLE "room" (
                "room_id" character varying(43) NOT NULL,
                "join_code" character(8) NOT NULL,
                "status" "public"."room_status" NOT NULL DEFAULT 'WAITING',
                "time_control" jsonb NOT NULL,
                "preferred_side" "public"."side_preference" NOT NULL,
                "host_guest_id" uuid NOT NULL,
                "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                "last_activity_at" TIMESTAMP WITH TIME ZONE NOT NULL,
                "expires_at" TIMESTAMP WITH TIME ZONE NOT NULL,
                CONSTRAINT "PK_483751c0abab68ed1ac952ae920" PRIMARY KEY ("room_id")
            )
        `);
    await queryRunner.query(`
            CREATE UNIQUE INDEX "IDX_b814e61dcb222ef73015714e69" ON "room" ("join_code")
        `);
    await queryRunner.query(`
            CREATE INDEX "IDX_e399ca718d86d3c31de0250e96" ON "room" ("expires_at")
        `);
    await queryRunner.query(`
            CREATE TYPE "public"."game_mode" AS ENUM('PVP', 'PVE', 'PVP_RANKED')
        `);
    await queryRunner.query(`
            CREATE TYPE "public"."ai_difficulty" AS ENUM('EASY', 'MEDIUM', 'HARD')
        `);
    await queryRunner.query(`
            CREATE TYPE "public"."match_status" AS ENUM('IN_PROGRESS', 'FINISHED')
        `);
    await queryRunner.query(`
            CREATE TYPE "public"."end_reason" AS ENUM(
                'CHECKMATE',
                'STALEMATE',
                'RESIGN',
                'DRAW_AGREEMENT',
                'TIMEOUT',
                'DISCONNECT_FORFEIT'
            )
        `);
    await queryRunner.query(`
            CREATE TABLE "match" (
                "match_id" uuid NOT NULL DEFAULT gen_random_uuid(),
                "mode" "public"."game_mode" NOT NULL,
                "room_id" character varying(43),
                "red_guest_id" uuid,
                "black_guest_id" uuid,
                "ai_side" "public"."side",
                "ai_difficulty" "public"."ai_difficulty",
                "status" "public"."match_status" NOT NULL DEFAULT 'IN_PROGRESS',
                "time_control" jsonb NOT NULL,
                "turn" "public"."side" NOT NULL DEFAULT 'RED',
                "version" integer NOT NULL DEFAULT '0',
                "snapshot" jsonb NOT NULL,
                "clocks" jsonb NOT NULL,
                "winner" "public"."side",
                "end_reason" "public"."end_reason",
                "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                "ended_at" TIMESTAMP WITH TIME ZONE,
                CONSTRAINT "chk_match_version_non_negative" CHECK (version >= 0),
                CONSTRAINT "chk_match_pve_has_ai" CHECK (
                    (mode <> 'PVE')
                    OR (
                        ai_side IS NOT NULL
                        AND ai_difficulty IS NOT NULL
                    )
                ),
                CONSTRAINT "PK_2e7d516f3dc97d9e2f882212d2b" PRIMARY KEY ("match_id")
            )
        `);
    await queryRunner.query(`
            CREATE INDEX "IDX_189f89d584e38c3a6549ed96ba" ON "match" ("red_guest_id")
        `);
    await queryRunner.query(`
            CREATE INDEX "IDX_0377980133ff51ec6bd191d8ac" ON "match" ("black_guest_id")
        `);
    await queryRunner.query(`
            CREATE INDEX "IDX_2e60a2798e91e492c931691200" ON "match" ("ended_at")
        `);
    await queryRunner.query(`
            CREATE TYPE "public"."actor_type" AS ENUM('HUMAN', 'AI')
        `);
    await queryRunner.query(`
            CREATE TABLE "move" (
                "match_id" uuid NOT NULL,
                "ply" integer NOT NULL,
                "move_id" uuid NOT NULL,
                "actor_type" "public"."actor_type" NOT NULL,
                "guest_id" uuid,
                "from_square" jsonb NOT NULL,
                "to_square" jsonb NOT NULL,
                "capture" jsonb,
                "clock_after" jsonb NOT NULL,
                "state_hash" character(64) NOT NULL,
                "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                CONSTRAINT "PK_78f50c87f89a3ad02fef623c81a" PRIMARY KEY ("match_id", "ply")
            )
        `);
    await queryRunner.query(`
            CREATE UNIQUE INDEX "uq_move_match_move_id" ON "move" ("match_id", "move_id")
        `);
    await queryRunner.query(`
            ALTER TABLE "room_seat"
            ADD CONSTRAINT "FK_d515299270069b61bb251367e6e" FOREIGN KEY ("room_id") REFERENCES "room"("room_id") ON DELETE CASCADE ON UPDATE NO ACTION
        `);
    await queryRunner.query(`
            ALTER TABLE "room_seat"
            ADD CONSTRAINT "FK_db1220dd9a27c97fee4effd6834" FOREIGN KEY ("guest_id") REFERENCES "guest_session"("guest_id") ON DELETE CASCADE ON UPDATE NO ACTION
        `);
    await queryRunner.query(`
            ALTER TABLE "room"
            ADD CONSTRAINT "FK_c5535e1c438d975a736b1966a78" FOREIGN KEY ("host_guest_id") REFERENCES "guest_session"("guest_id") ON DELETE CASCADE ON UPDATE NO ACTION
        `);
    await queryRunner.query(`
            ALTER TABLE "match"
            ADD CONSTRAINT "FK_aaac99297c07957f6dae2ea2a7b" FOREIGN KEY ("room_id") REFERENCES "room"("room_id") ON DELETE
            SET NULL ON UPDATE NO ACTION
        `);
    await queryRunner.query(`
            ALTER TABLE "match"
            ADD CONSTRAINT "FK_189f89d584e38c3a6549ed96bad" FOREIGN KEY ("red_guest_id") REFERENCES "guest_session"("guest_id") ON DELETE
            SET NULL ON UPDATE NO ACTION
        `);
    await queryRunner.query(`
            ALTER TABLE "match"
            ADD CONSTRAINT "FK_0377980133ff51ec6bd191d8acd" FOREIGN KEY ("black_guest_id") REFERENCES "guest_session"("guest_id") ON DELETE
            SET NULL ON UPDATE NO ACTION
        `);
    await queryRunner.query(`
            ALTER TABLE "move"
            ADD CONSTRAINT "FK_3bd6038b8653e2d5b94313e9c70" FOREIGN KEY ("match_id") REFERENCES "match"("match_id") ON DELETE CASCADE ON UPDATE NO ACTION
        `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            ALTER TABLE "move" DROP CONSTRAINT "FK_3bd6038b8653e2d5b94313e9c70"
        `);
    await queryRunner.query(`
            ALTER TABLE "match" DROP CONSTRAINT "FK_0377980133ff51ec6bd191d8acd"
        `);
    await queryRunner.query(`
            ALTER TABLE "match" DROP CONSTRAINT "FK_189f89d584e38c3a6549ed96bad"
        `);
    await queryRunner.query(`
            ALTER TABLE "match" DROP CONSTRAINT "FK_aaac99297c07957f6dae2ea2a7b"
        `);
    await queryRunner.query(`
            ALTER TABLE "room" DROP CONSTRAINT "FK_c5535e1c438d975a736b1966a78"
        `);
    await queryRunner.query(`
            ALTER TABLE "room_seat" DROP CONSTRAINT "FK_db1220dd9a27c97fee4effd6834"
        `);
    await queryRunner.query(`
            ALTER TABLE "room_seat" DROP CONSTRAINT "FK_d515299270069b61bb251367e6e"
        `);
    await queryRunner.query(`
            DROP INDEX "public"."uq_move_match_move_id"
        `);
    await queryRunner.query(`
            DROP TABLE "move"
        `);
    await queryRunner.query(`
            DROP TYPE "public"."actor_type"
        `);
    await queryRunner.query(`
            DROP INDEX "public"."IDX_2e60a2798e91e492c931691200"
        `);
    await queryRunner.query(`
            DROP INDEX "public"."IDX_0377980133ff51ec6bd191d8ac"
        `);
    await queryRunner.query(`
            DROP INDEX "public"."IDX_189f89d584e38c3a6549ed96ba"
        `);
    await queryRunner.query(`
            DROP TABLE "match"
        `);
    await queryRunner.query(`
            DROP TYPE "public"."end_reason"
        `);
    await queryRunner.query(`
            DROP TYPE "public"."match_status"
        `);
    await queryRunner.query(`
            DROP TYPE "public"."ai_difficulty"
        `);
    await queryRunner.query(`
            DROP TYPE "public"."game_mode"
        `);
    await queryRunner.query(`
            DROP INDEX "public"."IDX_e399ca718d86d3c31de0250e96"
        `);
    await queryRunner.query(`
            DROP INDEX "public"."IDX_b814e61dcb222ef73015714e69"
        `);
    await queryRunner.query(`
            DROP TABLE "room"
        `);
    await queryRunner.query(`
            DROP TYPE "public"."side_preference"
        `);
    await queryRunner.query(`
            DROP TYPE "public"."room_status"
        `);
    await queryRunner.query(`
            DROP INDEX "public"."uq_room_seat_guest"
        `);
    await queryRunner.query(`
            DROP TABLE "room_seat"
        `);
    await queryRunner.query(`
            DROP TYPE "public"."connection_state"
        `);
    await queryRunner.query(`
            DROP TYPE "public"."side"
        `);
    await queryRunner.query(`
            DROP INDEX "public"."IDX_b56d5a63b1f3bb49653c0e4c22"
        `);
    await queryRunner.query(`
            DROP INDEX "public"."IDX_d7bee69eb608861148702d5498"
        `);
    await queryRunner.query(`
            DROP TABLE "guest_session"
        `);
  }
}
