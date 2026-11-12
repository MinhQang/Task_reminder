function render() {
  $('#total-count').textContent = state.tasks.length;
  $('#today-count').textContent = state.tasks.filter(t => t.enabled && today(t)).length;
  renderSettings();
  if (view === 'dashboard') renderDashboard();
  else if (view === 'daily') renderDaily();
  else if (view === 'history') renderHistory();
  else if (['all', 'today'].includes(view)) renderReminders();
}
document.querySelectorAll('[data-view]').forEach(button => button.onclick = () => {
  if (view === button.dataset.view) return;
  view = button.dataset.view;
  document.querySelectorAll('[data-view]').forEach(b => { b.classList.toggle('selected', b === button); b.setAttribute('aria-current', b === button ? 'page' : 'false'); });
  $('#dashboard-view').hidden = view !== 'dashboard'; $('#daily-view').hidden = view !== 'daily';
  $('#list-view').hidden = !['all', 'today'].includes(view); $('#history-view').hidden = view !== 'history'; $('#settings-view').hidden = view !== 'settings';
  $('#page-title').textContent = view === 'today' ? 'Hôm nay, từng việc nhỏ.' : 'Việc cần nhớ, ở đây.';
  $('#page-description').textContent = view === 'today' ? 'Những lời nhắc trong ngày, theo giờ trên máy tính của bạn.' : 'Để tâm trí thảnh thơi. Những việc nhỏ đã có chúng tôi nhắc.';
  render();
  uiMotion.enter($('#' + (['all', 'today'].includes(view) ? 'list' : view) + '-view'));
});
document.querySelectorAll('[data-filter]').forEach(button => button.onclick = () => { filter = button.dataset.filter; document.querySelectorAll('[data-filter]').forEach(b => { b.classList.toggle('active', b === button); b.setAttribute('aria-pressed', String(b === button)); }); render(); });
$('#search').oninput = render;
for (const key of ['autoStart', 'notifyWhenClosed', 'sound', 'reducedMotion']) $('#' + key).onchange = e => attempt(async () => { try { await api.settings({ [key]: e.target.checked }); } finally { await refresh(); } });
$('#preview').onclick = () => attempt(() => api.preview());
$('#close').onclick = () => api.close(); $('#minimize').onclick = () => api.minimize();
function tickClock() { const now = new Date(); $('#clock').textContent = now.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }); $('#date-label').textContent = now.toLocaleDateString('vi-VN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }); }
let calendarDay = '';
tickClock(); setInterval(() => { tickClock(); const day = new Date().toDateString(); if (calendarDay && day !== calendarDay) attempt(refresh); calendarDay = day; }, 1000); api.onChange(() => attempt(refresh)); attempt(refresh);

api.onHide?.(() => uiMotion.hideWindow());
api.onShow?.(() => uiMotion.enter(document.querySelector('.app-shell')));
uiMotion.enter(document.querySelector('.app-shell'));
