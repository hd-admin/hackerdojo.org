import express from 'express';
import path from 'path';
import fs from 'fs';
import { createRequire } from 'module';
import { Liquid } from 'liquidjs';
import { fileURLToPath } from 'url';

const require = createRequire(import.meta.url);
const yaml = require('js-yaml');

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = 3000;
const host = '0.0.0.0';

// Load Jekyll _config.yml
let jekyllConfig = {};
try {
  const configPath = path.join(__dirname, '_config.yml');
  if (fs.existsSync(configPath)) {
    jekyllConfig = yaml.load(fs.readFileSync(configPath, 'utf8')) || {};
  }
} catch (e) {
  console.warn('Failed to load _config.yml:', e.message);
}

// Load _data/volunteer_tasks.yml
let volunteerTasks = [];
try {
  const vPath = path.join(__dirname, '_data', 'volunteer_tasks.yml');
  if (fs.existsSync(vPath)) {
    volunteerTasks = yaml.load(fs.readFileSync(vPath, 'utf8')) || [];
  }
} catch (err) {
  console.warn('Failed to load volunteer_tasks.yml:', err.message);
}

// Initialize LiquidJS engine for native Jekyll template rendering
const engine = new Liquid({
  root: [
    __dirname,
    path.join(__dirname, '_layouts'),
    path.join(__dirname, '_includes'),
    path.join(__dirname, 'pages'),
    path.join(__dirname, 'pages/home')
  ],
  extname: '.html',
  dynamicPartials: false,
  jekyllInclude: true
});

// Register Jekyll include_relative tag
engine.registerTag('include_relative', {
  parse: function (tagToken) {
    this.file = tagToken.args.trim();
  },
  render: async function (ctx, emitter) {
    const filePath = path.join(__dirname, this.file);
    if (!fs.existsSync(filePath)) {
      throw new Error(`File not found for include_relative: ${this.file}`);
    }
    const content = fs.readFileSync(filePath, 'utf8');
    const html = await engine.parseAndRender(content, ctx.getAll());
    emitter.write(html);
  }
});

// Helper to render any Jekyll HTML page with YAML front-matter & layout
async function renderJekyllPage(fileName, customScope = {}) {
  const fullPath = path.join(__dirname, fileName);
  if (!fs.existsSync(fullPath)) return null;

  const raw = fs.readFileSync(fullPath, 'utf8');
  const fmM = raw.match(/^---([\s\S]*?)---\n/);
  let frontMatter = {};
  if (fmM) {
    try {
      frontMatter = yaml.load(fmM[1]) || {};
    } catch (e) {}
  }
  const body = raw.replace(/^---[\s\S]*?---\n/, '');

  const scope = {
    site: {
      ...jekyllConfig,
      data: {
        volunteer_tasks: volunteerTasks
      }
    },
    page: {
      ...frontMatter,
      ...customScope
    }
  };

  const renderedBody = await engine.parseAndRender(body, scope);

  const layoutName = frontMatter.layout || 'default';
  const layoutPath = path.join(__dirname, '_layouts', `${layoutName}.html`);
  if (fs.existsSync(layoutPath)) {
    const layoutRaw = fs.readFileSync(layoutPath, 'utf8');
    scope.content = renderedBody;
    return await engine.parseAndRender(layoutRaw, scope);
  }
  return renderedBody;
}

// Live Nexudus plans cache & helper
let cachedNexudusPlans = null;
let lastNexudusFetch = 0;
const NEXUDUS_CACHE_TTL = 10 * 60 * 1000; // 10 minutes

async function getNexudusPlans() {
  const now = Date.now();
  if (cachedNexudusPlans && (now - lastNexudusFetch < NEXUDUS_CACHE_TTL)) {
    return cachedNexudusPlans;
  }
  try {
    const res = await fetch('https://hackerdojo.spaces.nexudus.com/api/public/plans/published', {
      headers: { 'Accept': 'application/json', 'User-Agent': 'HackerDojoWebsite/1.0' },
      signal: AbortSignal.timeout(6000)
    });
    if (res.ok) {
      const data = await res.json();
      if (data && Array.isArray(data.Plans) && data.Plans.length > 0) {
        cachedNexudusPlans = data;
        lastNexudusFetch = now;
        return cachedNexudusPlans;
      }
    }
  } catch (err) {
    console.warn('[Nexudus] Live fetch failed, using fallback:', err.message);
  }

  // Fallback to local snapshot
  if (!cachedNexudusPlans) {
    try {
      const snapPath = path.join(__dirname, 'data', 'nexudus_plans.json');
      if (fs.existsSync(snapPath)) {
        cachedNexudusPlans = JSON.parse(fs.readFileSync(snapPath, 'utf8'));
      }
    } catch (e) {
      console.error('[Nexudus] Fallback error:', e);
    }
  }
  return cachedNexudusPlans || { Plans: [] };
}

// Serve static assets
app.use('/static', express.static(path.join(__dirname, 'static')));
app.get('/CNAME', (req, res) => res.sendFile(path.join(__dirname, 'CNAME')));
app.get('/favicon.ico', (req, res) => res.sendFile(path.join(__dirname, 'static/images/favicon/hackerdojo.ico')));

// API route to get current Nexudus plans with automatic date transition
app.get('/api/plans', async (req, res) => {
  try {
    const data = await getNexudusPlans();
    const plans = data.Plans || [];
    const transitionDate = new Date('2026-11-01T00:00:00-07:00');

    let now = new Date();
    if (req.query.date) {
      const testD = new Date(String(req.query.date));
      if (!isNaN(testD.getTime())) now = testD;
    }
    const isPastTransition = now >= transitionDate;

    res.setHeader('Cache-Control', 'public, max-age=300');
    res.json({
      Plans: plans,
      transitionDate: transitionDate.toISOString(),
      isPastTransition,
      effectiveDateFormatted: 'November 1, 2026'
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch plans', message: err.message });
  }
});

// Page routes (rendering native Jekyll templates)
const pageRoutes = [
  { paths: ['/'], file: 'index.html' },
  { paths: ['/startups', '/startups/', '/startups.html'], file: 'startups.html' },
  { paths: ['/pricing', '/pricing/', '/pricing.html'], file: 'pricing.html' },
  { paths: ['/impact-report', '/impact-report/', '/impact-report.html'], file: 'impact-report.html' },
  { paths: ['/accelerator', '/accelerator/', '/accelerator.html'], file: 'accelerator.html' },
  { paths: ['/volunteer', '/volunteer/', '/volunteer.html'], file: 'volunteer.html' },
  { paths: ['/hackerdojo5', '/hackerdojo5/', '/hackerdojo5.html'], file: 'hackerdojo5.html' },
  { paths: ['/summer-camp', '/summer-camp/', '/summer-camp.html'], file: 'summer-camp.html' }
];

pageRoutes.forEach(({ paths, file }) => {
  app.get(paths, async (req, res) => {
    try {
      const html = await renderJekyllPage(file);
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.send(html);
    } catch (err) {
      console.error(`Error rendering ${file}:`, err);
      res.status(500).send(`Server Error rendering ${file}: ${err.message}`);
    }
  });
});

// 404 handler
app.use(async (req, res) => {
  try {
    const html = await renderJekyllPage('404.html');
    res.status(404).setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(html || '<h1>404 Not Found</h1>');
  } catch (e) {
    res.status(404).send('404 Not Found');
  }
});

// Verification check mode
if (process.argv.includes('--check')) {
  console.log('Verifying Jekyll template compilation...');
  try {
    for (const { file } of pageRoutes) {
      const html = await renderJekyllPage(file);
      if (!html || html.length === 0) throw new Error(`Empty render for ${file}`);
    }
    const notFound = await renderJekyllPage('404.html');
    if (!notFound) throw new Error('Empty render for 404.html');
    console.log('All Jekyll templates compiled and rendered successfully with LiquidJS!');
    process.exit(0);
  } catch (err) {
    console.error('Template compilation failed:', err);
    process.exit(1);
  }
} else {
  app.listen(port, host, () => {
    console.log(`Hacker Dojo Jekyll/Liquid server running at http://${host}:${port}`);
  });
}
