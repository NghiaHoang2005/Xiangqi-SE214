# Xiangqi-SE214 — Nền tảng Cờ Tướng Trực Tuyến

Đồ án SE214, Nhóm 06. Ứng dụng web chơi cờ tướng 1v1 với bạn qua phòng riêng, chơi với máy, và đấu xếp hạng tính Elo.
Đặc tả: `SRS-SE214-XQ-01`.

## Cấu trúc

```
apps/
  server/      NestJS + Socket.IO — nguồn trạng thái chuẩn (luật, đồng hồ, AI, lưu ván)
  web/         React + TypeScript + Vite
packages/
  rules/       Rules Engine cờ tướng, dùng chung server (kiểm tra nước) và web (gợi ý nước)
  shared/      Tên sự kiện Socket.IO, mã lỗi, hằng số baseline (SRS 9.3, 9.4, 14)
docker-compose.yml   PostgreSQL + server + web
```

## Yêu cầu

- Node.js 22 trở lên
- pnpm 10: `corepack enable` (đi kèm Node) hoặc `npm i -g pnpm`
- Docker (để chạy PostgreSQL hoặc cả hệ thống)

## Chạy khi phát triển

```bash
pnpm install
pnpm build                 # build packages/shared và packages/rules lần đầu
cp .env.example .env
docker compose up -d db    # chỉ bật PostgreSQL
pnpm dev                   # server :3000, web :5173 (web tự proxy /api và /socket.io sang server)
```

Mở http://localhost:5173. Sửa code trong `packages/*` thì chạy lại `pnpm build` (hoặc `pnpm --filter @xiangqi/rules build`).

## Chạy toàn bộ bằng Docker (demo)

```bash
cp .env.example .env
docker compose up --build
```

Web: http://localhost:8080 · API: http://localhost:3000/api/health

## Lệnh thường dùng

| Lệnh                                         | Việc                                          |
| -------------------------------------------- | --------------------------------------------- |
| `pnpm lint`                                  | ESLint toàn repo                              |
| `pnpm format`                                | Prettier định dạng lại code                   |
| `pnpm build`                                 | Build tất cả package và app                   |
| `pnpm typecheck`                             | Kiểm tra type (cần `pnpm build` trước)        |
| `pnpm test`                                  | Chạy test (Vitest)                            |
| `pnpm --filter @xiangqi/rules test:coverage` | Coverage Rules Engine (mục tiêu ≥80%, NFR-14) |

## Quy trình làm việc

- Mỗi story Jira một nhánh: `feature/XQ-<số>-<mô-tả-ngắn>`, sửa lỗi dùng `fix/XQ-<số>-...`.
- Commit message, comment trong code, mô tả PR viết bằng **tiếng Anh**. Riêng chữ hiển thị trên giao diện vẫn là tiếng Việt (FR-25).
- Commit theo [Conventional Commits](https://www.conventionalcommits.org/) và có mã Jira: `feat(server): validate state version on SubmitMove (XQ-20)`. Loại hay dùng: `feat`, `fix`, `chore`, `test`, `docs`, `refactor`. Jira sẽ tự hiện commit/PR trong issue nếu đã kết nối GitHub.
- Mở PR vào `main`, CI phải xanh và có ít nhất 1 review. Người review tự động theo `.github/CODEOWNERS`.
- Đổi tên sự kiện, payload hay mã lỗi thì sửa trong `packages/shared` để FE và BE cùng thấy.
- Không commit `.env` hay bất kỳ secret nào.
