// Small, interruptible transitions. Content and controls are available immediately.
const uiMotion = (() => {
  const active = new WeakMap();
  const reduced = () => document.body.classList.contains('reduce-motion') || matchMedia('(prefers-reduced-motion: reduce)').matches;
  function play(element, frames, duration = 160) {
    active.get(element)?.cancel();
    if (reduced()) return null;
    const animation = element.animate(frames, { duration, easing: 'cubic-bezier(.2,.7,.2,1)' });
    active.set(element, animation);
    return animation;
  }
  function enter(element) { play(element, [{ opacity: .6, transform: 'translateY(6px)' }, { opacity: 1, transform: 'translateY(0)' }]); }
  function openDialog(dialog) { dialog.showModal(); enter(dialog); }
  async function closeDialog(dialog) {
    if (!dialog.open) return;
    const animation = play(dialog, [{ opacity: 1, transform: 'translateY(0)' }, { opacity: 0, transform: 'translateY(4px)' }], 110);
    if (animation) { try { await animation.finished; } catch { return; } }
    dialog.close();
  }
  async function hideWindow() {
    if (typeof api.hiddenReady !== 'function') return;
    const animation = play(document.querySelector('.app-shell'), [{ opacity: 1 }, { opacity: 0 }], 110);
    if (animation) { try { await animation.finished; } catch { return; } }
    api.hiddenReady();
  }
  document.querySelectorAll('dialog').forEach(dialog => dialog.addEventListener('cancel', event => { event.preventDefault(); closeDialog(dialog); }));
  return { enter, openDialog, closeDialog, hideWindow };
})();
const openDialog = dialog => uiMotion.openDialog(dialog);
const closeDialog = dialog => uiMotion.closeDialog(dialog);
