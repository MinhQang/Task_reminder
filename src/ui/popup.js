const api = window.reminder;
const slider = document.querySelector('#dismiss-slider');
const stage = document.querySelector('.popup-stage');
const visual = document.querySelector('.reminder-visual');
const dimmer = document.querySelector('.screen-dimmer');
const control = document.querySelector('.dismiss-control');
const noise = document.querySelector('.signal-noise');
let entranceAnimation;
let current, resolving = false, pointerActive = false, progress = 0, restoreFrame = 0, initialized = false, reduceMotion = false;
const sounded = new Set();
function chime() {
  try { const audio = new AudioContext(); const gain = audio.createGain(); gain.connect(audio.destination); gain.gain.setValueAtTime(0.12, audio.currentTime); gain.gain.exponentialRampToValueAtTime(0.001, audio.currentTime + 1); [660, 880].forEach((frequency, i) => { const osc = audio.createOscillator(); osc.type = 'sine'; osc.frequency.value = frequency; osc.connect(gain); osc.start(audio.currentTime + i * 0.15); osc.stop(audio.currentTime + 1); }); setTimeout(() => audio.close(), 1400); } catch {} }
function paint(value) {
  progress = Math.max(0, Math.min(1, value));
  slider.value = String(progress * 100);
  visual.style.opacity = '1';
  if (progress === 0) visual.style.clipPath = 'none';
  else if (progress === 1) visual.style.clipPath = 'inset(0 0 0 100%)';
  else {
    // A stepped, irregular boundary consumes pixels from left to right instead of fading them.
    const points = ['100% 0%', '100% 100%'];
    for (let row = 24; row >= 0; row--) {
      const offset = reduceMotion ? 0 : (((row * 17 + Math.floor(progress * 40)) % 11) - 5) * 0.55;
      const edge = Math.max(0, Math.min(100, progress * 100 + offset));
      points.push(`${edge}% ${row / 24 * 100}%`);
      if (row > 0) points.push(`${edge}% ${(row - 1) / 24 * 100}%`);
    }
    visual.style.clipPath = `polygon(${points.join(',')})`;
  }
  noise.style.left = `${progress * 100 - 2}%`;
  visual.classList.toggle('is-eroding', progress > 0 && progress < 1 && !reduceMotion);
  visual.style.transform = `translateX(${reduceMotion ? 0 : progress * 100}px)`;
  dimmer.style.opacity = String(1 - progress);
  // Keep the rail in place while dragging, so the endpoint never moves away from the cursor.
  control.style.opacity = String(1 - Math.pow(progress, 4));
  control.style.setProperty('--slide-percent', `${progress * 100}%`);
}
function restore() {
  cancelAnimationFrame(restoreFrame);
  if (resolving) return;
  const from = progress;
  if (reduceMotion || from === 0) { paint(0); return; }
  const start = performance.now();
  function step(now) {
    const fraction = Math.min(1, (now - start) / 300);
    paint(from * Math.pow(1 - fraction, 3));
    if (fraction < 1) restoreFrame = requestAnimationFrame(step);
  }
  restoreFrame = requestAnimationFrame(step);
}
async function refresh() {
  const state = await api.getState();
  reduceMotion = state.settings.reducedMotion || matchMedia('(prefers-reduced-motion: reduce)').matches;
  document.body.classList.toggle('reduce-motion', reduceMotion);
  const previousId = current?.id;
  current = state.preview ? { id: 'preview', title: 'Đứng dậy, hít thở một chút.', note: 'Rời màn hình, vươn vai và uống một cốc nước nhé.', dueAt: new Date().toISOString() } : state.pending[0];
  if (current?.id !== previousId) { cancelAnimationFrame(restoreFrame); paint(0); }
  if (!current) { api.close(); return; }
  document.querySelector('#popup-title').textContent = current.title;
  document.querySelector('#popup-note').textContent = current.note || '';
  document.querySelector('#popup-note').hidden = !current.note;
  document.querySelector('#missed-note').hidden = state.preview || new Date(current.detectedAt) - new Date(current.dueAt) < 60000;
  if (!initialized) {
    initialized = true;
    stage.style.opacity = '1';
    if (!reduceMotion) {
      dimmer.animate([{ opacity: .6 }, { opacity: 1 }], { duration: 140, easing: 'ease-out' });
      entranceAnimation = visual.animate([{ opacity: .85, transform: 'translateY(5px)' }, { opacity: 1, transform: 'translateY(0)' }], { duration: 140, easing: 'ease-out' });
    }
  }
  if (!sounded.has(current.id)) { sounded.add(current.id); if (state.settings.sound) chime(); }
}
async function finish() {
  if (resolving || !current || Number(slider.value) !== 100) return;
  resolving = true;
  slider.disabled = true;
  cancelAnimationFrame(restoreFrame);
  paint(1);
  const id = current.id;
  try {
    // Present the fully consumed frame before native IPC can close the window.
    await new Promise(done => requestAnimationFrame(() => requestAnimationFrame(done)));
    await api.resolve(id, 'done');
  } catch (e) {
    document.querySelector('#popup-error').textContent = e.message;
    document.querySelector('#popup-error').hidden = false;
  } finally {
    resolving = false;
    slider.disabled = false;
    restore();
  }
}
slider.addEventListener('pointerdown', () => { entranceAnimation?.cancel(); cancelAnimationFrame(restoreFrame); pointerActive = true; });
slider.addEventListener('input', () => { if (!resolving) { cancelAnimationFrame(restoreFrame); paint(Number(slider.value) / 100); } });
slider.addEventListener('change', () => { if (!pointerActive && Number(slider.value) === 100) finish(); });
window.addEventListener('pointerup', () => {
  if (!pointerActive) return;
  pointerActive = false;
  if (Number(slider.value) === 100) finish(); else restore();
});
window.addEventListener('pointercancel', () => { pointerActive = false; restore(); });
window.addEventListener('blur', () => { pointerActive = false; restore(); });
slider.addEventListener('blur', () => { if (!pointerActive) restore(); });
// Escape only cancels a partial gesture; acknowledging requires reaching the endpoint.
window.addEventListener('keydown', event => { if (event.key === 'Escape') { event.preventDefault(); pointerActive = false; restore(); } });
matchMedia('(prefers-reduced-motion: reduce)').addEventListener('change', () => refresh());
api.onChange(refresh); refresh();
