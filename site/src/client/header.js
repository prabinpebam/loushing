/** Native navigation disclosure: dismissal, focus and exclusive header panels. */
export function initHeader() {
  const menu = document.querySelector('[data-header-menu]');
  if (!menu) return;
  const trigger = menu.querySelector('summary');
  const lighting = document.querySelector('[data-lighting-panel]');
  // Browsers can blur a newly hidden control before delivering the resize event.
  let focusedControl = null;
  document.addEventListener('focusin', (event) => {
    focusedControl = menu.contains(event.target) ? event.target : null;
  });
  menu.addEventListener('toggle', () => {
    const label = menu.open ? 'Close menu' : 'Open menu';
    trigger.setAttribute('aria-label', label);
    trigger.title = label;
    if (menu.open && lighting) lighting.open = false;
  });
  lighting?.addEventListener('toggle', () => {
    if (lighting.open) menu.open = false;
  });
  menu.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape' || !menu.open) return;
    event.preventDefault();
    menu.open = false;
    trigger.focus();
  });
  menu.addEventListener('focusout', (event) => {
    if (event.relatedTarget && !menu.contains(event.relatedTarget)) menu.open = false;
  });
  document.addEventListener('click', (event) => {
    if (menu.contains(event.target)) return;
    focusedControl = null;
    if (!menu.open) return;
    const restoreFocus = menu.contains(document.activeElement);
    menu.open = false;
    if (restoreFocus) trigger.focus();
  });
  addEventListener('resize', () => {
    const focused = menu.contains(document.activeElement) ? document.activeElement : focusedControl;
    if (getComputedStyle(trigger).display !== 'none') {
      if (!menu.open && focused) trigger.focus();
      return;
    }
    menu.open = false;
    if (focused && !focused.checkVisibility()) {
      document.querySelector('.l-header__brand').focus();
    }
  });
}
