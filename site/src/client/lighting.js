import { GOBOS, LIGHT_DEFAULTS, LIGHT_LEVELS, LIGHT_SCHEMA, lightingProperties, lightingMotion, upgradeLighting, validateLighting } from '../lib/lighting.mjs';
import { createLightRenderer } from './light-renderer.js';

// Loushing shows long shadows from the first visit, with moving objects casting the
// off-frame shadows; the portable engine stays opt-in.
const SITE_DEFAULTS = Object.freeze({ ...LIGHT_DEFAULTS, enabled: true, gobo: 'none' });
const GOBO_URLS = Object.fromEntries(Object.entries(GOBOS).map(([name, { file }]) => [name, new URL(`../${file}`, import.meta.url).href]));

/** Let content paint with settled fonts before allocating the decorative GPU layer. */
export async function afterLightingLayout(start, { fontReady = document.fonts?.ready, frame = requestAnimationFrame } = {}) {
  await Promise.resolve(fontReady).catch(() => {});
  await new Promise((resolve) => frame(() => frame(resolve)));
  start();
}

/** DOM adapter for the portable engine and its shared shadow layer. */
export function initLighting() {
  const root = document.documentElement;
  const toggle = document.querySelector('[data-lighting-toggle]');
  const panel = document.querySelector('[data-lighting-panel]');
  if (!toggle || !panel) return;
  const fields = panel.querySelector('[data-lighting-fields]');
  const status = panel.querySelector('[data-lighting-status]');
  const motionNote = panel.querySelector('[data-lighting-motion]');
  const controls = [...panel.querySelectorAll('[data-light-setting]')];
  const goboChoice = panel.querySelector('[data-light-choice="gobo"]');
  const reset = panel.querySelector('[data-lighting-reset]');
  const place = () => {
    if (panel.open) panel.style.setProperty('--data-light-panel-top', `${Math.ceil(panel.querySelector('.c-lighting__panel').getBoundingClientRect().top)}px`);
  };
  panel.addEventListener('toggle', place);
  addEventListener('resize', place);
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const contrast = matchMedia('(prefers-contrast: more)');
  const forced = matchMedia('(forced-colors: active)');
  const key = `loushing.lighting.v${LIGHT_SCHEMA}`;
  const legacyKeys = [2, 1].map((version) => ({ version, key: `loushing.lighting.v${version}` }));
  let settings = { ...SITE_DEFAULTS };
  let warning = '';
  let upgraded = false;
  let renderer = null;
  let layoutReady = false;
  try {
    const saved = localStorage.getItem(key);
    // Settings saved before a setting existed take the site's default for it, as does a
    // gobo that is no longer offered.
    if (saved !== null) {
      const { gobo, ...rest } = JSON.parse(saved);
      settings = validateLighting({ ...SITE_DEFAULTS, ...rest, ...(gobo === 'none' || Object.hasOwn(GOBOS, gobo) ? { gobo } : {}) });
    } else {
      const legacy = legacyKeys.find((entry) => localStorage.getItem(entry.key) !== null);
      if (legacy) { settings = { ...upgradeLighting(JSON.parse(localStorage.getItem(legacy.key)), legacy.version), gobo: SITE_DEFAULTS.gobo }; upgraded = true; }
    }
  } catch (error) {
    console.warn('Lighting settings could not be restored.', error);
    warning = 'Saved lighting could not be read. Defaults are in use; reset lighting to replace them.';
  }
  const save = () => {
    try {
      localStorage.setItem(key, JSON.stringify(settings));
      for (const legacy of legacyKeys) localStorage.removeItem(legacy.key);
      warning = '';
    } catch (error) {
      console.warn('Lighting settings could not be saved.', error);
      warning = 'Lighting works for this page, but could not be saved in this browser.';
    }
  };
  if (upgraded) save();
  const show = () => {
    for (const [name, value] of Object.entries(lightingProperties(settings))) root.style.setProperty(name, value);
    root.dataset.lighting = settings.enabled ? 'on' : 'off';
    const preferred = forced.matches || contrast.matches;
    if (layoutReady && settings.enabled && !preferred && !renderer) {
      const start = performance.now();
      renderer = createLightRenderer({ heights: [...LIGHT_LEVELS], gobos: GOBO_URLS });
      performance.measure('lighting:initialize', { start, end: performance.now() });
    }
    renderer?.update(settings, {
      visible: settings.enabled && !preferred,
      motion: lightingMotion(settings, { reducedMotion: reduced.matches, hidden: document.hidden || preferred }),
    });
    toggle.setAttribute('aria-checked', String(settings.enabled));
    fields.disabled = !settings.enabled;
    for (const control of controls) {
      const name = control.dataset.lightSetting;
      if (control.getAttribute('role') === 'switch') control.setAttribute('aria-checked', String(settings[name]));
      else {
        control.value = String(settings[name]);
        const output = panel.querySelector(`output[for="${control.id}"]`);
        if (output) output.textContent = `${settings[name]}${control.dataset.unit}`;
      }
      control.disabled = !settings.enabled
        || (name === 'goboDistance' && (!settings.offFrame || settings.gobo === 'none'))
        || (name === 'animated' && (!settings.offFrame || reduced.matches))
        || (name === 'speed' && (!settings.offFrame || !settings.animated || reduced.matches));
    }
    if (goboChoice) {
      goboChoice.disabled = !settings.enabled || !settings.offFrame;
      for (const radio of goboChoice.querySelectorAll('input[type="radio"]')) radio.checked = radio.value === settings.gobo;
    }
    status.textContent = warning || (preferred
      ? 'Lighting is hidden for your contrast preference.'
      : !settings.enabled ? 'Turn on long shadows to adjust the light.'
        : renderer && !renderer.supported ? 'This browser can’t draw cast shadows, so only edges follow the light.'
          : 'Long shadows are on. Changes apply across the site.');
    motionNote.textContent = reduced.matches
      ? 'Motion is paused for your reduced-motion preference.'
      : 'Off-frame motion is decorative. Glow is controlled separately.';
  };
  toggle.disabled = false;
  reset.disabled = false;
  toggle.addEventListener('click', () => { settings.enabled = !settings.enabled; save(); show(); });
  panel.addEventListener('input', (event) => {
    const choice = event.target.closest('[data-light-choice] input[type="radio"]');
    if (choice) {
      settings = validateLighting({ ...settings, [choice.closest('[data-light-choice]').dataset.lightChoice]: choice.value });
      save();
      show();
      return;
    }
    const control = event.target.closest('input[data-light-setting]');
    if (!control) return;
    settings = validateLighting({ ...settings, [control.dataset.lightSetting]: control.type === 'color' ? control.value : control.valueAsNumber });
    save();
    show();
  });
  panel.addEventListener('click', (event) => {
    const control = event.target.closest('[role="switch"][data-light-setting]');
    if (control) {
      const name = control.dataset.lightSetting;
      settings = { ...settings, [name]: !settings[name] };
      save();
      show();
    }
    if (event.target.closest('[data-lighting-reset]')) {
      settings = { ...SITE_DEFAULTS, enabled: settings.enabled };
      save();
      show();
    }
  });
  panel.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') { panel.open = false; panel.querySelector('summary').focus(); }
  });
  document.addEventListener('click', (event) => {
    if (panel.open && !panel.contains(event.target) && !toggle.contains(event.target)) panel.open = false;
  });
  document.addEventListener('visibilitychange', show);
  for (const media of [reduced, contrast, forced]) media.addEventListener('change', show);
  show();
  void afterLightingLayout(() => { layoutReady = true; show(); });
}
