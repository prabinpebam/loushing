import { LIGHT_CONTROLS, LIGHT_DEFAULTS } from './lighting.mjs';

/**
 * Markup for the main switch and the Lighting settings panel, built from the engine's
 * control data so every setting is present with its label, range and unit. Plain HTML
 * strings with no framework; port the structure to your own components if you have
 * them, keeping the data attributes, roles and labels. Styles: lighting-panel.css.
 */
const escape = (value) => String(value).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

/** The main on/off switch. It starts disabled; mountLighting enables it once scripts run. */
export function lightingToggleMarkup({ label = 'Long shadows' } = {}) {
  return `<button class="lp-toggle" type="button" role="switch" aria-checked="false" data-lighting-toggle disabled><span class="lp-toggle__track" aria-hidden="true"><span class="lp-toggle__thumb"></span></span><span>${escape(label)}</span></button>`;
}

function switchMarkup(key, label, checked) {
  return `<button class="lp-toggle" type="button" role="switch" aria-checked="${checked}" data-light-setting="${key}"><span class="lp-toggle__track" aria-hidden="true"><span class="lp-toggle__thumb"></span></span><span>${escape(label)}</span></button>`;
}

function inputMarkup({ id, label, type = 'range', value, min, max, step, unit = '', key }) {
  const range = type === 'range';
  const limits = range ? ` min="${min}" max="${max}" step="${step}"` : '';
  return `<div class="lp-input">
  <div class="lp-input__label"><label for="${id}">${escape(label)}</label>${range ? `<output for="${id}">${escape(value)}${escape(unit)}</output>` : ''}</div>
  <input id="${id}" type="${type}" value="${escape(value)}"${limits} data-unit="${escape(unit)}" data-light-setting="${key}">
</div>`;
}

/**
 * The settings disclosure. A non-modal <details>; the panel surface is elevation 4 so
 * it casts its own long shadow. `idPrefix` keeps ids unique if the page has two.
 */
export function lightingPanelMarkup({ idPrefix = 'lighting', summary = 'Lighting' } = {}) {
  const range = (c) => inputMarkup({ ...c, id: `${idPrefix}-${c.key}` });
  const speed = LIGHT_CONTROLS.find((c) => c.key === 'speed');
  return `<details class="lp-panel" data-lighting-panel>
  <summary class="lp-panel__summary">${escape(summary)}</summary>
  <section class="lp-panel__sheet" aria-label="Lighting settings" data-lighting-sheet data-elevation="4">
    <div class="lp-panel__head"><h2 class="lp-panel__title">Lighting</h2><span class="lp-panel__badge">Preview</span></div>
    <p class="lp-panel__hint">Direction names the light source. Lower light lengthens shadows, a bigger source softens and fades them, and global illumination lightens them away from what casts them.</p>
    <fieldset class="lp-panel__fields" data-lighting-fields disabled>
      <legend class="lp-visually-hidden">Light and shadow</legend>
      ${LIGHT_CONTROLS.filter((c) => c.key !== 'speed').map(range).join('\n      ')}
      <div class="lp-panel__tints">
        ${inputMarkup({ id: `${idPrefix}-highlightTint`, label: 'Highlight tint', type: 'color', value: LIGHT_DEFAULTS.highlightTint, key: 'highlightTint' })}
        ${inputMarkup({ id: `${idPrefix}-shadowTint`, label: 'Shadow tint', type: 'color', value: LIGHT_DEFAULTS.shadowTint, key: 'shadowTint' })}
      </div>
      ${switchMarkup('offFrame', 'Off-frame shadows', LIGHT_DEFAULTS.offFrame)}
      ${switchMarkup('animated', 'Animate shadows', LIGHT_DEFAULTS.animated)}
      ${range(speed)}
    </fieldset>
    <p class="lp-panel__hint" data-lighting-motion></p>
    <p class="lp-panel__status" role="status" data-lighting-status>Turn on long shadows to adjust the light.</p>
    <button class="lp-button" type="button" data-lighting-reset disabled>Reset lighting</button>
    <noscript><p class="lp-panel__hint">Lighting needs JavaScript. The page works without it.</p></noscript>
  </section>
</details>`;
}
