const dailyLabels = { todo: 'Chưa làm', doing: 'Đang làm', done: 'Hoàn thành' };
const priorityLabels = { high: 'Ưu tiên cao', normal: 'Bình thường', low: 'Ưu tiên thấp' };
const localDayKey = (date = new Date()) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
const displayDay = value => value.split('-').reverse().join('/');
const inputDay = value => value.split('/').reverse().join('-');
let dailyDate = localDayKey(), dailyFilter = 'all', dailyEditId = null, dailyDeleteId = null;
function dailyRow(task, compact = false) {
  return `<article class="daily-row ${task.status === 'done' ? 'is-done' : ''}" data-daily-id="${task.id}"><input class="daily-check" type="checkbox" ${task.status === 'done' ? 'checked' : ''} data-daily-check="${task.id}" aria-label="Hoàn thành: ${escapeHtml(task.title)}"><div class="daily-content"><h3>${escapeHtml(task.title)}</h3>${!compact && task.note ? `<p>${escapeHtml(task.note)}</p>` : ''}<div class="task-meta"><span class="priority ${task.priority}">${priorityLabels[task.priority]}</span>${task.date < localDayKey() && task.status !== 'done' ? '<span class="overdue-label">Quá hạn</span>' : ''}${!compact ? `<span>${task.date.split('-').reverse().join('/')}</span>` : ''}</div></div>${compact ? `<span class="badge">${dailyLabels[task.status]}</span>` : `<select class="daily-status" data-daily-status="${task.id}" aria-label="Trạng thái: ${escapeHtml(task.title)}">${Object.entries(dailyLabels).map(([key, label]) => `<option value="${key}" ${task.status === key ? 'selected' : ''}>${label}</option>`).join('')}</select><div class="task-actions">${task.date < localDayKey() && task.status !== 'done' ? `<button data-daily-move="${task.id}" title="Chuyển sang hôm nay" aria-label="Chuyển sang hôm nay">${icon('arrow')}</button>` : ''}<button data-daily-edit="${task.id}" aria-label="Sửa: ${escapeHtml(task.title)}">${icon('edit')}</button><button data-daily-delete="${task.id}" aria-label="Xóa: ${escapeHtml(task.title)}">${icon('trash')}</button></div>`}</article>`;
}
function renderDaily() {
  $('#daily-date').value = displayDay(dailyDate); $('#daily-date').setCustomValidity('');
  const query = $('#daily-search').value.toLocaleLowerCase('vi').trim();
  const tasks = (state.dailyTasks || []).filter(task => dailyFilter === 'overdue' ? task.date < localDayKey() && task.status !== 'done' : task.date === dailyDate)
    .filter(task => ['all', 'overdue'].includes(dailyFilter) || task.status === dailyFilter)
    .filter(task => `${task.title} ${task.note}`.toLocaleLowerCase('vi').includes(query))
    .sort((a, b) => Number(a.status === 'done') - Number(b.status === 'done') || ['high', 'normal', 'low'].indexOf(a.priority) - ['high', 'normal', 'low'].indexOf(b.priority) || a.createdAt.localeCompare(b.createdAt));
  $('#daily-list').innerHTML = tasks.length ? tasks.map(task => dailyRow(task)).join('') : empty('Một ngày, từng việc nhỏ.', 'Thêm công việc cho ngày đã chọn hoặc thay đổi bộ lọc để xem các việc khác.');
  $('#daily-count').textContent = `${tasks.length} công việc · ${tasks.filter(task => task.status === 'done').length} hoàn thành`;
  document.querySelectorAll('[data-daily-filter]').forEach(button => { button.classList.toggle('active', button.dataset.dailyFilter === dailyFilter); button.setAttribute('aria-pressed', String(button.dataset.dailyFilter === dailyFilter)); });
}
function openDailyEditor(task) {
  dailyEditId = task?.id || null;
  $('#daily-form').reset();
  $('#daily-editor-title').textContent = task ? 'Sửa công việc' : 'Thêm công việc';
  $('#daily-title').value = task?.title || '';
  $('#daily-note').value = task?.note || '';
  $('#daily-task-date').value = displayDay(task?.date || dailyDate);
  $('#daily-priority').value = task?.priority || 'normal';
  $('#daily-task-status').value = task?.status || 'todo';
  $('#daily-error').hidden = true; openDialog($('#daily-editor')); $('#daily-title').focus();
}
function bindDailyActions(container) {
  container.addEventListener('change', e => {
    const id = e.target.dataset.dailyCheck || e.target.dataset.dailyStatus;
    if (id) attempt(async () => { try { await api.setDailyStatus(id, e.target.dataset.dailyCheck ? (e.target.checked ? 'done' : 'todo') : e.target.value); } finally { await refresh(); } });
  });
  container.addEventListener('click', e => {
    const edit = e.target.closest('[data-daily-edit]'), del = e.target.closest('[data-daily-delete]'), move = e.target.closest('[data-daily-move]');
    if (edit) openDailyEditor(state.dailyTasks.find(task => task.id === edit.dataset.dailyEdit));
    if (del) { dailyDeleteId = del.dataset.dailyDelete; $('#daily-delete-description').textContent = `Xóa “${state.dailyTasks.find(task => task.id === dailyDeleteId).title}”?`; openDialog($('#daily-delete-dialog')); }
    if (move) attempt(async () => { await api.moveDailyToday(move.dataset.dailyMove); toast('Đã chuyển công việc sang hôm nay.'); await refresh(); });
  });
}
bindDailyActions($('#daily-list')); bindDailyActions($('#dashboard-tasks'));
$('#daily-add').onclick = () => openDailyEditor();
$('#dashboard-add').onclick = () => { dailyDate = localDayKey(); openDailyEditor(); };
$('#daily-cancel').onclick = () => closeDialog($('#daily-editor'));
$('#daily-delete-cancel').onclick = () => closeDialog($('#daily-delete-dialog'));
$('#daily-delete-confirm').onclick = () => attempt(async () => { await api.deleteDaily(dailyDeleteId); closeDialog($('#daily-delete-dialog')); toast('Đã xóa công việc.'); await refresh(); });
$('#daily-form').onsubmit = async e => {
  e.preventDefault(); $('#daily-save').disabled = true; $('#daily-error').hidden = true;
  try {
    const date = inputDay($('#daily-task-date').value);
    await api.saveDaily({ id: dailyEditId, title: $('#daily-title').value, note: $('#daily-note').value, date, priority: $('#daily-priority').value, status: $('#daily-task-status').value });
    dailyDate = date; dailyFilter = 'all'; await refresh(); closeDialog($('#daily-editor')); toast('Đã lưu công việc.');
  } catch (error) { $('#daily-error').textContent = error.message.replace(/^Error invoking remote method '[^']+': Error: /, ''); $('#daily-error').hidden = false; }
  finally { $('#daily-save').disabled = false; }
};
$('#daily-date').onchange = e => {
  const date = inputDay(e.target.value), parsed = new Date(date + 'T12:00:00');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !Number.isFinite(+parsed) || localDayKey(parsed) !== date) { e.target.setCustomValidity('Nhập ngày hợp lệ theo DD/MM/YYYY.'); e.target.reportValidity(); return; }
  dailyDate = date; dailyFilter = 'all'; renderDaily();
};
$('#daily-today').onclick = () => { dailyDate = localDayKey(); dailyFilter = 'all'; renderDaily(); };
for (const button of document.querySelectorAll('[data-day-step]')) button.onclick = () => { const date = new Date(dailyDate + 'T12:00:00'); date.setDate(date.getDate() + Number(button.dataset.dayStep)); dailyDate = localDayKey(date); dailyFilter = 'all'; renderDaily(); };
for (const button of document.querySelectorAll('[data-daily-filter]')) button.onclick = () => { dailyFilter = button.dataset.dailyFilter; renderDaily(); };
$('#daily-search').oninput = renderDaily;
