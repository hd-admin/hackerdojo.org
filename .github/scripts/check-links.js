// Checks that every internal link and asset in the built site points to a file that exists.
// Usage: node .github/scripts/check-links.js <site-dir> [--skip <dir>]...
// CI skips pages/, which holds partials that other pages include. Jekyll also copies them
// out on their own, where their relative image paths don't resolve, but nothing links to them.
const fs = require('fs');
const path = require('path');

const args = process.argv.slice(2);
const skip = args.flatMap((a, i) => (args[i - 1] === '--skip' ? [a.replace(/\/+$/, '')] : []));
const root = path.resolve(args.find((a, i) => !a.startsWith('--') && args[i - 1] !== '--skip') || '_site');

function htmlFiles(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return skip.includes(path.relative(root, full).split(path.sep).join('/')) ? [] : htmlFiles(full);
    return entry.name.endsWith('.html') ? [full] : [];
  });
}

// GitHub Pages serves /foo from foo, foo.html or foo/index.html.
function exists(target) {
  const candidates = target.endsWith('/')
    ? [path.join(target, 'index.html')]
    : [target, target + '.html', path.join(target, 'index.html')];
  return candidates.some(c => fs.existsSync(c) && fs.statSync(c).isFile());
}

const external = /^(?:[a-z][a-z0-9+.-]*:|\/\/|#)/i;
let checked = 0;
const broken = [];

for (const file of htmlFiles(root)) {
  const html = fs.readFileSync(file, 'utf8').replace(/<!--[\s\S]*?-->/g, '');
  const page = '/' + path.relative(root, file).split(path.sep).join('/');

  // Links to a spot on the same page, e.g. href="#apply". Links carrying a fragment to another
  // page are left alone: some, like the banner's /#move, are handled by scripts rather than an id.
  const ids = new Set([...html.matchAll(/\sid\s*=\s*["']([^"']+)["']/gi)].map(m => m[1]));
  for (const [, fragment] of html.matchAll(/\shref\s*=\s*["']#([^"']+)["']/gi)) {
    checked++;
    if (!ids.has(fragment) && fragment !== 'top') broken.push(`${page}: #${fragment} (no element with that id)`);
  }

  for (const [, url] of html.matchAll(/\s(?:href|src)\s*=\s*["']([^"']+)["']/gi)) {
    if (external.test(url) || url.includes('{{')) continue;
    const clean = decodeURI(url.split(/[?#]/)[0]);
    if (!clean) continue;
    const target = clean.startsWith('/')
      ? path.join(root, clean)
      : path.join(path.dirname(file), clean);
    checked++;
    if (!exists(target)) broken.push(`${page}: ${url}`);
  }
}

console.log(`Checked ${checked} internal links and assets`);
if (broken.length) {
  console.log(`${broken.length} broken:`);
  for (const b of [...new Set(broken)]) console.log('  ' + b);
  process.exit(1);
}
console.log('No broken internal links or assets.');
