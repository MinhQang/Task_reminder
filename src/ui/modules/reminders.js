function openEditor(task) {
  editId = task?.id || null;
  $('#task-form').reset();
  $('#editor-title').textContent = task ? 'Sửa nhắc nhở' : 'Tạo nhắc nhở';
  $('#title').value = task?.title || '';
  $('#note').value = task?.note || '';
  const next = new Date(Date.now() + 5 * 60000);
  const localDay = `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, '0')}-${String(next.getDate()).padStart(2, '0')}`;
  $('#date').value = (task?.date || localDay).split('-').reverse().join('/');
  $('#time').value = task?.time || `${String(next.getHours()).padStart(2, '0')}:${String(next.getMinutes()).padStart(2, '0')}`;
  $('#category').value = task?.category || 'personal';
  $(`input[name="repeat"][value="${task?.repeat || 'once'}"]`).checked = true;
  document.querySelectorAll('#weekday-field input').forEach(el => el.checked = task ? task.days.includes(Number(el.value)) : Number(el.value) === next.getDay());
  updateRepeat(); $('#form-error').hidden = true; openDialog($('#editor')); $('#title').focus();
}
function updateRepeat() { const repeat = $('input[name="repeat"]:checked').value; $('#date-field').hidden = repeat !== 'once'; $('#weekday-field').hidden = repeat !== 'weekly'; $('#date').required = repeat === 'once'; }
$('#add').onclick = () => openEditor();
$('#task-list').onclick = e => {
  if (e.target.closest('#empty-add')) openEditor();
  const edit = e.target.closest('[data-edit]'); if (edit) openEditor(state.tasks.find(t => t.id === edit.dataset.edit));
  const del = e.target.closest('[data-delete]'); if (del) { deleteId = del.dataset.delete; $('#delete-description').textContent = `“${state.tasks.find(t => t.id === deleteId).title}” sẽ được xóa khỏi lịch nhắc của bạn.`; openDialog($('#delete-dialog')); }
};
$('#task-list').onchange = e => { if (e.target.dataset.toggle) attempt(async () => { try { await api.toggleTask(e.target.dataset.toggle); } finally { await refresh(); } }); };
$('#delete-cancel').onclick = () => closeDialog($('#delete-dialog'));
$('#delete-confirm').onclick = () => attempt(async () => { await api.deleteTask(deleteId); closeDialog($('#delete-dialog')); toast('Đã xóa nhắc nhở.'); await refresh(); });
for (const id of ['cancel', 'cancel-x']) $('#' + id).onclick = () => closeDialog($('#editor'));
document.querySelectorAll('input[name="repeat"]').forEach(el => el.onchange = updateRepeat);
$('#task-form').onsubmit = async e => {
  e.preventDefault(); $('#save').disabled = true; $('#form-error').hidden = true;
  try {
    await api.saveTask({ id: editId, title: $('#title').value, note: $('#note').value, repeat: $('input[name="repeat"]:checked').value, date: $('#date').value.split('/').reverse().join('-'), time: $('#time').value, category: $('#category').value, days: [...document.querySelectorAll('#weekday-field input:checked')].map(el => Number(el.value)) });
    await refresh(); closeDialog($('#editor')); toast(editId ? 'Đã cập nhật nhắc nhở.' : 'Đã tạo nhắc nhở. Bạn cứ yên tâm nhé.'); await refresh();
  } catch (err) { $('#form-error').textContent = err.message.replace(/^Error invoking remote method '[^']+': Error: /, ''); $('#form-error').hidden = false; }
  finally { $('#save').disabled = false; }
};
