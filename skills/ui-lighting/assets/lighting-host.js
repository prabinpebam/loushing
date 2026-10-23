import { LIGHT_DEFAULTS, LIGHT_LEVELS, LIGHT_SCHEMA, lightingMotion, lightingProperties, upgradeLighting, validateLighting } from './lighting.mjs';
import { createLightRenderer } from './light-renderer.js';

/**
 * Framework-free host adapter: settings, persistence, the main switch, the settings
 * panel and the user's accessibility preferences, wired to the engine and the shared
 * shadow layer. It expects the markup from lighting-panel.js (or the same data
 * attributes in your own components):
 *
 *   [data-lighting-toggle]   a button with role="switch": the main on/off switch
 *   [data-lighting-panel]    a <details> holding the settings
 *     [data-lighting-sheet]  the panel surface (its top is measured to fit the view)
 *     [data-lighting-fields] a <fieldset> holding every [data-light-setting] control
 *     [data-lighting-status] a polite status line
 *     [data-lighting-motion] a note about motion
 *     [data-lighting-reset]  the reset button
 *
 * Returns { settings(), set(patch), destroy() }, or null when the markup is missing.
 */
export function mountLighting({
  storageKey = 'ui-lighting',
  heights = LIGHT_LEVELS,
  selector = '[data-elevation]',
  defaults = {},
  root = document.documentElement,
  toggle = document.querySelector('[data-lighting-toggle]'),
  panel = document.querySelector('[data-lighting-panel]'),
} = {}) {
  if (!toggle || !panel) return null;
  const base = validateLighting({ ...LIGHT_DEFAULTS, ...defaults });
  const fields = panel.querySelector('[data-lighting-fields]');
  const status = panel.querySelector('[data-lighting-status]');
  const motionNote = panel.querySelector('[data-lighting-motion]');
  const sheet = panel.querySelector('[data-lighting-sheet]');
  const reset = panel.querySelector('[data-lighting-reset]');
  const controls = [...panel.querySelectorAll('[data-light-setting]')];
  const listening = new AbortController();
  const signal = listening.signal;
  const place = () => {
    if (panel.open && sheet) panel.style.setProperty('--data-light-panel-top', `${Math.ceil(sheet.getBoundingClientRect().top)}px`);
  };
  panel.addEventListener('toggle', place, { signal });
  addEventListener('resize', place, { signal });
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const contrast = matchMedia('(prefers-contrast: more)');
  const forced = matchMedia('(forced-colors: active)');
  const key = `${storageKey}.v${LIGHT_SCHEMA}`;
  const legacyKeys = [2, 1].map((version) => ({ version, key: `${storageKey}.v${version}` }));
  let settings = { ...base };
  let warning = '';
  let upgraded = false;
  let renderer = null;
  try {
    const saved = localStorage.getItem(key);
    if (saved !== null) settings = validateLighting(JSON.parse(saved));
    else {
      const legacy = legacyKeys.find((entry) => localStorage.getItem(entry.key) !== null);
      if (legacy) { settings = upgradeLighting(JSON.parse(localStorage.getItem(legacy.key)), legacy.version); upgraded = true; }
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
    if (settings.enabled && !renderer) renderer = createLightRenderer({ heights: [...heights], selector });
    renderer?.update(settings, {
      visible: settings.enabled && !preferred,
      motion: lightingMotion(settings, { reducedMotion: reduced.matches, hidden: document.hidden || preferred }),
    });
    toggle.setAttribute('aria-checked', String(settings.enabled));
    if (fields) fields.disabled = !settings.enabled;
    for (const control of controls) {
      const name = control.dataset.lightSetting;
      if (control.getAttribute('role') === 'switch') control.setAttribute('aria-checked', String(settings[name]));
      else {
        control.value = String(settings[name]);
        const output = panel.querySelector(`output[for="${control.id}"]`);
        if (output) output.textContent = `${settings[name]}${control.dataset.unit ?? ''}`;
      }
      control.disabled = !settings.enabled
        || (name === 'animated' && (!settings.offFrame || reduced.matches))
        || (name === 'speed' && (!settings.offFrame || !settings.animated || reduced.matches));
    }
    if (status) {
      status.textContent = warning || (preferred
        ? 'Lighting is hidden for your contrast preference.'
        : !settings.enabled ? 'Turn on long shadows to adjust the light.'
          : renderer && !renderer.supported ? 'This browser can’t draw cast shadows, so only edges follow the light.'
            : 'Long shadows are on. Changes apply across the site.');
    }
    if (motionNote) {
      motionNote.textContent = reduced.matches
        ? 'Motion is paused for your reduced-motion preference.'
        : 'Off-frame motion is decorative. Glow is controlled separately.';
    }
  };
  const set = (patch) => {
    settings = validateLighting({ ...settings, ...patch });
    save();
    show();
  };
  toggle.disabled = false;
  if (reset) reset.disabled = false;
  toggle.addEventListener('click', () => set({ enabled: !settings.enabled }), { signal });
  panel.addEventListener('input', (event) => {
    const control = event.target.closest('input[data-light-setting]');
    if (control) set({ [control.dataset.lightSetting]: control.type === 'color' ? control.value : control.valueAsNumber });
  }, { signal });
  panel.addEventListener('click', (event) => {
    const control = event.target.closest('[role="switch"][data-light-setting]');
    if (control) set({ [control.dataset.lightSetting]: !settings[control.dataset.lightSetting] });
    if (event.target.closest('[data-lighting-reset]')) set({ ...base, enabled: settings.enabled });
  }, { signal });
  panel.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') { panel.open = false; panel.querySelector('summary')?.focus(); }
  }, { signal });
  document.addEventListener('click', (event) => {
    if (panel.open && !panel.contains(event.target) && !toggle.contains(event.target)) panel.open = false;
  }, { signal });
  document.addEventListener('visibilitychange', show, { signal });
  for (const media of [reduced, contrast, forced]) media.addEventListener('change', show, { signal });
  show();
  return {
    settings: () => ({ ...settings }),
    set,
    destroy() {
      listening.abort();
      renderer?.destroy();
      renderer = null;
      root.dataset.lighting = 'off';
    },
  };
}
