# Task Reminder 2.0

Ứng dụng quản lý công việc và nhắc việc cho Windows x64, dữ liệu lưu cục bộ.

## Bộ cài hoàn chỉnh

Gửi duy nhất `dist/Task-Reminder-Setup-2.0.0.exe` cho người dùng. Bộ cài chứa đầy đủ Electron, giao diện, tài nguyên và trình gỡ cài đặt; máy nhận không cần Node.js, npm, Python, VS Code hay kết nối mạng để cài/chạy.

Chạy bộ cài, chọn thư mục, hoàn tất và mở Task Reminder từ Start Menu hoặc Desktop. Cài cho tài khoản Windows hiện tại, không yêu cầu quyền quản trị. Nếu bản portable/bản cũ đang chạy, thoát từ khay hệ thống trước khi chuyển sang bản đã cài. Đường dẫn chương trình mới sẽ được đăng ký lại khi mở app.

`dist/SHA256SUMS.txt` chứa mã kiểm tra toàn vẹn bộ cài. Bản phát hành chưa ký số; khả năng cho phép chạy vẫn phụ thuộc chính sách bảo mật Windows của máy nhận. Không cần và ứng dụng không tự thay đổi các thiết lập bảo mật đó.

## Công việc và dashboard

- Tổng quan mở mặc định: việc hôm nay, hoàn thành, đang làm, quá hạn, tiến độ, 5 việc ưu tiên, 3 lịch nhắc gần nhất và tổng kết 7 ngày theo ngày thực hiện.
- Công việc hằng ngày có thêm/sửa/xóa, ghi chú, mức ưu tiên, trạng thái, tìm kiếm, lọc theo ngày/trạng thái, và chuyển việc quá hạn sang hôm nay.
- Ngày nhập DD/MM/YYYY và giờ HH:mm. Nút tăng giảm hoặc phím ↑ ↓ chỉnh phần tại con trỏ.
- Công việc theo ngày và lịch nhắc là hai tính năng độc lập. Tạo lịch nhắc riêng khi cần popup đúng giờ.

## Popup và chuyển động

Popup hiển thị nội dung ngay khi tải, không còn nhiễu che nội dung trong 2 giây. Chuyển động mở nhẹ 140 ms, chuyển tab 160 ms, đóng hộp thoại/cửa sổ khoảng 110 ms. Các hiệu ứng tuân theo cài đặt giảm chuyển động và thiết lập hệ điều hành.

Kéo hết thanh sang phải rồi thả để tắt popup; kéo dở sẽ phục hồi. Escape chỉ hủy thao tác kéo, người dùng bàn phím có thể Tab đến thanh rồi bấm End. Hiệu ứng ăn mòn theo hướng kéo được giữ lại.

Nhắc một lần tự xóa sau khi tắt popup và vẫn giữ lịch sử. Hẹn lại giữ lịch tới khi hoàn thành. Nhắc mỗi ngày/tuần tiếp tục lịch kế tiếp. Công việc hằng ngày đã hoàn thành vẫn được giữ để tổng hợp tiến độ.

## Chạy nền và dữ liệu trên máy khác

Dữ liệu luôn nằm tại `%APPDATA%/task-reminder/reminders.json` của người đang dùng máy. Đường dẫn không phụ thuộc mã nguồn, ổ E:, thư mục cài hay tên tài khoản của người phát triển. Hồ sơ cũ được nâng cấp khi đọc, không xóa lịch/công việc hiện có. Bộ cài không chứa dữ liệu cá nhân, dữ liệu demo, mã kiểm thử hoặc repo tham khảo.

Đóng cửa sổ thu app về khay hệ thống. Cài đặt nhắc khi đã thoát đăng ký một Windows Task Scheduler cho tài khoản hiện tại, không lưu mật khẩu. Windows tự mở app khi tới lịch và kiểm tra bù sau đăng nhập. Máy tắt/chưa đăng nhập không thể hiện popup; máy ngủ không bị app chủ động đánh thức. Khi Windows từ chối đăng ký, app báo trạng thái trong Cài đặt để người dùng biết cần giữ app chạy nền.

Gỡ cài đặt xóa tác vụ nhắc nền và đăng ký khởi động của app, giữ dữ liệu công việc để có thể cài lại. Sao lưu bằng cách thoát app rồi sao chép tệp JSON. Dữ liệu đọc lỗi được giữ nguyên; lỗi ghi sẽ hoàn tác giao dịch trong bộ nhớ.

## Kiến trúc module

| Module | Trách nhiệm |
| --- | --- |
| `src/main.js` | Ghép module, vòng đời Electron, cửa sổ và tray |
| `src/core/store.js` | Đọc/nâng cấp JSON, giao dịch, ghi nguyên tử, hoàn tác |
| `src/features/reminders/service.js` | Quản lý và xử lý nhắc nhở |
| `src/features/daily/service.js` | CRUD, kiểm tra dữ liệu và trạng thái công việc |
| `src/features/dashboard/summary.js` | Tính dashboard theo ngày máy tính |
| `src/platform/ipc.js` và `src/preload.js` | Giao tiếp giới hạn giữa UI và dịch vụ |
| `src/scheduler.js` | Lịch lặp, nhắc bù, hẹn lại, hoàn thành |
| `src/windows-scheduler.js` | Đăng ký/cập nhật lịch Windows |
| `src/ui/modules/` | Dashboard, daily, reminders, history, settings, motion và tiện ích chung |
| `src/ui/popup.*` | Popup và thanh kéo |
| `build/installer.nsh`, `build/uninstall.ps1` | Dọn tác vụ/khởi động khi gỡ cài đặt |

UI dùng script cục bộ theo thứ tự trong `index.html`, CSP chặt và sandbox Electron; không tải mã hay phông chữ từ mạng.

## Phát triển và kiểm tra

```powershell
npm.cmd ci
npm.cmd start
npm.cmd test
npm.cmd run test:browser
npm.cmd run test:ui
npm.cmd run test:features
node scripts/os-scheduler-test.js
npm.cmd run build
node scripts/verify-installer.cjs
node scripts/demo-app.cjs
```

19 kiểm thử đơn vị; các bài kiểm tra Chrome, Electron thật, lịch Windows thật và payload bộ cài đều có báo cáo trong `design-previews/`. `verify-installer.cjs` kiểm tra toàn vẹn archive, đối chiếu mã đóng gói, giải nén runtime từ bộ cài sang đường dẫn Unicode riêng và chạy app với PATH chỉ chứa Windows. Bài kiểm tra không cài đè/gỡ bản app thật trên máy hiện tại.

Đã kiểm tra payload trên máy Windows hiện tại; chưa kiểm tra trên máy vật lý thứ hai, chu kỳ cài/gỡ đầy đủ, tắt nguồn vật lý hoặc đăng xuất/đăng nhập thực. Kết quả có giới hạn này, không phải bảo đảm mọi cấu hình/chính sách Windows đều giống nhau.

Ảnh, báo cáo kiểm tra và ghi chú thiết kế ở `design-previews/`; repo skill tham khảo ở `design-references/`. Những thư mục này không nằm trong bộ cài.

## Giao diện 2.0

Acrylic native trên Windows 11 22H2+, nền màu đơn khi không hỗ trợ; không có wallpaper giả. Thư viện Liquid Glass được bundle offline, chỉ khúc xạ trên vùng viền nhỏ. Icon vector tại `src/assets/icon.svg`; chạy `node scripts/create-icon.cjs` để tạo PNG và ICO 8 kích thước (cần Chrome hoặc `CHROME_PATH`).

Hiệu năng: bỏ qua clone/ghi JSON khi chưa có lịch đến hạn; gộp refresh đang chờ; cửa sổ ẩn ngừng cập nhật UI; tránh blur chồng lên DWM và bỏ chromatic filter. Chạy `node scripts/performance-test.cjs dist/win-unpacked` để đo trên máy hiện tại; số đo phụ thuộc GPU, màn hình và tải máy.

Đã thử cài nâng cấp thực tế lên 2.0.0, đối chiếu mã build và icon trong bản cài; dữ liệu người dùng giữ nguyên từng byte ngay sau nâng cấp. Windows Task Scheduler trỏ về bản đã cài. Chưa thử gỡ cài đặt đầy đủ hoặc máy vật lý thứ hai.
