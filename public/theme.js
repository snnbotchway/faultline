// Runs before first paint so the saved theme never flashes. Mirrors src/lib/theme.ts.
try {
  var saved = localStorage.getItem('theme')
  var dark = saved === 'dark' || (saved !== 'light' && matchMedia('(prefers-color-scheme: dark)').matches)
  document.documentElement.classList.toggle('dark', dark)
} catch {}
