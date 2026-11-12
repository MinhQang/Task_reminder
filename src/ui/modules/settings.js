function renderSettings() {
  for (const id of ['autoStart', 'notifyWhenClosed', 'sound', 'reducedMotion']) $('#' + id).checked = state.settings[id] ?? (id === 'notifyWhenClosed');
  const wake = state.wakeStatus || {};
  $('#closed-note').textContent = !state.packaged ? 'Có hiệu lực trong bản .exe đã đóng gói.' : wake.error ? 'Windows chưa cho phép đăng ký lịch. Hãy giữ ứng dụng chạy nền và kiểm tra quyền Task Scheduler.' : wake.working ? 'Đang cập nhật lịch Windows…' : wake.registered ? 'Windows đã nhận lịch nhắc. Giữ nguyên vị trí tệp ứng dụng.' : 'Lịch Windows được tạo khi có nhắc nhở đang bật.';
  $('#closed-note').title = wake.error || '';
  $('#scheduler-warning').hidden = !wake.error || !state.settings.notifyWhenClosed;
  $('#scheduler-warning').textContent = 'Chưa đăng ký được lịch Windows. Hãy giữ ứng dụng chạy nền để tiếp tục nhận nhắc nhở; xem chi tiết trong Cài đặt.';
  $('#startup-note').textContent = state.packaged ? '' : 'Tự khởi động có hiệu lực khi chạy bản .exe đã đóng gói.';
  $('#data-path').textContent = 'Tệp dữ liệu: ' + state.dataPath;
}
