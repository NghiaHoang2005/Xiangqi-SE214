import { Link } from 'react-router-dom';
import { paths } from '../routes';
import { PlaceholderPage } from './PlaceholderPage';

// UI text is Vietnamese (FR-25). Each placeholder names the story that replaces it.

export { HomePage } from './HomePage';

export const RoomPage = () => (
  <PlaceholderPage
    title="Phòng chờ"
    description="Link và mã phòng, hai ghế Đỏ/Đen, cấu hình đồng hồ."
    story="US-15"
  />
);

export const AiSetupPage = () => (
  <PlaceholderPage
    title="Chơi với máy"
    description="Chọn phe, đồng hồ và độ khó Dễ/Vừa/Khó."
    story="US-33"
  />
);

export { MatchPage } from './MatchPage';

export const HistoryPage = () => (
  <PlaceholderPage
    title="Lịch sử ván"
    description="Các ván đã chơi trong 30 ngày, theo chế độ và kết quả."
    story="US-35"
  />
);

export const ReplayPage = () => (
  <PlaceholderPage
    title="Xem lại ván"
    description="Tua lại ván theo từng nước, bàn chỉ đọc."
    story="US-36"
  />
);

export const LoginPage = () => (
  <PlaceholderPage
    title="Đăng nhập"
    description="Đăng nhập hoặc đăng ký bằng email để đấu xếp hạng."
    story="US-38, US-39"
  />
);

export const RankedPage = () => (
  <PlaceholderPage
    title="Đấu xếp hạng"
    description="Elo hiện tại, tìm trận và hủy tìm, đồng hồ 10+5."
    story="US-41"
  />
);

export const LeaderboardPage = () => (
  <PlaceholderPage
    title="Bảng xếp hạng"
    description="Thứ hạng, nickname, Elo và số trận."
    story="US-44"
  />
);

export const NotFoundPage = () => (
  <section className="page">
    <h1>Không tìm thấy trang</h1>
    <p>
      Đường dẫn không tồn tại. <Link to={paths.home}>Về trang chủ</Link>
    </p>
  </section>
);
