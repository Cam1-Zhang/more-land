/**
 * Post-process `dist/` after `expo export -p web` for GitHub Project Pages (`/repo-name/`).
 *
 * 1) Trailing slash: opening `.../repo-name` (no `/`) makes relative asset URLs resolve wrong;
 *    a tiny inline script redirects to `.../repo-name/` so the app loads like before.
 * 2) SPA fallback: GitHub serves `404.html` for unknown paths; copy `index.html` so client routing can boot.
 */
const fs = require('fs');
const path = require('path');

const dist = path.join(__dirname, '..', 'dist');
const index = path.join(dist, 'index.html');
const fallback = path.join(dist, '404.html');
const pkg = require(path.join(__dirname, '..', 'package.json'));
const basePath = `/${String(pkg.name || '').replace(/^\/+|\/+$/g, '')}`;

function injectTrailingSlashRedirect(html) {
  const marker = 'id="gh-pages-trailing-base"';
  if (html.includes(marker) || !basePath || basePath === '/') return html;
  const snippet = `<script ${marker}>!function(){var b=${JSON.stringify(
    basePath
  )},p=location.pathname;if(p===b)location.replace(b+"/"+location.search+location.hash);}();</script>`;
  return html.replace(/<head([^>]*)>/i, `<head$1>${snippet}`);
}

if (!fs.existsSync(index)) {
  console.error('copy-github-pages-spa-fallback: dist/index.html missing. Run export first.');
  process.exit(1);
}

let html = fs.readFileSync(index, 'utf8');
html = injectTrailingSlashRedirect(html);
fs.writeFileSync(index, html, 'utf8');
console.log('copy-github-pages-spa-fallback: injected trailing-slash redirect for', basePath);

fs.copyFileSync(index, fallback);
console.log('copy-github-pages-spa-fallback: wrote dist/404.html from index.html');
