// Injects the shared app shell (sidebar / top bar / bottom nav) so pages hold only content.
// Usage: <body data-active="invoices" data-title="Invoices"> with #nav-side, #nav-top, #nav-bot placeholders.
(function () {
  var I = {
    overview: '<path d="M3 12l9-9 9 9M5 10v10h14V10"/>',
    invoices: '<path d="M7 3h10l3 3v15H4V6zM8 9h8M8 13h8M8 17h5"/>',
    clients:  '<path d="M16 20v-2a4 4 0 0 0-8 0v2M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z"/>',
    items:    '<path d="M3 7l9-4 9 4-9 4-9-4zM3 7v10l9 4 9-4V7"/>',
    payments: '<path d="M3 7h18v12H3zM3 11h18M7 15h4"/>',
    reports:  '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',
    settings: '<circle cx="12" cy="12" r="3"/><path d="M19.4 13a7 7 0 0 0 0-2l2-1.5-2-3.4-2.3 1a7 7 0 0 0-1.7-1L15 3.5h-4l-.4 2.6a7 7 0 0 0-1.7 1l-2.3-1-2 3.4L6.6 11a7 7 0 0 0 0 2l-2 1.5 2 3.4 2.3-1a7 7 0 0 0 1.7 1l.4 2.6h4l.4-2.6a7 7 0 0 0 1.7-1l2.3 1 2-3.4z"/>',
    search:   '<circle cx="11" cy="11" r="7"/><path d="M21 21l-4-4"/>'
  };
  var sw = 'fill="none" stroke="currentColor" stroke-width="2"';
  function ic(name, s) { return '<svg viewBox="0 0 24 24" ' + (s ? 'fill="none" stroke="currentColor" stroke-width="' + s + '"' : sw) + '>' + I[name] + '</svg>'; }
  function link(key, href, label) {
    return '<a class="' + (active === key ? 'active' : '') + '" href="' + href + '">' + ic(key) + ' ' + label + '</a>';
  }

  var active = document.body.dataset.active || '';
  var title = document.body.dataset.title || 'Ledger';

  var side = document.getElementById('nav-side');
  if (side) {
    side.outerHTML =
      '<aside class="sidebar">' +
        '<div class="wordmark"><span class="mark">₹</span> Ledger</div>' +
        '<a class="btn btn-primary newbtn" href="invoice-editor.html"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M12 5v14M5 12h14"/></svg> New invoice</a>' +
        '<nav>' +
          link('overview', 'dashboard.html', 'Overview') +
          link('invoices', 'invoices.html', 'Invoices') +
          link('clients', 'clients.html', 'Clients') +
          link('items', 'items.html', 'Items') +
          link('payments', 'payments.html', 'Payments') +
          link('reports', 'reports.html', 'Reports') +
        '</nav>' +
        '<div class="side-foot">' +
          '<button class="userchip" onclick="toggleTheme()" style="width:100%;margin-bottom:10px;cursor:pointer;text-align:left">' +
            '<span class="avatar" style="width:34px;height:34px;border-radius:10px;background:var(--paper-2);color:var(--accent)"><svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" data-theme-icon></svg></span>' +
            '<span><span class="nm" style="display:block" data-theme-label>Dark mode</span><span class="rl">Switch appearance</span></span>' +
          '</button>' +
          '<a href="settings.html" class="userchip" style="text-decoration:none"><span class="avatar" style="width:34px;height:34px;border-radius:10px">BT</span><span><span class="nm" style="display:block">Bansari Tech</span><span class="rl">Settings & profile</span></span></a>' +
        '</div>' +
      '</aside>';
  }

  var top = document.getElementById('nav-top');
  if (top) {
    var back = document.body.dataset.back;
    top.outerHTML =
      '<header class="topbar">' +
        (back
          ? '<a class="iconbtn" href="' + back + '" aria-label="Back"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M15 18l-6-6 6-6"/></svg></a><div class="wordmark" style="font-size:18px">' + title + '</div>'
          : '<div class="wordmark"><span class="mark">₹</span> Ledger</div>') +
        '<span class="spacer"></span>' +
        '<button class="iconbtn" aria-label="Toggle theme" onclick="toggleTheme()"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" data-theme-icon></svg></button>' +
        '<button class="iconbtn" aria-label="Search">' + ic('search') + '</button>' +
        '<span class="avatar">BT</span>' +
      '</header>';
  }

  // Context-aware FAB: each screen's primary action (not always "New invoice").
  var FAB = {
    'new-invoice': { href: 'invoice-editor.html', label: 'New invoice' },
    'add-item':    { href: '#add-item',    label: 'Add item' },
    'add-client':  { href: '#add-client',  label: 'Add client' },
    'record':      { href: '#record',      label: 'Record payment' }
  };
  var fabKey = document.body.dataset.fab || 'new-invoice';

  var bot = document.getElementById('nav-bot');
  if (bot) {
    function bl(key, href, label) { return '<a class="' + (active === key ? 'active' : '') + '" href="' + href + '">' + ic(key) + ' ' + label + '</a>'; }
    var fab = FAB[fabKey];
    // If a matching drawer exists on the page, open it; otherwise navigate.
    var hasDrawer = !!document.getElementById('drawer-' + fabKey);
    var onclick = hasDrawer ? 'onclick="openDrawer(\'drawer-' + fabKey + '\');return false;"' : '';
    var fabHtml = (fabKey === 'none' || !fab) ? '' :
      '<button class="fab" ' + onclick + ' aria-label="' + fab.label + '" ' + (hasDrawer ? '' : 'data-href="' + fab.href + '"') +
      '><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4"><path d="M12 5v14M5 12h14"/></svg><span>' + fab.label + '</span></button>';
    bot.outerHTML = fabHtml +
      '<nav class="botnav">' +
        bl('overview', 'dashboard.html', 'Home') +
        bl('invoices', 'invoices.html', 'Invoices') +
        bl('clients', 'clients.html', 'Clients') +
        bl('reports', 'reports.html', 'Reports') +
        bl('settings', 'settings.html', 'More') +
      '</nav>';
  }

  document.addEventListener('click', function (e) {
    var f = e.target.closest && e.target.closest('.fab[data-href]');
    if (f) window.location = f.getAttribute('data-href');
  });
})();
