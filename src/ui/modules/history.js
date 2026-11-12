function renderHistory() {

    $('#history-list').innerHTML = state.history.length ? state.history.map(item => `<div class="history-row"><span class="category-icon ${item.category}">${icon(item.action === 'done' ? 'check' : 'clock')}</span><div><strong>${escapeHtml(item.title)}</strong><p>${dateFormat(item.resolvedAt)} · Lịch nhắc ${dateFormat(item.dueAt)}</p></div><span class="badge">${item.action === 'done' ? 'Đã hoàn thành' : 'Hẹn lại 10 phút'}</span></div>`).join('') : empty('Chưa có lịch sử', 'Khi bạn hoàn thành hoặc hẹn lại một lời nhắc, lịch sử sẽ xuất hiện ở đây.');
}
