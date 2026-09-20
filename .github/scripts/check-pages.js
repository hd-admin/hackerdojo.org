// Loads every page of the built site at phone and desktop widths and fails if a page can be
// scrolled sideways, hits a JavaScript error, fails to load one of its own files, or has a
// missing or duplicate title.
// Usage: node .github/scripts/check-pages.js <site-dir>   (needs the playwright package)
const http = require('http');
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const root = path.resolve(process.argv[2] || '_site');

// Phones and tablets use overlay scrollbars. Desktop browsers on Windows and Linux reserve
// ~15px for the scrollbar, which is what exposes `width: 100vw` bugs.
const viewports = [
  ...[320, 360, 375, 390, 414, 430, 768].map(width => ({ width, phone: true })),
  ...[768, 1024, 1280].map(width => ({ width, phone: false })),
];

const types = {
  '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.json': 'application/json',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.gif': 'image/gif',
  '.svg': 'image/svg+xml', '.webp': 'image/webp', '.avif': 'image/avif', '.ico': 'image/x-icon',
  '.woff': 'font/woff', '.woff2': 'font/woff2',
};

// Serve the site the way GitHub Pages does: /foo/ -> foo/index.html, /foo -> foo.html.
function fileFor(urlPath) {
  const base = path.join(root, decodeURIComponent(urlPath));
  const candidates = urlPath.endsWith('/')
    ? [path.join(base, 'index.html')]
    : [base, base + '.html', path.join(base, 'index.html')];
  return candidates.find(c => fs.existsSync(c) && fs.statSync(c).isFile());
}

const server = http.createServer((req, res) => {
  const file = fileFor(new URL(req.url, 'http://localhost').pathname);
  if (!file) {
    res.writeHead(404);
    return res.end();
  }
  res.writeHead(200, { 'Content-Type': types[path.extname(file).toLowerCase()] || 'application/octet-stream' });
  fs.createReadStream(file).pipe(res);
});

// Real pages only: pages/ holds partials that other pages include.
function pageUrls(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    const full = path.join(dir, entry.name);
    const rel = path.relative(root, full).split(path.sep).join('/');
    if (entry.isDirectory()) return rel === 'pages' ? [] : pageUrls(full);
    return entry.name.endsWith('.html') ? ['/' + rel.replace(/(^|\/)index\.html$/, '$1')] : [];
  });
}

// Runs in the page: how far it scrolls sideways, and the outermost elements that stick out.
function measure() {
  const width = document.documentElement.clientWidth;
  const outside = r => r.width > 0 && r.right > width + 0.5;
  const ignored = el => {
    for (let p = el; p && p !== document.body; p = p.parentElement) {
      const style = getComputedStyle(p);
      if (style.position === 'fixed') return true;
      if (p !== el && style.overflowX !== 'visible' && !outside(p.getBoundingClientRect())) return true;
    }
    return false;
  };
  const culprits = [];
  for (const el of document.body.querySelectorAll('*')) {
    const r = el.getBoundingClientRect();
    if (!outside(r) || ignored(el)) continue;
    const parent = el.parentElement.getBoundingClientRect();
    if (outside(parent) && Math.abs(parent.right - r.right) < 1) continue;
    const name = el.id ? '#' + el.id : el.tagName.toLowerCase() + [...el.classList].slice(0, 3).map(c => '.' + c).join('');
    culprits.push(`${name} ends at ${Math.round(r.right)}px`);
  }
  return {
    overflow: document.documentElement.scrollWidth - width,
    scrollbar: innerWidth - width,
    culprits: culprits.slice(0, 5),
  };
}

async function check(browser, base, { url, width, phone }) {
  const context = await browser.newContext({ viewport: { width, height: 800 }, isMobile: phone, hasTouch: phone });
  try {
    // Keep CI runs out of the site's Google Analytics and Ads data.
    await context.route(/google-analytics\.com|googletagmanager\.com|doubleclick\.net/, route => route.abort());
    // Visit as a returning visitor: the moving popup locks page scrolling while it's open.
    await context.addInitScript(() => {
      try { sessionStorage.setItem('dojo-move-dismissed', '1'); } catch (e) {}
    });
    const page = await context.newPage();
    // Problems with the page itself. Anything loaded from another site (fonts, CDNs, the
    // analytics we block above) is out of our hands, so only same-origin failures count.
    const problems = [];
    const ours = u => u.startsWith(base);
    page.on('pageerror', e => problems.push(`JavaScript error: ${e.message.split('\n')[0]}`));
    page.on('console', m => {
      const from = m.location() && m.location().url;
      if (m.type() === 'error' && (!from || ours(from))) problems.push(`console error: ${m.text().slice(0, 200)}`);
    });
    page.on('requestfailed', r => {
      if (ours(r.url())) problems.push(`failed to load ${r.url().slice(base.length)} (${(r.failure() || {}).errorText})`);
    });
    page.on('response', r => {
      if (ours(r.url()) && r.status() >= 400) problems.push(`${r.status()} for ${r.url().slice(base.length)}`);
    });
    await page.goto(base + url, { waitUntil: 'load', timeout: 30000 }).catch(e => {
      console.log(`  note: ${url} at ${width}px didn't finish loading (${e.message.split('\n')[0]}); measuring anyway`);
    });
    if (phone) await page.addStyleTag({ content: 'html { scrollbar-width: none; }' });
    // Wait for fonts and any finite load-in animations (up to 5s) before measuring.
    await page.evaluate(() => Promise.race([
      Promise.all([
        document.fonts.ready,
        ...document.getAnimations()
          .filter(a => a.effect && a.effect.getTiming().iterations !== Infinity)
          .map(a => a.finished.catch(() => {})),
      ]),
      new Promise(resolve => setTimeout(resolve, 5000)),
    ]).then(() => true));
    return { ...(await page.evaluate(measure)), title: await page.title(), problems };
  } finally {
    await context.close();
  }
}

(async () => {
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  // Headless Chromium hides scrollbars by default; keep them so desktop widths get a real one.
  const browser = await chromium.launch({ ignoreDefaultArgs: ['--hide-scrollbars'] });
  const jobs = pageUrls(root).sort().flatMap(url => viewports.map(v => ({ url, ...v })));
  const results = [];
  let next = 0;
  await Promise.all(Array.from({ length: 4 }, async () => {
    while (next < jobs.length) {
      const job = jobs[next++];
      results.push({ ...job, ...(await check(browser, base, job)) });
    }
  }));
  await browser.close();
  server.closeAllConnections();
  server.close();

  const urls = [...new Set(jobs.map(j => j.url))];
  console.log(`Checked ${urls.length} pages at ${viewports.length} widths (${jobs.length} checks)`);
  if (Math.max(...results.filter(r => !r.phone).map(r => r.scrollbar)) <= 0) {
    console.log('::warning::Desktop checks ran without a scrollbar, so width: 100vw overflows were not tested');
  }
  let failed = false;

  // Sideways scroll
  const tooWide = results
    .filter(r => r.overflow > 0)
    .sort((a, b) => a.url.localeCompare(b.url) || a.width - b.width || a.phone - b.phone);
  if (tooWide.length) {
    failed = true;
    console.log(`${tooWide.length} of them scroll sideways:`);
    for (const f of tooWide) {
      console.log(`  ${f.url} at ${f.width}px (${f.phone ? 'phone' : 'desktop'}): ${f.overflow}px too wide`);
      for (const c of f.culprits) console.log(`      ${c}`);
    }
  } else {
    console.log('No page scrolls sideways.');
  }

  // Errors and failed files, listed once per page however many widths hit them
  const problems = new Map();
  for (const r of results) {
    for (const p of r.problems) problems.set(r.url + '\n' + p, { url: r.url, problem: p });
  }
  if (problems.size) {
    failed = true;
    console.log(`${problems.size} errors or missing files:`);
    for (const { url, problem } of [...problems.values()].sort((a, b) => a.url.localeCompare(b.url))) {
      console.log(`  ${url}: ${problem}`);
    }
  } else {
    console.log('No JavaScript errors, and every page loaded all of its own files.');
  }

  // Titles: every page needs one, and no two pages should share it
  const titles = new Map(results.map(r => [r.url, r.title]));
  const titleProblems = [];
  for (const url of urls) {
    const title = (titles.get(url) || '').trim();
    if (!title) titleProblems.push(`${url}: no title`);
    else {
      const shared = urls.filter(o => o !== url && (titles.get(o) || '').trim() === title);
      if (shared.length) titleProblems.push(`${url}: same title as ${shared.join(', ')} ("${title}")`);
    }
  }
  if (titleProblems.length) {
    failed = true;
    console.log(`${titleProblems.length} title problems:`);
    for (const t of titleProblems) console.log('  ' + t);
  } else {
    console.log('Every page has its own title.');
  }

  if (failed) process.exitCode = 1;
})().catch(e => {
  console.error(e);
  process.exit(1);
});
