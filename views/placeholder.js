import { esc } from '../lib/format.js';

// Temporary view for routes not yet ported (Phase 5 fills these in).
export function make(title, note) {
  return function render(root) {
    root.innerHTML = `
      <div class="page-head"><div><div class="eyebrow">Coming in this build</div><h1>${esc(title)}</h1></div></div>
      <div class="card"><div class="empty">
        <div class="em"><svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M12 8v5M12 16h.01M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0z"/></svg></div>
        <h3>${esc(title)} screen</h3><p>${esc(note || 'This screen is designed and will be wired to data next.')}</p>
      </div></div>`;
  };
}
