// Left-drawer controller for add/create flows (items, clients, etc.).
(function () {
  function scrim() {
    var s = document.getElementById('drawer-scrim');
    if (!s) {
      s = document.createElement('div');
      s.id = 'drawer-scrim';
      s.className = 'drawer-scrim';
      s.addEventListener('click', closeDrawer);
      document.body.appendChild(s);
    }
    return s;
  }
  window.openDrawer = function (id) {
    var d = document.getElementById(id);
    if (!d) return;
    scrim().classList.add('open');
    d.classList.add('open');
    document.body.style.overflow = 'hidden';
    var first = d.querySelector('input, select, textarea, button');
    if (first) setTimeout(function () { first.focus(); }, 320);
  };
  window.closeDrawer = function () {
    document.querySelectorAll('.drawer.open').forEach(function (d) { d.classList.remove('open'); });
    var s = document.getElementById('drawer-scrim');
    if (s) s.classList.remove('open');
    document.body.style.overflow = '';
  };
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeDrawer(); });
})();
