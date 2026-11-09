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
        ? '<path d="M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z"/>'
        : '<path d="M21.752 15.002A9.718 9.718 0 0118 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 003 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 009.002-5.998z"/>';
    });
  }
  document.addEventListener('DOMContentLoaded', function () {
    syncLabels(document.documentElement.getAttribute('data-theme'));
  });
})();
