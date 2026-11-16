import { applyGlass } from '@tomagranate/liquid-glass';

// The optical library lives on a decorative layer, never around application controls.
// This keeps form focus, event delegation and live list rendering independent of effects.
const handles = new Map();
function mount(host) {
  if (handles.has(host) || host.getBoundingClientRect().width === 0) return;
  const layer = document.createElement('div');
  layer.className = 'glass-optics'; layer.setAttribute('aria-hidden', 'true');
  host.prepend(layer);
  try {
    const handle = applyGlass(layer, { dpr: 1, radius: 28, depth: 10, scale: 16, chroma: 0, blur: 0, rimLight: .35, tint: 'rgba(255,255,255,0.08)', shadow: 'none', backdrop: 'radial-gradient(ellipse at 12% 8%,#c9edfa 0%,transparent 65%),radial-gradient(ellipse at 85% 90%,#cfc6f5 0%,#e6effb 80%)' });
    handles.set(host, { handle, layer });
    host.dataset.glassEngine = 'svg-refraction';
  } catch (error) {
    layer.remove(); host.dataset.glassEngine = 'css-fallback';
    console.warn('Glass optics fallback:', error.message);
  }
}
function scan() {
  document.querySelectorAll('.sidebar,.reminder-visual,dialog[open]').forEach(mount);
}
let frame;
const observer = new MutationObserver(() => { cancelAnimationFrame(frame); frame = requestAnimationFrame(scan); });
observer.observe(document.body, { subtree: true, attributes: true, attributeFilter: ['open', 'hidden'] });
window.addEventListener('pagehide', () => { observer.disconnect(); for (const { handle } of handles.values()) handle.destroy(); });
scan();
window.liquidGlass = { library: '@tomagranate/liquid-glass', version: '0.0.2', refresh: scan };
