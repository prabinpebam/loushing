// Only the generated library loads this module; the application keeps its saved theme.
import './app.js';

const params = new URLSearchParams(location.search);
const scheme = params.get('scheme');
const contrast = params.get('contrast');
if (['light', 'dark'].includes(scheme)) document.documentElement.dataset.scheme = scheme;
if (['normal', 'more'].includes(contrast)) document.documentElement.dataset.contrast = contrast;
document.querySelector('[data-story]')?.addEventListener('click', (event) => {
  const toggle = event.target.closest('[data-story-toggle]');
  if (toggle && !toggle.disabled) toggle.setAttribute('aria-checked', String(toggle.getAttribute('aria-checked') !== 'true'));
});
