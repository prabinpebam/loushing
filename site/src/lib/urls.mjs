/**
 * Site URLs. Pages link root-relative through url(), so the site can be served from a
 * sub-path (a GitHub Pages project site) by setting the base once at build time.
 * @tier 0
 */
let BASE = '/';
let ORIGIN = '';

export function setBase(base = '/', origin = '') {
  BASE = base.endsWith('/') ? base : `${base}/`;
  ORIGIN = origin.replace(/\/$/, '');
}

/** A site path such as "/items/slate" -> "<base>items/slate". */
export function url(path = '/') {
  return BASE + String(path).replace(/^\//, '');
}

/** An absolute URL when the origin is known (feeds, llms.txt); otherwise the site path. */
export function absolute(path = '/') {
  return ORIGIN + url(path);
}

export function base() {
  return BASE;
}
