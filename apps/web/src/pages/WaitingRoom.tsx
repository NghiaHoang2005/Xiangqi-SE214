import type { RoomView } from '@xiangqi/shared';

// Stand-in until US-15 builds the waiting room; RoomPage keeps `room` current.
export function WaitingRoom({ room }: { room: RoomView }) {
  return (
    <section className="page">
      <h1>Phòng chờ</h1>
      <p>
        Mã phòng: <strong>{room.joinCode}</strong> · {room.seats.length}/2 người chơi
      </p>
      <p className="muted">Màn hình đang được xây dựng (US-15).</p>
    </section>
  );
}
