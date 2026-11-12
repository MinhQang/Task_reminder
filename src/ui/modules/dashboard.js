function renderDashboard() {
  const summary = state.dashboard;
  if (!summary) { $('#dashboard-tasks').innerHTML = empty('Tổng quan', 'Đang tải dữ liệu công việc…'); return; }
  for (const key of ['total', 'done', 'doing', 'overdue']) $('#stat-' + key).textContent = summary[key];
  $('#dashboard-percent').textContent = summary.percent + '%';
  $('#dashboard-progress').value = summary.percent;
  $('#dashboard-progress-note').textContent = summary.total ? `${summary.done} / ${summary.total} công việc đã hoàn thành hôm nay` : 'Thêm công việc đầu tiên để bắt đầu ngày mới.';
  $('#dashboard-reminder-count').textContent = `${summary.activeReminders} lịch đang bật · ${summary.pending} lời nhắc đang chờ`;
  $('#dashboard-tasks').innerHTML = summary.todayTasks.length ? summary.todayTasks.map(task => dailyRow(task, true)).join('') : '<p class="dashboard-empty">Hôm nay còn là một trang mới. Thêm điều bạn muốn hoàn thành nhé.</p>';
  $('#dashboard-next').innerHTML = summary.nextReminders.length ? summary.nextReminders.map(task => `<div class="dashboard-reminder"><span class="category-icon ${task.category}">${icon(task.category)}</span><div><strong>${escapeHtml(task.title)}</strong><p>${dateFormat(task.nextDue)}</p></div></div>`).join('') : '<p class="dashboard-empty">Chưa có lịch nhắc sắp tới.</p>';
  $('#dashboard-week').innerHTML = summary.week.map(day => `<div class="week-day"><span>${day.done}/${day.total}</span><progress max="${day.total || 1}" value="${day.done}" aria-label="${day.date}: hoàn thành ${day.done} trên ${day.total}"></progress><small>${day.date.slice(8)}/${day.date.slice(5, 7)}</small></div>`).join('');
}
$('#dashboard-open-daily').onclick = () => { dailyDate = localDayKey(); dailyFilter = 'all'; $('[data-view="daily"]').click(); };
$('#dashboard-overdue').onclick = () => { dailyFilter = 'overdue'; $('[data-view="daily"]').click(); };
$('#dashboard-open-reminders').onclick = () => $('[data-view="all"]').click();
