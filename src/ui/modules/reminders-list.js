function renderReminders() {
  const pendingTaskIds = new Set(state.pending.map(p => p.taskId));
  const next = state.tasks.filter(t => t.enabled && t.nextDue).sort((a, b) => new Date(a.nextDue) - new Date(b.nextDue))[0];
  $('#next-title').textContent = next?.title || 'Một ngày có nhịp điệu riêng.';
  $('#next-note').textContent = next ? (next.note || 'Một lời nhắc nhỏ để bạn không bỏ lỡ.') : 'Thêm công việc đầu tiên và để chúng tôi nhớ giúp bạn.';
  $('#next-schedule').textContent = next ? `${pendingTaskIds.has(next.id) ? 'Đang chờ bạn · ' : ''}${dateFormat(next.nextDue)} · ${categories[next.category]}` : 'Bắt đầu bằng một điều nhỏ thôi.';
  let tasks = state.tasks.filter(t => view !== 'today' || (t.enabled && today(t)));
  $('#filter-count').textContent = tasks.length;
  if (filter !== 'all') tasks = tasks.filter(t => filter === 'enabled' ? t.enabled : !t.enabled);
  const query = $('#search').value.toLocaleLowerCase('vi').trim();
  tasks = tasks.filter(t => `${t.title} ${t.note}`.toLocaleLowerCase('vi').includes(query)).sort((a, b) => Number(b.enabled) - Number(a.enabled) || new Date(a.nextDue || '9999') - new Date(b.nextDue || '9999'));
  $('#task-list').innerHTML = tasks.length ? tasks.map(t => `<article class="task-row ${t.enabled ? '' : 'paused'}"><span class="category-icon ${t.category}">${icon(t.category)}</span><div class="task-content"><h3>${escapeHtml(t.title)}</h3><div class="task-meta">${icon('clock')}<span>${escapeHtml(schedule(t))}</span><span class="badge">${categories[t.category]}</span>${pendingTaskIds.has(t.id) ? '<span class="badge">Đang chờ xử lý</span>' : !t.enabled ? '<span class="badge">Đã tắt</span>' : ''}</div></div><div class="task-actions"><input class="switch" role="switch" type="checkbox" ${t.enabled ? 'checked' : ''} data-toggle="${t.id}" aria-label="Bật nhắc nhở: ${escapeHtml(t.title)}"><button data-edit="${t.id}" aria-label="Sửa: ${escapeHtml(t.title)}" title="Sửa nhắc nhở">${icon('edit')}</button><button data-delete="${t.id}" aria-label="Xóa: ${escapeHtml(t.title)}" title="Xóa nhắc nhở">${icon('trash')}</button></div></article>`).join('') : empty(state.tasks.length ? 'Không có nhắc nhở phù hợp' : 'Điều đầu tiên bạn muốn nhớ?', state.tasks.length ? 'Thử tìm từ khóa khác hoặc thay đổi bộ lọc.' : 'Một cuộc hẹn, cốc nước hay giờ nghỉ ngơi. Bắt đầu bằng một lời nhắc nhỏ.', !state.tasks.length);
  $('#list-count').textContent = `${tasks.length} nhắc nhở · ${tasks.filter(t => t.enabled).length} đang bật`;
  $('#pending-banner').hidden = !state.pending.length;
  $('#pending-banner').innerHTML = state.pending.length ? `<div class="pending-alert"><span>${state.pending.length} lời nhắc đang chờ bạn xử lý.</span><button id="show-pending">Mở lời nhắc ${icon('arrow')}</button></div>` : '';
  $('#show-pending')?.addEventListener('click', () => attempt(() => api.preview()));
}
