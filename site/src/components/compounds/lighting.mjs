/**
 * Lighting controls: a compact, non-modal disclosure for the experimental renderer.
 * Not for theme selection or glow, which are independent systems.
 * @tier 2
 * @a11y Native disclosure, labelled native inputs, switches and a polite status.
 * @key Enter/Space opens the disclosure; arrows adjust sliders; Escape closes it.
 */
import { html } from '../../lib/html.mjs';
import { LIGHT_CONTROLS, LIGHT_DEFAULTS } from '../../lib/lighting.mjs';
import { Button, LightInput, Toggle } from '../fundamentals.mjs';

/** The shared lighting disclosure. Settings are data from the portable engine. */
export function LightingPanel() {
  return html`<details class="c-lighting" data-lighting-panel>
  <summary class="c-lighting__summary">Lighting</summary>
  <section class="c-lighting__panel" aria-label="Lighting settings" data-elevation="4">
    <div class="c-lighting__head"><h2 class="c-lighting__title">Lighting</h2><span class="c-lighting__badge">Preview</span></div>
    <p class="c-lighting__hint">Direction names the light source. Lower light lengthens shadows, a bigger source softens and fades them, and global illumination lightens them away from what casts them.</p>
    <fieldset class="c-lighting__fields" data-lighting-fields disabled>
      <legend class="u-visually-hidden">Light and shadow</legend>
      ${LIGHT_CONTROLS.filter((c) => c.key !== 'speed').map((c) => LightInput({ ...c, id: `lighting-${c.key}`, data: { 'light-setting': c.key } }))}
      <div class="c-lighting__tints">
        ${LightInput({ id: 'lighting-highlightTint', label: 'Highlight tint', type: 'color', value: LIGHT_DEFAULTS.highlightTint, data: { 'light-setting': 'highlightTint' } })}
        ${LightInput({ id: 'lighting-shadowTint', label: 'Shadow tint', type: 'color', value: LIGHT_DEFAULTS.shadowTint, data: { 'light-setting': 'shadowTint' } })}
      </div>
      ${Toggle({ label: 'Off-frame shadows', checked: LIGHT_DEFAULTS.offFrame, data: { 'light-setting': 'offFrame' } })}
      ${Toggle({ label: 'Animate shadows', checked: LIGHT_DEFAULTS.animated, data: { 'light-setting': 'animated' } })}
      ${LightInput({ ...LIGHT_CONTROLS.find((c) => c.key === 'speed'), id: 'lighting-speed', data: { 'light-setting': 'speed' } })}
    </fieldset>
    <p class="c-lighting__hint" data-lighting-motion></p>
    <p class="c-lighting__status" role="status" data-lighting-status>Turn on long shadows to adjust the light.</p>
    ${Button({ label: 'Reset lighting', kind: 'quiet', disabled: true, data: { 'lighting-reset': 'true' } })}
    <noscript><p class="c-lighting__hint">Lighting needs JavaScript. The catalog works without it.</p></noscript>
  </section>
</details>`;
}
