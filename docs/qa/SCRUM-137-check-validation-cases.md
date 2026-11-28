# Bộ ca kiểm thử chiếu tự chiếu và mặt Tướng

Task **SCRUM-137**, thuộc story **SCRUM-71 US-10 Chiếu, tự chiếu và mặt Tướng**.
Truy vết theo tiêu chí chấp nhận của story: **BR-03, BR-11, FR-09, FR-14**.

Bộ ca kiểm tra phát hiện chiếu, loại nước tự chiếu và loại nước làm hai Tướng
đối mặt. Dữ liệu đầu vào, kết quả mong đợi và kết quả thực tế nằm trong
[SCRUM-137-check-validation-cases.csv](SCRUM-137-check-validation-cases.csv).
Có **60 tình huống**, mỗi tình huống chạy cho cả Đỏ và Đen, thành **120 ca**.

Phạm vi thực hiện là gọi trực tiếp `isInCheck`, `areGeneralsFacing` và
`generateLegalMoves` của Rules Engine. Kết quả API E2E được ghi riêng và vẫn là
`Not run`; tài liệu không xác nhận backend đã tiếp nhận hoặc từ chối nước đi
qua HTTP hay Socket.IO. Luật di chuyển riêng từng quân thuộc US-09; chiếu bí,
hết nước, đồng hồ và quyền đi theo lượt không thuộc bộ ca này.

## Quy ước dữ liệu

- Tọa độ `file:rank`: cột `0..8`, hàng `0..9`, luôn nhìn từ phía Đỏ.
- Đỏ tiến theo chiều tăng hàng; Đen tiến theo chiều giảm hàng.
- Mỗi dòng CSV là một ca độc lập, bắt đầu từ bàn cờ trống.
- `side` là bên được kiểm tra. Trong ca `MOVE` và `LIST`, quân tại `from` thuộc bên này.
- `placements` chứa **toàn bộ** quân trên bàn theo dạng
  `file:rank:TYPE:SIDE`, ngăn cách bằng `;`. Không tự thêm Tướng hoặc quân khác.
  Ví dụ `4:0:GENERAL:RED;3:9:GENERAL:BLACK;4:5:CHARIOT:BLACK`.
- Loại quân dùng giá trị trong code: `GENERAL`, `ADVISOR`, `ELEPHANT`, `HORSE`,
  `CHARIOT`, `CANNON`, `SOLDIER`; màu dùng `RED` hoặc `BLACK`.
- `from` và `to` trống nếu thao tác không cần tọa độ đó.
- `expected` và `actual` là giá trị JSON. Khi đọc CSV bằng chương trình, cần
  dùng quy tắc CSV để bỏ dấu nháy bao ngoài và giải mã dấu nháy kép trước khi parse JSON.
- Ca Đen phản chiếu ca Đỏ bằng `(file, rank) → (file, 9 - rank)` và đổi màu toàn bộ
  quân. CSV đã ghi tọa độ và màu cụ thể; không phản chiếu thêm lần nữa.

Các thế cờ cô lập phục vụ kiểm tra hàm, không yêu cầu chứng minh có thể đi đến từ
thế xuất phát. Ca `FAC-02`, `CHK-18` và `LEG-17` cố ý dùng thế hai Tướng đối mặt;
ca `ERR` cố ý thiếu Tướng để kiểm tra điều kiện đầu vào. Không đưa các thế này vào
luồng tạo ván thật nếu backend không cho phép.

## Các thao tác kiểm thử

| `operation` | Thao tác                                                                     | Ý nghĩa kết quả mong đợi                                                                      |
| ----------- | ---------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| `CHECK`     | Gọi `isInCheck(board, side)`                                                 | `true` nếu Tướng bên được hỏi đang bị chiếu; `false` nếu an toàn                              |
| `FACING`    | Gọi `areGeneralsFacing(board)`                                               | `true` nếu hai Tướng cùng cột và không có quân chắn                                           |
| `MOVE`      | Lấy danh sách nước giả và nước hợp lệ cho `from`, kiểm tra có `to` hay không | `{"pseudo":true,"legal":false}` nghĩa là nước đúng cách đi nhưng bị loại ở bước an toàn Tướng |
| `LIST`      | Gọi `generateLegalMoves(board, from)`                                        | Toàn bộ tập ô đích dưới dạng mảng chuỗi `file:rank`; `[]` là không có nước                    |

Ca `MOVE` kiểm tra một nước cụ thể, không xác nhận danh sách đầy đủ. Ca `LIST`
so sánh đầy đủ tập ô đích, không phụ thuộc thứ tự. Với ca `ERR`, `expected` là
`{"error":"..."}`: phải phát sinh đúng thông báo lỗi, không được coi thiếu Tướng
là trạng thái an toàn.

## Cách thực hiện một ca

1. Chọn một dòng CSV, dựng bàn cờ mới chỉ chứa các quân trong `placements`.
2. Lưu bản sao dữ liệu đầu vào. Có thể khóa từng quân và mảng bàn cờ bằng `Object.freeze`.
3. Thực hiện thao tác trong `operation`, dùng `side`, `from`, `to` khi cần.
4. Chuẩn hóa kết quả thành JSON như cột `expected`. Với `LIST`, sắp xếp các ô đích
   trước khi so sánh; không chấp nhận ô thừa, ô thiếu, ô trùng hoặc ô ngoài bàn.
5. Kiểm tra kết quả đúng kỳ vọng và bàn cờ, quân gốc không bị thay đổi.
6. Với `MOVE`, mô phỏng thêm từng nước mà hàm trả là hợp lệ trên bản sao bàn cờ;
   xác nhận `isInCheck(nextBoard, side)` đều là `false`.
7. Ghi `actual`, `rules_status` và mã bug nếu không đạt. `e2e_status` chỉ đổi sau
   khi thực sự gửi yêu cầu qua backend và có bằng chứng request, response và trạng thái ván.

Ví dụ `LEG-14-RED`: Tướng Đỏ tại `4:0`, Tướng Đen tại `4:9`, Xe Đỏ tại `4:5`.
Nước Xe từ `4:5` đến `5:5` đúng luật Xe nhưng bỏ quân chắn cuối cùng, nên
`expected = {"pseudo":true,"legal":false}`. Với `LEG-15-RED`, Xe đi đến `4:6`
vẫn chắn cùng cột nên nước được giữ lại.

## Phát hiện chiếu

| Mã tình huống     | Mục tiêu                                                                  | Số ca gồm hai màu |
| ----------------- | ------------------------------------------------------------------------- | ----------------: |
| CHK-01            | Tướng an toàn, quân mình không được tính là quân chiếu                    |                 2 |
| CHK-02            | Xe địch chiếu trên cột trống                                              |                 2 |
| CHK-03 đến CHK-04 | Quân của bất kỳ bên nào có thể chắn đường chiếu của Xe                    |                 4 |
| CHK-05            | Xe địch chiếu theo hàng ngang                                             |                 2 |
| CHK-06            | Pháo không chiếu khi thiếu ngòi                                           |                 2 |
| CHK-07 đến CHK-08 | Pháo chiếu qua đúng một ngòi thuộc mỗi bên                                |                 4 |
| CHK-09            | Pháo không chiếu qua hai ngòi                                             |                 2 |
| CHK-10            | Mã chiếu khi chân trống                                                   |                 2 |
| CHK-11 đến CHK-12 | Quân của mỗi bên chặn chân Mã và ngăn chiếu                               |                 4 |
| CHK-13            | Tốt địch chiếu theo chiều tiến                                            |                 2 |
| CHK-14            | Tốt địch đã qua sông chiếu theo chiều ngang                               |                 2 |
| CHK-15            | Tốt không chiếu ngược chiều tiến                                          |                 2 |
| CHK-16            | Kiểm tra đúng bên được hỏi, không nhầm với Tướng đối phương đang bị chiếu |                 2 |
| CHK-17            | Phát hiện chiếu khi có hai quân tấn công đồng thời                        |                 2 |
| CHK-18            | Hai Tướng đối mặt được tính là chiếu                                      |                 2 |

## Hai Tướng đối mặt

| Mã tình huống     | Mục tiêu                                                              | Số ca gồm hai màu |
| ----------------- | --------------------------------------------------------------------- | ----------------: |
| FAC-01            | Khác cột thì không đối mặt                                            |                 2 |
| FAC-02            | Cùng cột và không có quân chắn thì đối mặt                            |                 2 |
| FAC-03 đến FAC-18 | Kiểm tra từng hàng giữa hai Tướng, lần lượt đặt quân chắn của mỗi bên |                32 |

Ca phản chiếu kiểm tra `isInCheck` cho cả hai màu trong thế đối mặt. Khi chỉ
kiểm tra `areGeneralsFacing`, quân chắn của bên nào cũng có tác dụng như nhau.

## Lọc tự chiếu và thoát chiếu

| Mã tình huống | Mục tiêu                                                            | Kỳ vọng nước đang xét |
| ------------- | ------------------------------------------------------------------- | --------------------- |
| LEG-01        | Nước Tốt không ảnh hưởng an toàn Tướng                              | Giữ                   |
| LEG-02        | Xe bị ghim đi ngang làm lộ đường chiếu                              | Loại                  |
| LEG-03        | Xe bị ghim di chuyển dọc vẫn chắn đường chiếu                       | Giữ                   |
| LEG-04        | Xe bị ghim ăn quân đang tạo đường chiếu                             | Giữ                   |
| LEG-05        | Đưa Xe vào giữa để che chiếu                                        | Giữ                   |
| LEG-06        | Đi nước không giải quyết việc đang bị chiếu                         | Loại                  |
| LEG-07        | Tướng đi vào ô bị Xe địch kiểm soát                                 | Loại                  |
| LEG-08        | Tướng chuyển sang ô an toàn                                         | Giữ                   |
| LEG-09        | Tướng ăn quân chiếu không được bảo vệ                               | Giữ                   |
| LEG-10        | Tướng ăn quân chiếu nhưng ô đích vẫn bị Xe khác tấn công            | Loại                  |
| LEG-11        | Dời một trong hai ngòi làm Pháo có đúng một ngòi chiếu Tướng        | Loại                  |
| LEG-12        | Dời ngòi duy nhất khiến Pháo không còn chiếu                        | Giữ                   |
| LEG-13        | Dời quân chắn chân Mã làm Tướng bị Mã chiếu                         | Loại                  |
| LEG-14        | Dời quân chắn cuối cùng sang ngang làm mở mặt Tướng                 | Loại                  |
| LEG-15        | Di chuyển quân chắn dọc cùng cột vẫn giữ quân giữa hai Tướng        | Giữ                   |
| LEG-16        | Tướng bước sang cột trống của Tướng đối phương                      | Loại                  |
| LEG-17        | Tướng rời cột đang đối mặt để khôi phục an toàn                     | Giữ                   |
| LEG-18        | Xe có thể tấn công ô Tướng địch nhưng không được ăn Tướng           | Loại                  |
| LEG-19        | Tướng ăn một quân đang chiếu nhưng ô đích bị Xe khác tấn công ngang | Loại                  |

Mỗi dòng có hai ca, tổng cộng **38 ca**. Các ca này đều có `pseudo = true`;
điểm cần kiểm chứng là bước kiểm tra an toàn có giữ hoặc loại đúng nước đó không.
`LEG-18` còn xác nhận quy ước Tướng bị chiếu, không bị ăn khỏi bàn.

## Danh sách nước và điều kiện đầu vào

| Mã tình huống | Mục tiêu                                                          | Số ca gồm hai màu |
| ------------- | ----------------------------------------------------------------- | ----------------: |
| LST-01        | Danh sách đầy đủ khi Tướng thoát chiếu hoặc ăn quân chiếu sát bên |                 2 |
| LST-02        | Danh sách đầy đủ của Xe là quân chắn cuối cùng giữa hai Tướng     |                 2 |
| LST-03        | Ô nguồn trống trả danh sách rỗng                                  |                 2 |
| ERR-01        | Thiếu Tướng của bên đang kiểm tra phải phát sinh lỗi              |                 2 |
| ERR-02        | Thiếu Tướng đối phương phải phát sinh lỗi                         |                 2 |

Các ca lỗi kiểm tra hợp đồng của hàm Rules Engine. Chúng không xác nhận backend
đã chuyển lỗi đó thành mã HTTP hoặc mã lỗi Socket.IO phù hợp.

## Kết quả đối chiếu Rules Engine

Ngày chạy: **2026-11-28**. Phiên bản code: **03f701e**. Build lại
`packages/shared` và `packages/rules` trước khi thực hiện từng dòng CSV.
Các kết quả mong đợi được lập trước khi gọi hàm và được lưu riêng với kết quả thực tế.

| Nhóm                              | Số tình huống | Số ca | Đạt | Không đạt |
| --------------------------------- | ------------: | ----: | --: | --------: |
| Phát hiện chiếu                   |            18 |    36 |  36 |         0 |
| Hai Tướng đối mặt                 |            18 |    36 |  36 |         0 |
| Lọc tự chiếu và thoát chiếu       |            19 |    38 |  38 |         0 |
| Danh sách đầy đủ và ô nguồn trống |             3 |     6 |   6 |         0 |
| Điều kiện có đủ hai Tướng         |             2 |     4 |   4 |         0 |
| Tổng                              |            60 |   120 | 120 |         0 |

Cả 120 ca khớp kỳ vọng, dữ liệu đầu vào không bị thay đổi. Với các ca `MOVE`,
mọi ô đích hợp lệ được trả về còn được mô phỏng lại để xác nhận Tướng bên đi an toàn.
CSV ghi `rules_status = Pass` và kết quả thực tế cho từng ca; `e2e_status = Not run`.

Đối chiếu các test có sẵn tại
[check-validation.test.ts](../../packages/rules/src/check-validation.test.ts).
Các ca CSV tách riêng từng tình huống và từng màu; chúng không tương ứng một đối một
với số test của Vitest vì một test có thể chứa nhiều kiểm tra.

Bộ test có sẵn cũng đạt **126 trên 126 test**, gồm **44 test** trong
`check-validation.test.ts`. Không cộng số ca CSV và số test Vitest vì hai bộ có
phạm vi chồng lặp.

## Chạy lại và ghi nhận lỗi

Lưu lại kết quả lần trước trước khi chạy lại. Với mỗi lần chạy, ghi ngày, commit,
đầu vào, kết quả mong đợi, kết quả thực tế và mã bug nếu không đạt.
Không đổi cột `expected` theo kết quả code chỉ để ca kiểm thử đạt.

Để chạy bộ test Rules Engine có sẵn trên Windows:

```powershell
pnpm.cmd --filter @xiangqi/rules test
```

Khi chuyển sang E2E, giữ lại mục tiêu của từng ca nhưng tuân theo cách dựng ván,
lượt đi và hợp đồng của API thật. Ghi riêng kết quả backend cho phép hoặc từ chối,
trạng thái bàn cờ sau thao tác và khả năng bảo toàn trạng thái khi từ chối nước đi.
