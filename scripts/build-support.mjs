// Builds the help center (support/pages.mjs + support/support.css) into web/public/support/ so Vite ships it at /support/.
import { mkdirSync, writeFileSync, copyFileSync, rmSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { pages } from '../support/pages.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..'), out = join(root, 'web', 'public', 'support');
rmSync(out, { recursive: true, force: true }); mkdirSync(out, { recursive: true });
copyFileSync(join(root, 'support', 'support.css'), join(out, 'support.css'));
const esc = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');
const UPDATED = '2026-11-08';

for (const [i, p] of pages.entries()) {
  const file = `${p.slug}.html`, topics = pages.map(q => `<li><a href="${q.slug}.html"${q.slug === p.slug ? ' aria-current="page"' : ''}>${esc(q.nav)}</a></li>`).join('');
  const guide = pages.filter(q => q.slug !== 'index'), gi = guide.findIndex(q => q.slug === p.slug);
  const prev = p.slug === 'index' ? null : (gi > 0 ? guide[gi - 1] : pages[0]), next = p.slug === 'index' ? guide[0] : guide[gi + 1];
  const pager = `<div class="pager">${prev ? `<a href="${prev.slug}.html"><small>Previous</small>${esc(prev.nav)}</a>` : '<span></span>'}${next ? `<a href="${next.slug}.html"><small>Next</small>${esc(next.nav)}</a>` : '<span></span>'}</div>`;
  const title = p.slug === 'index' ? 'Exe Help center' : `${p.title} · Exe Help`;
  writeFileSync(join(out, file), `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(p.summary)}">
<link rel="icon" type="image/png" sizes="32x32" href="../icons/favicon-32.png">
<link rel="stylesheet" href="support.css">
</head>
<body>
<a class="skip" href="#main">Skip to content</a>
<header class="site-header"><a class="brand" href="index.html"><img src="../icons/icon-192.png" alt="" width="28" height="28">Exe <span>Help</span></a><a class="open-app" href="../">Open Exe</a></header>
<div class="layout">
<details class="topics"><summary>Help topics</summary><nav aria-label="Help topics"><ul>${topics}</ul></nav></details>
<main id="main" tabindex="-1">
<h1>${esc(p.slug === 'index' ? 'How can we help?' : p.title)}</h1>
${p.body}
${pager}
</main>
</div>
<footer>Exe help center · last updated ${UPDATED}</footer>
<script>if (matchMedia('(min-width: 900px)').matches) document.querySelector('.topics').open = true;</script>
</body>
</html>
`);
  void i;
}
console.log(`built ${pages.length} help pages into web/public/support`);
