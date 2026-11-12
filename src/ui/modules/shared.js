const $ = selector => document.querySelector(selector);
const api = window.reminder;
let state, view = 'dashboard', filter = 'all', editId = null, deleteId = null, toastTimer;
const categories = { work: 'Công việc', health: 'Sức khỏe', personal: 'Cá nhân' };
const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const dateFormat = value => new Date(value).toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric' });
function schedule(task) {
  if (task.repeat === 'daily') return `Mỗi ngày · ${task.time}`;
  if (task.repeat === 'weekly') return `${[1, 2, 3, 4, 5, 6, 0].filter(d => task.days.includes(d)).map(d => d === 0 ? 'CN' : 'T' + (d + 1)).join(', ')} · ${task.time}`;
  return `${task.date.split('-').reverse().join('/')} · ${task.time}`;
}
function toast(message) { $('#toast').textContent = message; $('#toast').hidden = false; clearTimeout(toastTimer); toastTimer = setTimeout(() => $('#toast').hidden = true, 4200); }
async function attempt(fn) { try { await fn(); } catch (e) { toast(e.message.replace(/^Error invoking remote method '[^']+': Error: /, '')); } }
function today(task) { return task.nextDue && new Date(task.nextDue).toDateString() === new Date().toDateString(); }
let refreshSequence = 0;
async function refresh() {
  const sequence = ++refreshSequence;
  const next = await api.getState();
  if (sequence !== refreshSequence) return;
  state = next;
  document.body.classList.toggle('reduce-motion', state.settings.reducedMotion);
  render();
}
function empty(title, description, add = false) { return `<div class="empty-state"><div class="empty-icon">${icon('bell')}</div><h3>${title}</h3><p>${description}</p>${add ? '<button class="primary" id="empty-add">' + icon('plus') + ' Tạo nhắc nhở đầu tiên</button>' : ''}</div>`; }
