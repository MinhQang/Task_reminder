# Thiết kế Task Reminder 1.2

Màn hình quản lý và popup dùng chung token trong `src/ui/styles.css`: nền kem #f8f9f5, xanh lá #285747, chữ chính #26362e, chữ phụ #66736a; Segoe UI cục bộ, góc bo và phân cấp chữ rõ ràng.

Popup mới thay giao diện cyberpunk bằng thẻ kem viền nhạt, biểu tượng chuông trên nền xanh dịu và thanh kéo xanh lá. Núm tròn trắng 26px có viền xanh, vùng tương tác 44px; thanh luôn cân giữa và đứng yên trong khi nội dung bị ăn mòn. Hai ngôi sao nối vào hai đầu thanh. Màn hình hiện tại có lớp tối để tập trung vào lời nhắc.

Hiệu ứng nhiễu xuất hiện kéo dài 2 giây, không nhấp nháy toàn màn hình. Kéo sang phải tạo mặt nạ ăn mòn theo tiến độ; thả sớm phục hồi trong 300ms. Chế độ giảm chuyển động bỏ nhiễu động và chuyển động ngang. Popup chỉ xử lý khi thanh tới 100%; Escape không hoàn thành công việc.

Ngày giờ là ô text có label và định dạng rõ ràng, hỗ trợ nhập trực tiếp, nút tăng/giảm hoặc phím mũi tên theo phần đang chọn. Các trường không hợp lệ giữ nguyên dữ liệu để sửa.

## Nguồn tham khảo ban đầu

- [UI UX Pro Max](https://github.com/nextlevelbuilder/ui-ux-pro-max-skill): phân cấp, phản hồi điều khiển, focus và token. Đọc hướng dẫn local; không chạy search.py khi Python bị Windows chặn ở lượt đầu.
- [Material Design 3 UI](https://github.com/skydashnet/material-design-3-ui-skill): ngữ nghĩa nút, switch, form, dialog, trạng thái trống/lỗi và giảm chuyển động.
- [Taste Skill](https://github.com/leonxlnx/taste-skill): tham khảo tính nhất quán và kiểm tra ảnh chụp; quy tắc marketing site không áp dụng cho tiện ích desktop này.

Repo tham khảo trong `design-references/` không được đóng gói với ứng dụng.

## Ảnh và kết quả

- `01-empty.png`: trạng thái ban đầu.
- `02-reminders.png`: danh sách mẫu.
- `03-editor.png`: biểu mẫu nhập/sửa có nút tăng giảm.
- `04-settings.png`: cài đặt.
- `05-popup.png`: popup đồng nhất với cửa sổ quản lý.
- `06-missed-reminder.png`, `07-history.png`: nhắc bù và lịch sử từ kiểm thử desktop.
- `08-compact.png`: giao diện cửa sổ nhỏ.
- `09-popup-drag.png`: mặt nạ ăn mòn khi kéo giữa chừng.

Đã chạy thành công Electron desktop và Windows Task Scheduler thật ở lượt 1.1, sau khi môi trường cho phép chạy Electron. Các báo cáo JSON đi kèm phân biệt kiểm thử Chrome, desktop và khởi chạy từ lịch Windows. Chưa kiểm thử bằng tắt nguồn/đăng nhập máy thật.

## Dashboard và công việc hằng ngày (1.2)

Giữ nền kem và xanh lá của cửa sổ quản lý. Dashboard mở mặc định, gồm bốn thẻ thống kê, tiến độ hôm nay, năm việc ưu tiên, ba lịch nhắc gần nhất và tổng kết bảy ngày. Thẻ quá hạn mở bộ lọc việc quá hạn; trạng thái trống không dùng số liệu mẫu.

Công việc có checkbox hoàn thành, trạng thái đang làm, ghi chú, ưu tiên và ngày thực hiện. Ngày nhập trực tiếp DD/MM/YYYY, có nút tăng giảm theo phần đang chọn. Có điều hướng hôm nay/ngày trước/ngày sau, xác nhận xóa và chuyển việc quá hạn sang hôm nay. Giao diện và CSS được chia theo module dashboard, daily, reminders, history, settings.

- `10-dashboard-empty.png`: dashboard chưa có công việc.
- `11-daily-tasks.png`: quản lý công việc theo ngày.
- `12-dashboard.png`: dashboard có dữ liệu thử trong hồ sơ riêng.
- `13-dashboard-compact.png`: dashboard ở cửa sổ nhỏ.
- `features-verification.json`: kiểm thử Electron CRUD, lọc, trạng thái, dashboard, lưu qua khởi động và tự xóa lịch một lần qua popup thật.

Ảnh dùng dữ liệu thử; bộ phát hành không chứa dữ liệu này. Có 18 kiểm thử đơn vị. Windows Task Scheduler đã được kiểm tra lại với bootstrap module bản 1.2 và lịch thử đã được dọn.

## Bản phát hành 1.3

Bỏ hiệu ứng nhiễu mở kéo dài 2 giây; nội dung popup hiện ngay với chuyển động nhẹ 140 ms. Module `motion.js` quản lý mở/đóng hộp thoại, chuyển tab 160 ms và thu cửa sổ về tray. Kéo để tắt vẫn ăn mòn theo hướng kéo và hoàn tác nếu thả sớm. Giảm chuyển động vẫn được hỗ trợ.

Bộ cài NSIS chứa đầy đủ runtime, icon/metadata Task Reminder và phần dọn lịch Windows khi gỡ cài đặt. `installer-verification.json` ghi nhận kiểm tra chính payload giải nén từ bộ cài ở đường dẫn Unicode mới; `packaged-verification.json` ghi nhận thử motion, popup tức thời và đóng/mở lại cửa sổ với PATH chỉ chứa Windows.

## 2.0 — Liquid Glass

Kính nền desktop thật bằng Windows Acrylic, độ trong điều chỉnh 20–85%, không dùng wallpaper. Fallback là màu đơn. Popup và cửa sổ quản lý dùng cùng bảng màu. Icon checkbox có khối kính bo tròn, hai lớp tròn và dấu check trắng; không dùng xanh lá.

Thư viện @tomagranate/liquid-glass 0.0.2 đóng gói offline, DPR 1, không chromatic blur, khúc xạ giới hạn ở viền cao 64 px trên native. Chuyển động 110–160 ms, thanh kéo phục hồi 300 ms; không có thời gian chờ 2 giây.
