# Kiểm tra bản 2.0.0

## Lỗi nâng cấp

Đối chiếu bộ cài 1.3.0 tải từ GitHub và mã SHA-256 xác nhận dashboard và module công việc đã nằm trong payload. Tuy nhiên, bộ cài NSIS mặc định chỉ tìm tiến trình trong thư mục cài đặt. Bản portable 1.0.0 ở thư mục khác vẫn chạy nền, giữ khóa một phiên và khiến mở app quay về bản cũ.

Bản mới kiểm tra tiến trình Task Reminder trong phiên Windows hiện tại, hỏi đóng bản cũ và sao lưu dữ liệu trước khi nâng cấp. Chế độ silent dừng cài nếu bản cũ còn chạy. Cài đặt trong app hiển thị phiên bản, đường dẫn và mã build để đối chiếu.

## Kết quả kiểm tra ngày 16/11/2026

- 19 kiểm thử đơn vị thành công, gồm kiểm tra không clone/ghi dữ liệu khi chưa đến lịch.
- Kiểm thử Chrome và Electron: biểu mẫu, lịch nhắc, dashboard, công việc, lưu sau khởi động lại, nhắc bù và xóa lịch một lần sau khi tắt popup.
- Windows Task Scheduler thực sự mở app từ trạng thái đã thoát để nhận lịch thử; lịch thử được dọn sau kiểm tra.
- Giải nén chính bộ cài 2.0.0 sang đường dẫn tiếng Việt mới, đối chiếu toàn bộ file nguồn và chạy với PATH chỉ chứa Windows.
- Cài nâng cấp thực tế thành công, mã build và các file icon trong bản cài khớp mã nguồn. Dữ liệu người dùng giữ nguyên từng byte ngay sau nâng cấp.
- Bản đã cài được chạy lại; Windows Task Scheduler trỏ đến chương trình mới.
- Wallpaper không còn trong payload. Icon checkbox kính xanh dương–trắng có 8 kích thước.

## Hiệu năng và giới hạn

Loại bỏ blur dư trên Acrylic, giảm khúc xạ xuống vùng viền, bỏ chromatic blur, gộp refresh và dừng cập nhật UI khi ẩn. Bộ kiểm tra lịch bỏ qua clone và ghi JSON nếu chưa đến hạn.

Đã đo chuyển tab, kéo thanh và trạng thái ẩn trên máy hiện tại. Vẫn có khung hình chậm trong phép đo tự động; không cam kết FPS trên phần cứng khác. Chưa thử máy vật lý thứ hai, chu kỳ gỡ cài đầy đủ, tắt nguồn vật lý hoặc đăng nhập lại thực tế. Bộ cài chưa ký số.
