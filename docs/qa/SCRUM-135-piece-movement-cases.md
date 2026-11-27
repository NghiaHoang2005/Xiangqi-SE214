# Bộ ca kiểm thử luật di chuyển cho 7 loại quân

Task **SCRUM-135**, thuộc story **SCRUM-70 US-09 Sinh nước đi cho 7 loại quân**.
Truy vết theo tiêu chí chấp nhận của story: **BR-03 đến BR-10**.

Bộ ca kiểm tra nước giả hợp lệ của từng quân: cách di chuyển, vật cản, ăn quân,
cửu cung và sông. Dữ liệu chi tiết và kết quả nằm trong
[SCRUM-135-piece-movement-cases.csv](SCRUM-135-piece-movement-cases.csv).
Có **54 tình huống**, mỗi tình huống chạy với cả Đỏ và Đen, thành **108 ca**.

Phạm vi hiện tại là kiểm thử luật qua `generatePseudoLegalMoves(board, from)`.
Kiểm tra tự chiếu, mặt Tướng và thoát chiếu thuộc US-10. Các kết quả bên dưới
không xác nhận HTTP hoặc Socket.IO E2E; việc chạy qua API cần hợp đồng và handler
nhận nước đi của backend.

## Quy ước dữ liệu

- Tọa độ `file:rank`: cột `0..8`, hàng `0..9`, luôn nhìn từ phía Đỏ.
- Đỏ tiến theo chiều tăng hàng; Đen tiến theo chiều giảm hàng.
- Cửu cung: cột `3..5`, hàng `0..2` cho Đỏ và `7..9` cho Đen.
- Đỏ qua sông tại hàng `5..9`; Đen qua sông tại hàng `0..4`.
- Mỗi ca bắt đầu từ bàn cờ trống. Đặt quân có loại `piece`, màu `side` tại `from`.
- `occupants` liệt kê các quân bổ sung theo dạng `file:rank:friend` hoặc
  `file:rank:enemy`, ngăn cách bằng `;`. `friend` là cùng màu với quân đang xét;
  `enemy` là màu còn lại. Các quân bổ sung dùng loại `SOLDIER` vì bộ sinh nước
  chỉ cần xét ô có quân và màu của quân chắn hoặc quân đích.
- `occupants` trống nghĩa là không có quân bổ sung. Các ô không được liệt kê đều trống.
- `expected_destinations` là **toàn bộ** tập ô đích, ngăn cách bằng `;`.
  Ô trống trong cột này nghĩa là danh sách nước đi phải rỗng.
- So sánh tập ô đích, không phụ thuộc thứ tự trả về; không chấp nhận ô thừa, ô thiếu
  hoặc ô trùng.
- Các ca Đen phản chiếu ca Đỏ bằng `(file, rank) → (file, 9 - rank)` và đổi màu
  các quân. CSV đã chứa tọa độ cụ thể cho từng màu, không cần tự phản chiếu lại.

Đây là các thế cờ cô lập để kiểm tra luật từng quân, không phải thế cờ đầy đủ của
một ván đang chơi. Khi chuyển sang E2E, cần thêm hai Tướng, lượt đi, người chơi và
trạng thái ván hợp lệ; kiểm tra lại rằng những quân bổ sung không làm thay đổi
tình huống cần kiểm thử.

## Cách thực hiện một ca

1. Đọc một dòng CSV và khởi tạo bàn cờ mới theo quy ước trên.
2. Đặt quân đang xét và các quân trong `occupants`.
3. Lưu bản sao trạng thái trước khi gọi hàm.
4. Gọi `generatePseudoLegalMoves(board, from)` và ghi toàn bộ ô đích thực tế.
5. So sánh kết quả với `expected_destinations`; kiểm tra không có ô ngoài bàn
   hoặc ô trùng.
6. Kiểm tra bàn cờ và các quân gốc không bị thay đổi. Khi có quân địch ở ô đích,
   ô đó được đưa vào danh sách có thể ăn; hàm sinh nước không thực hiện ăn quân.
7. Điền `actual_destinations` và `rules_status`. Nếu chạy qua backend ở lần sau,
   ghi kết quả E2E riêng vào `e2e_status` và bổ sung bằng chứng request, response
   cùng trạng thái ván trước và sau thao tác.

Ví dụ `HOR-04-RED`: Mã Đỏ tại `4:4`, quân Đỏ chắn chân tại `5:4`.
Kết quả phải có đúng `2:3;2:5;3:2;3:6;5:2;5:6`, không có `6:3` hoặc `6:5`.
Ca `HOR-04-BLACK` dùng Mã Đen tại `4:5`, quân Đen tại `5:5` và tập ô đích đã
phản chiếu trong CSV.

## Tướng

| Mã tình huống     | Mục tiêu                                              | Số ca gồm hai màu |
| ----------------- | ----------------------------------------------------- | ----------------: |
| GEN-01            | Đi một ô ngang hoặc dọc, không đi chéo                |                 2 |
| GEN-02 đến GEN-03 | Không vượt biên trái, phải, sau và trước của cửu cung |                 4 |
| GEN-04            | Loại ô có quân mình, cho phép ăn quân địch            |                 2 |
| GEN-05            | Không có nước khi bốn ô xung quanh đều có quân mình   |                 2 |

Đối chiếu tự động: [general.test.ts](../../packages/rules/src/general.test.ts).

## Sĩ

| Mã tình huống     | Mục tiêu                                   | Số ca gồm hai màu |
| ----------------- | ------------------------------------------ | ----------------: |
| ADV-01            | Đi một ô chéo, không đi ngang hoặc dọc     |                 2 |
| ADV-02 đến ADV-05 | Kiểm tra riêng cả bốn góc cửu cung         |                 8 |
| ADV-06            | Loại ô có quân mình, cho phép ăn quân địch |                 2 |

Đối chiếu tự động: [advisor.test.ts](../../packages/rules/src/advisor.test.ts).

## Tượng

| Mã tình huống     | Mục tiêu                                                 | Số ca gồm hai màu |
| ----------------- | -------------------------------------------------------- | ----------------: |
| ELE-01            | Đi đúng hai ô chéo theo bốn hướng khi mắt trống          |                 2 |
| ELE-02 đến ELE-09 | Mỗi mắt bị chặn lần lượt bởi quân mình và quân địch      |                16 |
| ELE-10            | Không qua sông                                           |                 2 |
| ELE-11            | Không ra ngoài bàn                                       |                 2 |
| ELE-12            | Loại ô có quân mình, cho phép ăn quân địch khi mắt trống |                 2 |

Đối chiếu tự động: [elephant.test.ts](../../packages/rules/src/elephant.test.ts).

## Mã

| Mã tình huống     | Mục tiêu                                                      | Số ca gồm hai màu |
| ----------------- | ------------------------------------------------------------- | ----------------: |
| HOR-01            | Có đủ tám ô theo hình chữ L khi chân trống                    |                 2 |
| HOR-02 đến HOR-09 | Chặn từng chân trái, phải, sau và trước bằng quân của mỗi bên |                16 |
| HOR-10            | Ở góc bàn chỉ còn hai ô đích                                  |                 2 |
| HOR-11            | Loại ô có quân mình, cho phép ăn quân địch khi chân trống     |                 2 |

Đối chiếu tự động: [horse.test.ts](../../packages/rules/src/horse.test.ts).

## Xe

| Mã tình huống | Mục tiêu                                                                  | Số ca gồm hai màu |
| ------------- | ------------------------------------------------------------------------- | ----------------: |
| CHA-01        | Đi ngang và dọc đủ bốn hướng đến biên khi đường trống                     |                 2 |
| CHA-02        | Dừng trước quân mình, ăn quân địch đầu tiên rồi dừng, không nhảy qua quân |                 2 |
| CHA-03        | Không có nước khi bị quân mình chặn sát góc                               |                 2 |
| CHA-04        | Ăn quân địch đứng sát, không vượt qua quân vừa ăn                         |                 2 |

Đối chiếu tự động: [chariot.test.ts](../../packages/rules/src/chariot.test.ts).

## Pháo

| Mã tình huống     | Mục tiêu                                                                 | Số ca gồm hai màu |
| ----------------- | ------------------------------------------------------------------------ | ----------------: |
| CAN-01            | Đi thường trên đường trống, không cần ngòi                               |                 2 |
| CAN-02            | Không ăn khi thiếu ngòi, không đứng lên ngòi hoặc ô trống sau ngòi       |                 2 |
| CAN-03 đến CAN-04 | Ăn qua đúng một ngòi thuộc bất kỳ bên nào, kiểm tra bốn hướng            |                 4 |
| CAN-05            | Không ăn quân mình ở sau ngòi hoặc nhảy tiếp qua quân đó                 |                 2 |
| CAN-06            | Ngòi sát Pháo và mục tiêu sát ngòi vẫn cho phép ăn                       |                 2 |
| CAN-07            | Chỉ ăn mục tiêu đầu tiên sau một ngòi, không ăn mục tiêu xa sau hai quân |                 2 |

Đối chiếu tự động: [cannon.test.ts](../../packages/rules/src/cannon.test.ts).

## Tốt

| Mã tình huống     | Mục tiêu                                                     | Số ca gồm hai màu |
| ----------------- | ------------------------------------------------------------ | ----------------: |
| SOL-01            | Trước sông chỉ tiến một ô                                    |                 2 |
| SOL-02            | Ở bờ gần chưa được đi ngang, bước tiến đưa Tốt qua sông      |                 2 |
| SOL-03            | Ngay sau sông được tiến và đi ngang, không được lùi          |                 2 |
| SOL-04 đến SOL-05 | Hàng cuối và biên trái hoặc phải chỉ còn một ô ngang         |                 4 |
| SOL-06            | Không đi vào quân mình, có thể ăn quân địch theo chiều ngang |                 2 |
| SOL-07            | Có thể ăn quân địch phía trước khi chưa qua sông             |                 2 |
| SOL-08            | Không có nước nếu bị quân mình chặn trước sông               |                 2 |
| SOL-09            | Giữa hàng cuối chỉ còn hai ô ngang                           |                 2 |

Đối chiếu tự động: [soldier.test.ts](../../packages/rules/src/soldier.test.ts).

## Kết quả đối chiếu Rules Engine

Ngày chạy: **2026-11-27**. Phiên bản code: **03f701e**. Dùng bản build từ
`packages/shared` và `packages/rules`, gọi trực tiếp `generatePseudoLegalMoves`
cho từng dòng CSV. Các kỳ vọng được lập trước khi gọi hàm.

| Nhóm  | Số tình huống | Số ca | Đạt | Không đạt |
| ----- | ------------: | ----: | --: | --------: |
| Tướng |             5 |    10 |  10 |         0 |
| Sĩ    |             6 |    12 |  12 |         0 |
| Tượng |            12 |    24 |  24 |         0 |
| Mã    |            11 |    22 |  22 |         0 |
| Xe    |             4 |     8 |   8 |         0 |
| Pháo  |             7 |    14 |  14 |         0 |
| Tốt   |             9 |    18 |  18 |         0 |
| Tổng  |            54 |   108 | 108 |         0 |

Trong cả 108 ca, toàn bộ tập ô đích khớp kỳ vọng, không có ô trùng hoặc ngoài bàn,
và dữ liệu đầu vào giữ nguyên khi khóa cả mảng bàn cờ lẫn từng quân bằng `Object.freeze`.
CSV ghi `rules_status = Pass` và kết quả thực tế riêng cho từng ca;
`e2e_status = Not run` vì chưa thực hiện qua API.

Bộ test tự động có sẵn cũng đạt **126 trên 126 test**, chạy bằng:

```powershell
pnpm.cmd --filter @xiangqi/rules test
```

Số 108 là số dòng dữ liệu QA đã đối chiếu trực tiếp; số 126 là số test của toàn bộ
Rules Engine, gồm cả mô hình bàn cờ, FEN, hash và kiểm tra chiếu. Hai số đo này có
phạm vi chồng lặp và không được cộng thành tổng số test độc lập.

## Ghi nhận lỗi và chạy lại

Nếu một ca không đạt, ghi mã ca, phiên bản code, đầu vào, tập ô đích thực tế,
tập ô đích mong đợi và mã bug. Với lần chạy mới, lưu lại bản kết quả của lần trước,
xóa kết quả thực tế và đưa trạng thái về `Not run` trước khi kiểm tra lại.
Chỉ đánh dấu E2E đạt sau khi thực sự gửi yêu cầu qua backend và kiểm tra trạng thái ván.
