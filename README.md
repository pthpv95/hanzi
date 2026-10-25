# Hanzi · Tiếng Trung đời thường

Website học cách nói tiếng Trung cho người Việt, tập trung vào tình huống thực tế thay vì học các bản dịch rời rạc. Dùng **tiếng Phổ thông (Quan thoại)** và **chữ giản thể**.

## Chạy trên máy

Yêu cầu Node.js 20.9 trở lên.

```bash
npm install
npm run dev
```

Mở [http://localhost:3000](http://localhost:3000).

```bash
npm test          # Kiểm tra tìm kiếm, lịch ôn, tiến độ và cấu trúc câu hỏi
npm run typecheck
npm run build
npm start        # Chạy bản production sau khi build
```

## Những gì có trong phiên bản đầu

- **48 cách nói**, chia thành 8 chủ đề: giao tiếp, đời sống, ăn uống, du lịch, công việc, cảm xúc, mua sắm và bạn bè.
- Mỗi cụm có chữ Hán, pinyin, nghĩa tiếng Việt, tình huống sử dụng, lưu ý sắc thái và hội thoại hai lượt.
- **144 tệp âm thanh Quan thoại** đi kèm: 48 cụm và 96 câu hội thoại. Nghe bình thường hoặc chậm 0.75×. Không cần API key hay dịch vụ TTS khi chạy.
- Tìm bằng chữ Hán, pinyin có hoặc không dấu, pinyin số thanh điệu và tiếng Việt không dấu. Ví dụ: `没关系`, `meiguanxi`, `mei2 guan1 xi5`, `khong sao`.
- Lọc theo chủ đề, cấp độ và danh sách đã lưu.
- Flashcard hai chiều Trung → Việt và Việt → Trung. Thẻ đến hạn xuất hiện trước các cụm mới.
- Ba chế độ luyện tập: chọn nghĩa, nghe và hiểu, chọn câu cho tình huống. Mỗi lượt gồm 10 câu khác nhau và có giải thích ngay sau khi trả lời.
- Mục tiêu 5/10/15/20 cụm mỗi ngày, chuỗi ngày học và hoạt động 7 ngày gần nhất. Mỗi cụm chỉ được tính một lần vào mục tiêu trong ngày.
- Giao diện điện thoại và máy tính, chế độ tối, tùy chọn ẩn pinyin và hướng dẫn thanh điệu cho người mới.

## Cách lưu tiến độ và ôn tập

Tiến độ được lưu trong `localStorage`, khóa `hanzi-vietnamese-v1`. Chưa có tài khoản hoặc đồng bộ thiết bị. Xóa dữ liệu trình duyệt sẽ xóa tiến độ tại đó. Ngày học tính theo giờ địa phương của thiết bị.

Lịch ôn đơn giản theo mức tự đánh giá:

| Đánh giá | Lần đầu | Những lần tiếp theo                     |
| -------- | ------- | --------------------------------------- |
| Chưa nhớ | 10 phút | 10 phút, đặt lại số lần nhớ             |
| Hơi khó  | 1 ngày  | Khoảng cách trước × 1.2, ít nhất 1 ngày |
| Đã nhớ   | 3 ngày  | Khoảng cách trước × 2, ít nhất 3 ngày   |
| Rất dễ   | 7 ngày  | Khoảng cách trước × 2.5, ít nhất 7 ngày |

Trả lời sai trong luyện tập đưa cụm vào lịch ôn sau 10 phút; trả lời đúng dùng mức “Đã nhớ”. Đây là lịch ôn cơ bản, chưa triển khai FSRS hay chấm phát âm.

## Nội dung và âm thanh

- `src/data/expressions.ts`: dữ liệu học, chủ đề và nhãn cấp độ. Cấp độ “Nhập môn / Giao tiếp / Tự nhiên” là cách tổ chức của thư viện, không phải nhãn HSK.
- `src/lib/learning.ts`: tìm kiếm, lịch ôn, xử lý dữ liệu lưu và tạo câu hỏi.
- `src/components/`: các màn hình, hội thoại, điều khiển audio và dialog.
- `src/app/globals.css`: thiết kế và các breakpoint responsive.
- `public/audio/`: audio AAC trong tệp M4A, được tổng hợp bằng giọng Quan thoại Tingting qua công cụ `say` trên macOS. Các tệp đã được tạo sẵn và hoạt động trên mọi máy chủ hỗ trợ tệp tĩnh.

Pinyin thể hiện biến điệu của 一, 不 và nhiều âm nhẹ. Thanh 3 giữ dấu gốc; khi đọc liền cần nghe cả câu. Bản thu là giọng tổng hợp, không phải bản thu của giáo viên.

Để thêm một cụm, thêm mục dữ liệu có `id` duy nhất rồi bổ sung audio theo tên:

```text
public/audio/<id>.m4a      # Cụm từ
public/audio/<id>-0.m4a    # Lượt thoại A
public/audio/<id>-1.m4a    # Lượt thoại B
```

Nếu đang dùng macOS có giọng Tingting và FFmpeg, có thể tạo những tệp còn thiếu bằng:

```bash
npm run generate-audio
```

Script này chỉ cần khi biên soạn nội dung; không cần cho `npm install`, build hoặc triển khai. Nếu không tải được bản thu, ứng dụng thử dùng giọng `zh-CN` có sẵn trên thiết bị, rồi báo lỗi rõ ràng nếu vẫn không phát được.

## Triển khai

Dự án dùng **Next.js App Router, React, TypeScript và Lucide**. Có thể đưa repo lên Vercel với preset Next.js và lệnh build `npm run build`. Thư viện và các bài luyện tập tĩnh không cần biến môi trường; lớp học AI cần cấu hình bên dưới. Các tệp audio trong `public/` được phục vụ cùng website.

Phiên bản này được xây dựng để chạy tại thư mục dự án; chưa được xuất bản lên một địa chỉ công khai.

## Lớp học AI · Tiểu Lâm

Mở **Lớp học AI** trong menu, hoặc `/#classroom`. Lớp học dùng Gemini 3.8 Live qua kết nối WebSocket trực tiếp từ trình duyệt: micro luôn có thể gửi âm thanh trong khi gia sư nói, và tín hiệu ngắt lời sẽ hủy hàng đợi âm thanh đang phát.

### Kết nối lần đầu

1. Thêm API key có quyền truy cập Gemini Live và bật thanh toán vào `.env.local` tại thư mục gốc. Giữ key trên máy chủ, không dùng biến `NEXT_PUBLIC_`.
2. Đặt `TUTOR_ACCESS_CODE` dài ít nhất 12 ký tự. Tệp `.env.local` được tạo lúc phát triển đã có mã lớp ngẫu nhiên; nếu dùng `.env.example`, hãy tự đặt mã riêng.
3. Khởi động lại máy chủ. Có thể dùng `npm run dev -- --port 3001` nếu cổng 3000 đang bận.
4. Trong lớp, chọn **Kiểm tra lại kết nối**, nhập mã lớp, rồi chọn **Vào lớp trò chuyện**. Trình duyệt cần HTTPS hoặc localhost và quyền micro.

```dotenv
GEMINI_API_KEY=your_private_key
TUTOR_ACCESS_CODE=your_private_classroom_code
```

Không đưa `.env.local` lên Git. Khi triển khai, đặt hai giá trị trong Environment Variables của nhà cung cấp hosting. Tệp `.env.example` chỉ là mẫu và không chứa khóa thật.

### Hành vi

- Tiểu Lâm hướng dẫn kiên nhẫn, tôn trọng cách diễn đạt và nhịp học của từng người: trả lời câu hỏi trước khi tiếp tục tình huống, đổi cách giải thích khi cần, khuyến khích cụ thể và chỉ sửa một lỗi rõ ràng mỗi lượt. Người học có thể hỏi lại, chuyển chủ đề hoặc bỏ qua việc nói thử; câu đúng nhưng khác cách diễn đạt không bị xem là lỗi.
- Tiểu Lâm là avatar 2D SVG: chớp mắt, nghiêng đầu lắng nghe và cử động miệng theo âm lượng gia sư đang phát. Chạm hoặc dùng Enter/Space để chào và nhận một cái vẫy tay; thao tác này không gọi AI hay mở micro. Hỗ trợ chế độ tối, điện thoại và giảm chuyển động. Cử động miệng dựa trên âm lượng, chưa đồng bộ theo từng âm tiết.
- Sáu tình huống: ăn uống, gặp gỡ, hỏi đường, công sở, đời sống và trò chuyện tự do; mỗi buổi 5 hoặc 10 phút.
- Âm thanh PCM 16-bit được gửi thành các đoạn 40 ms bằng AudioWorklet. Đầu ra 24 kHz được xếp lịch phát bằng Web Audio và xóa ngay khi có ngắt lời.
- Phụ đề tiếng nói đầu vào/đầu ra; bản tạm có thể được sửa khi câu kết thúc. Phụ đề của lời bị ngắt được đánh dấu vì chữ có thể đã được tạo trước phần âm thanh thực sự được nghe.
- Micro có thể tắt/bật riêng. **Tắt micro không đóng kết nối**; dùng nút Kết thúc để kết thúc buổi học và chi phí liên quan đến kết nối.
- Gợi ý câu nói từ thư viện, lưu bookmark, yêu cầu nói chậm/nói lại/giải thích tiếng Việt và nhắn chữ trong buổi học.
- Ghi chú sửa câu do mô hình gửi qua công cụ `give_feedback`; không tạo điểm phát âm giả từ bản chép lời. Có thể tải hội thoại và ghi chú thành tệp văn bản. Hanzi không ghi/lưu âm thanh micro; transcript chỉ ở bộ nhớ trang cho đến khi tải về.
- Rời màn hình lớp, đóng trang, hết giờ hoặc ngắt kết nối đều dừng micro, hàng đợi phát và kết nối.

### Mục tiêu chi phí và giới hạn

Mục tiêu là **$0.20–$0.30 cho 10 phút**, chưa gồm hosting. Kiểm tra trực tiếp bằng các câu nói tổng hợp đã nhận được âm thanh, phụ đề, tín hiệu ngắt lời và usage từ Gemini; một lượt kiểm tra ngắn báo khoảng **$0.0022** phí mô hình. Chưa có benchmark buổi học đủ 10 phút, nên không suy ra chi phí buổi học dài từ con số này và không cam kết mọi buổi học sẽ nằm trong mục tiêu.

- Máy chủ giới hạn câu trả lời ở 320 token và nén lịch sử khi đạt 2.048 token, giữ cửa sổ mục tiêu 1.024 token.
- Token kết nối chỉ dùng một lần; thời gian mở phiên mới 60 giây, thời gian gửi thông điệp là thời lượng buổi học cộng 30 giây. Mô hình và cấu hình được ràng buộc trong token.
- Đồng hồ trên trình duyệt dừng sau thời lượng đã chọn. Bộ ước tính theo số token/loại dữ liệu và mức sàn âm thanh sẽ dừng gần **$0.25 cho 10 phút** hoặc **$0.125 cho 5 phút**, để chừa khoảng dự phòng.
- Usage của Live API có thể đến trễ. Bộ ước tính là công cụ theo dõi, **không phải giới hạn hóa đơn cứng của Google**. Cần so sánh usage và hóa đơn từ các buổi học thật, nhất là cách metadata được gửi quanh thời điểm kết thúc lượt.
- Giá đang dùng: input text $0.75/M token, input audio $3/M, output text $4.50/M, output audio $12/M. Kiểm tra lại [giá chính thức](https://ai.google.dev/gemini-api/docs/pricing) khi đổi mô hình hoặc mức giá.

Endpoint cấp token kiểm tra cùng origin, mã lớp, kích thước yêu cầu, và có cooldown 60 giây / tối đa 6 lần cấp token mỗi giờ cho mỗi địa chỉ IP. Bộ đếm hiện ở bộ nhớ tiến trình, phù hợp **thử nghiệm lớp riêng có mã truy cập**. Trước khi mở cho công chúng hoặc chạy nhiều serverless instance, cần đăng nhập, bộ đếm/hạn mức dùng chung trên máy chủ và quản lý quota phù hợp; bộ đếm bộ nhớ không phải hạn mức chi tiêu toàn hệ thống.

### Kiểm tra

`npm test` kiểm tra lịch học cũ và logic mới, gồm bảo vệ endpoint, ràng buộc token, cập nhật phụ đề, ước tính chi phí, điều kiện dừng và định dạng âm thanh AudioWorklet. Không gọi dịch vụ AI trả phí.

Để chạy kiểm tra tích hợp **có tính phí**, với máy chủ đang chạy ở cổng 3001 và FFmpeg đã cài:

```bash
npm run test:tutor-live
```

Script dùng các câu nói tổng hợp có sẵn trong dự án, không dùng micro thật; kiểm tra audio trả về, phụ đề và ngắt lời trong một phiên tối đa khoảng 25 giây. Nó không in khóa/mã truy cập. Nếu thiếu key, script dừng trước mọi request tới nhà cung cấp. Có thể đổi cổng bằng `TUTOR_BASE_URL=http://localhost:3000 npm run test:tutor-live`.

Tài liệu API: [Live capabilities](https://ai.google.dev/gemini-api/docs/live-api/capabilities), [ephemeral tokens](https://ai.google.dev/gemini-api/docs/live-api/ephemeral-tokens), [quản lý phiên](https://ai.google.dev/gemini-api/docs/live-api/session-management), [chi phí lịch sử và transcription](https://ai.google.dev/gemini-api/docs/live-api/best-practices#pricing-and-billing).
# hanzi
