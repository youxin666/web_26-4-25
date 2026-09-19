(() => {
  const STORAGE_KEY = 'trading-theme-preference';
  const PREFERENCES = ['auto', 'light', 'dark'];
  const LABELS = { auto: '自动', light: '浅色', dark: '深色' };
  const ICONS = { auto: '◐', light: '☀', dark: '☾' };
  const THEME_COLORS = { light: '#f5f2eb', dark: '#07101f' };
  const media = typeof window.matchMedia === 'function'
    ? window.matchMedia('(prefers-color-scheme: dark)')
    : null;

  function readPreference() {
    try {
      const value = localStorage.getItem(STORAGE_KEY);
      return PREFERENCES.includes(value) ? value : 'auto';
    } catch {
      return 'auto';
    }
  }

  function resolveTheme(preference) {
    return preference === 'auto' ? (media?.matches === false ? 'light' : 'dark') : preference;
  }

  function render(preference) {
    const theme = resolveTheme(preference);
    const root = document.documentElement;
    root.dataset.themePreference = preference;
    root.dataset.theme = theme;
    root.style.colorScheme = theme;

    const toggle = document.querySelector('#theme-toggle');
    if (toggle) {
      const description = `主题模式：${LABELS[preference]}`;
      toggle.dataset.preference = preference;
      toggle.setAttribute('aria-label', description);
      toggle.title = description;
      toggle.querySelector('.theme-toggle-icon').textContent = ICONS[preference];
      toggle.querySelector('.theme-toggle-label').textContent = LABELS[preference];
    }

    const themeColor = document.querySelector('#theme-color');
    if (themeColor) themeColor.content = THEME_COLORS[theme];
  }

  function setPreference(preference) {
    const valid = PREFERENCES.includes(preference) ? preference : 'auto';
    try { localStorage.setItem(STORAGE_KEY, valid); } catch {}
    render(valid);
  }

  function init() {
    const toggle = document.querySelector('#theme-toggle');
    toggle?.addEventListener('click', () => {
      const current = readPreference();
      const next = PREFERENCES[(PREFERENCES.indexOf(current) + 1) % PREFERENCES.length];
      setPreference(next);
    });
    media?.addEventListener('change', () => {
      if (readPreference() === 'auto') render('auto');
    });
    render(readPreference());
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
})();
