// Text fields stay editable; stepping changes the date/time segment under the caret.
(() => {
  const remembered = { date: 0, time: 3 };
  const pad = value => String(value).padStart(2, '0');
  function step(id, direction) {
    const input = document.getElementById(id);
    const caret = document.activeElement === input ? input.selectionStart : (remembered[id] ?? 0);
    let start, end;
    if (id === 'time') {
      const parts = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(input.value);
      let minutes = parts ? Number(parts[1]) * 60 + Number(parts[2]) : new Date().getHours() * 60;
      const hour = caret <= 2;
      minutes = (minutes + direction * (hour ? 60 : 1) + 1440) % 1440;
      input.value = `${pad(Math.floor(minutes / 60))}:${pad(minutes % 60)}`;
      start = hour ? 0 : 3; end = start + 2;
    } else {
      const parts = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(input.value);
      let date = parts ? new Date(Number(parts[3]), Number(parts[2]) - 1, Number(parts[1]), 12) : new Date();
      if (Number.isNaN(+date)) date = new Date();
      const segment = caret <= 2 ? 0 : caret <= 5 ? 1 : 2;
      if (segment === 0) date.setDate(date.getDate() + direction);
      else {
        const day = date.getDate(); date.setDate(1);
        if (segment === 1) date.setMonth(date.getMonth() + direction);
        else date.setFullYear(Math.max(1900, Math.min(9999, date.getFullYear() + direction)));
        date.setDate(Math.min(day, new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate()));
      }
      input.value = `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()}`;
      start = [0, 3, 6][segment]; end = segment === 2 ? 10 : start + 2;
    }
    input.focus(); input.setSelectionRange(start, end); remembered[id] = start;
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
  }
  for (const id of ['date', 'time', 'daily-date', 'daily-task-date']) {
    const input = document.getElementById(id);
    for (const event of ['click', 'select', 'keyup']) input.addEventListener(event, () => { remembered[id] = input.selectionStart; });
    input.addEventListener('keydown', event => {
      if (event.key === 'ArrowUp' || event.key === 'ArrowDown') { event.preventDefault(); step(id, event.key === 'ArrowUp' ? 1 : -1); }
    });
  }
  document.querySelectorAll('[data-step]').forEach(button => {
    button.addEventListener('pointerdown', event => event.preventDefault());
    button.addEventListener('click', () => step(button.dataset.step, Number(button.dataset.direction)));
  });
})();
