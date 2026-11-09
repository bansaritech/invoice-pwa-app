// Applies the saved theme immediately (before paint) and exposes toggleTheme().
(function () {
  var saved = localStorage.getItem('ledger-theme') || 'light';
  document.documentElement.setAttribute('data-theme', saved);

  window.toggleTheme = function () {
    var next = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('ledger-theme', next);
    syncLabels(next);
  };

  function syncLabels(mode) {
    document.querySelectorAll('[data-theme-label]').forEach(function (el) {
      el.textContent = mode === 'dark' ? 'Light mode' : 'Dark mode';
    });
    document.querySelectorAll('[data-theme-icon]').forEach(function (el) {
      el.innerHTML = mode === 'dark'
        ? '<circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.2 4.2l1.4 1.4M18.4 18.4l1.4 1.4M1 12h2M21 12h2M4.2 19.8l1.4-1.4M18.4 5.6l1.4-1.4"/>'
        : '<path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/>';
    });
  }
  document.addEventListener('DOMContentLoaded', function () {
    syncLabels(document.documentElement.getAttribute('data-theme'));
  });
})();
