// Mobile "More" menu — full navigation as a left drawer so every section is reachable on phones.
(function () {
  var I = {
    overview: '<path d="M3 12l9-9 9 9M5 10v10h14V10"/>',
    invoices: '<path d="M7 3h10l3 3v15H4V6zM8 9h8M8 13h8M8 17h5"/>',
    clients:  '<path d="M16 20v-2a4 4 0 0 0-8 0v2M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z"/>',
    items:    '<path d="M3 7l9-4 9 4-9 4-9-4zM3 7v10l9 4 9-4V7"/>',
    payments: '<path d="M3 7h18v12H3zM3 11h18M7 15h4"/>',
    reports:  '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',
    settings: '<circle cx="12" cy="12" r="3"/><path d="M19.4 13a7 7 0 0 0 0-2l2-1.5-2-3.4-2.3 1a7 7 0 0 0-1.7-1L15 3.5h-4l-.4 2.6a7 7 0 0 0-1.7 1l-2.3-1-2 3.4L6.6 11a7 7 0 0 0 0 2l-2 1.5 2 3.4 2.3-1a7 7 0 0 0 1.7 1l.4 2.6h4l.4-2.6a7 7 0 0 0 1.7-1l2.3 1 2-3.4z"/>'
  };
  var NAV = [
    ['overview', 'dashboard.html', 'Overview'],
    ['invoices', 'invoices.html', 'Invoices'],
    ['clients', 'clients.html', 'Clients'],
    ['items', 'items.html', 'Items'],
    ['payments', 'payments.html', 'Payments'],
    ['reports', 'reports.html', 'Reports'],
    ['settings', 'settings.html', 'Settings']
  ];
  var here = (location.pathname.split('/').pop() || 'dashboard.html');

  function closeAll() {
    document.querySelectorAll('.drawer.open').forEach(function (d) { d.classList.remove('open'); });
    var s = document.getElementById('drawer-scrim');
    if (s) s.classList.remove('open');
    document.body.style.overflow = '';
  }
  function scrim() {
    var s = document.getElementById('drawer-scrim');
    if (!s) { s = document.createElement('div'); s.id = 'drawer-scrim'; s.className = 'drawer-scrim'; s.addEventListener('click', closeAll); document.body.appendChild(s); }
    return s;
  }

  function build() {
    if (document.getElementById('drawer-nav')) return;
    var rows = NAV.map(function (n) {
      var on = n[1] === here;
      return '<a class="set-row" href="' + n[1] + '"' + (on ? ' style="background:var(--paper-2)"' : '') + '>' +
        '<span class="ic"><svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">' + I[n[0]] + '</svg></span>' +
        '<span class="grow"><span class="t">' + n[2] + '</span></span>' +
        (on ? '<span class="chip paid" style="height:22px">Current</span>' : '<span class="chev">›</span>') +
        '</a>';
    }).join('');
    var d = document.createElement('aside');
    d.className = 'drawer';
    d.id = 'drawer-nav';
    d.setAttribute('role', 'dialog');
    d.setAttribute('aria-label', 'Menu');
    d.innerHTML =
      '<div class="drawer-head"><div class="wordmark"><span class="mark">₹</span> Ledger</div>' +
      '<button class="drawer-x" aria-label="Close">×</button></div>' +
      '<div class="drawer-body" style="padding:8px 12px"><div class="set-list">' + rows + '</div></div>' +
      '<div class="drawer-foot" style="justify-content:space-between;align-items:center">' +
        '<button class="userchip" onclick="toggleTheme()" style="border:0;background:transparent;padding:6px;display:flex;align-items:center;gap:10px;color:var(--ink);cursor:pointer">' +
          '<span class="avatar" style="width:34px;height:34px;border-radius:10px;background:var(--paper-2);color:var(--accent)"><svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" data-theme-icon></svg></span>' +
          '<span class="nm" data-theme-label style="font-weight:700;font-size:13px">Dark mode</span>' +
        '</button>' +
        '<span class="avatar">BT</span>' +
      '</div>';
    document.body.appendChild(d);
    d.querySelector('.drawer-x').addEventListener('click', closeAll);
  }

  function openMenu() { build(); scrim().classList.add('open'); document.getElementById('drawer-nav').classList.add('open'); document.body.style.overflow = 'hidden'; }

  // Re-route the bottom-nav "More" (points at settings.html) to open the menu instead.
  function wire() {
    document.querySelectorAll('.botnav a').forEach(function (a) {
      if (a.getAttribute('href') === 'settings.html') {
        a.addEventListener('click', function (e) { e.preventDefault(); openMenu(); });
      }
    });
  }
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeAll(); });
  window.openMenu = openMenu;

  // Run after the shell has rendered the bottom nav.
  if (document.readyState !== 'loading') wire();
  else document.addEventListener('DOMContentLoaded', wire);
})();
