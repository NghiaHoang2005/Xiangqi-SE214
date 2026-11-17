import { sha256 } from '@noble/hashes/sha2';
import { bytesToHex, utf8ToBytes } from '@noble/hashes/utils';
import { toFen } from './fen';
import type { Position } from './position';

/**
 * SHA-256 of the position's FEN as 64 lowercase hex chars (Move.state_hash).
 * Equal pieces on equal squares with the same side to move give the same hash, so the
 * server and both clients can compare hashes to check they hold the same board (NFR-06).
 */
export function stateHash(position: Position): string {
  return bytesToHex(sha256(utf8ToBytes(toFen(position))));
}
