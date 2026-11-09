export function render(root) {
  root.innerHTML = `
  <div style="min-height:100vh;display:flex;flex-direction:column;max-width:520px;margin:0 auto">
    <div style="display:flex;align-items:center;padding:20px 22px">
      <div class="wordmark"><span class="mark">₹</span> Ledger</div>
      <span style="flex:1"></span>
      <button class="iconbtn" aria-label="Toggle theme" onclick="toggleTheme()"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" data-theme-icon></svg></button>
    </div>
    <div style="flex:1;display:grid;place-items:center;padding:20px 22px 48px">
      <div style="text-align:center">
        <span style="display:inline-flex;align-items:center;gap:8px;font-family:var(--mono);font-size:11px;text-transform:uppercase;letter-spacing:.14em;color:var(--ink-3);border:1px solid var(--line);border-radius:999px;padding:6px 12px">◆ Local-first invoicing</span>
        <h1 style="font-size:clamp(32px,10vw,48px);letter-spacing:-.035em;line-height:1.03;margin:22px 0 12px;font-weight:800">Invoicing that stays <span style="color:var(--primary)">yours</span>.</h1>
        <p style="color:var(--ink-2);font-size:16px;max-width:40ch;margin:0 auto 26px">Create GST invoices, track payments, and know exactly who owes you — synced to a repository you own.</p>
        <div style="display:grid;gap:10px;max-width:320px;margin:0 auto">
          <a class="btn btn-primary" href="#/setup" style="width:100%;justify-content:center;height:50px;font-size:15px">Get started</a>
        </div>
        <div style="display:grid;gap:12px;max-width:380px;margin:34px auto 0;text-align:left">
          ${feat('M7 3h10l3 3v15H4V6zM8 13h8M8 17h5', 'GST-ready invoices', 'Per-item or invoice tax, discounts, print or PDF.')}
          ${feat('M4 20V10M10 20V4M16 20v-7M22 20H2', 'Know your numbers', 'Collections, outstanding and aging at a glance.')}
          ${feat('M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z', 'Your data, your repo', 'Encrypted token, private GitHub storage. No lock-in.')}
        </div>
      </div>
    </div>
  </div>`;
}

function feat(path, t, d) {
  return `<div style="display:flex;gap:12px;align-items:flex-start">
    <span style="width:38px;height:38px;border-radius:11px;background:color-mix(in srgb,var(--primary) 12%,transparent);color:var(--primary);display:grid;place-items:center;flex-shrink:0"><svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="${path}"/></svg></span>
    <div><div style="font-weight:700;font-size:14px">${t}</div><div style="font-size:12.5px;color:var(--ink-3)">${d}</div></div>
  </div>`;
}
