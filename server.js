import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = 3000;
const host = '0.0.0.0';

// Configuration
const volunteerSignupUrl = process.env.VOLUNTEER_SIGNUP_URL || "https://script.google.com/macros/s/AKfycbyWdLS0Irx0dZReGRlIVql82pOY4FLb07oEcZter4EbGFMMNDG_DZUxUQr4x-HbPkM_/exec";
const moveQuestionUrl = process.env.MOVE_QUESTION_URL || "https://script.google.com/macros/s/AKfycbznG7JfRRelKXFmPapBXwYoEPRInTq-KXDBpaOCvNLdO7VpCDhNUN_mlkD3lztQt1JO/exec";

// Load volunteer tasks data
let volunteerTasks = [];
try {
  const dataPath = path.join(__dirname, 'data', 'volunteer_tasks.json');
  if (fs.existsSync(dataPath)) {
    volunteerTasks = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
  }
} catch (err) {
  console.error('Failed to load volunteer tasks data:', err);
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

// Setup EJS template engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Pass globals to templates
app.use((req, res, next) => {
  res.locals.volunteerSignupUrl = volunteerSignupUrl;
  res.locals.moveQuestionUrl = moveQuestionUrl;
  res.locals.volunteerTasks = volunteerTasks;
  next();
});

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
    
    // Check if user requested a test date e.g. ?date=2026-11-02
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

// Page routes
app.get('/', (req, res) => {
  res.render('pages/index', {
    title: 'Hacker Dojo - Connect to Silicon Valley'
  });
});

app.get(['/startups', '/startups/', '/startups.html'], (req, res) => {
  res.render('pages/startups', {
    title: 'Startups - Hacker Dojo'
  });
});

app.get(['/pricing', '/pricing/', '/pricing.html'], (req, res) => {
  res.render('pages/pricing', {
    title: 'Pricing - Hacker Dojo'
  });
});

app.get(['/impact-report', '/impact-report/', '/impact-report.html'], (req, res) => {
  res.render('pages/impact-report', {
    title: '2025 Impact Report - Hacker Dojo'
  });
});

app.get(['/accelerator', '/accelerator/', '/accelerator.html'], (req, res) => {
  res.render('pages/accelerator', {
    title: 'Accelerator - Hacker Dojo'
  });
});

app.get(['/hackerdojo5', '/hackerdojo5/', '/hackerdojo5.html'], (req, res) => {
  res.render('pages/hackerdojo5', {
    title: 'Dojo 5.0 - Hacker Dojo',
    moveQuestionUrl
  });
});

app.get(['/summer-camp', '/summer-camp/', '/summer-camp.html'], (req, res) => {
  res.render('pages/summer-camp', {
    title: 'Summer Camp 2026 - Hacker Dojo'
  });
});

app.get(['/volunteer', '/volunteer/', '/volunteer.html'], (req, res) => {
  res.render('pages/volunteer', {
    title: 'Volunteer for the Move - Hacker Dojo',
    cats: volunteerTasks,
    volunteerSignupUrl
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).render('pages/404', {
    title: 'Hacker Dojo - Page Not Found'
  });
});

// Verification check mode for build
if (process.argv.includes('--check')) {
  console.log('Verifying template compilation...');
  const routesToTest = [
    { view: 'pages/index', data: { title: 'Test Index' } },
    { view: 'pages/startups', data: { title: 'Test Startups' } },
    { view: 'pages/pricing', data: { title: 'Test Pricing' } },
    { view: 'pages/impact-report', data: { title: 'Test Impact' } },
    { view: 'pages/accelerator', data: { title: 'Test Accelerator' } },
    { view: 'pages/hackerdojo5', data: { title: 'Test HD5', moveQuestionUrl } },
    { view: 'pages/summer-camp', data: { title: 'Test Camp' } },
    { view: 'pages/volunteer', data: { title: 'Test Vol', cats: volunteerTasks, volunteerSignupUrl } },
    { view: 'pages/404', data: { title: 'Test 404' } },
  ];

  let errors = 0;
  for (const r of routesToTest) {
    try {
      app.render(r.view, r.data, (err, html) => {
        if (err) {
          console.error(`Error rendering ${r.view}:`, err);
          errors++;
        } else {
          console.log(`✓ ${r.view} compiled (${html.length} chars)`);
        }
      });
    } catch (err) {
      console.error(`Exception rendering ${r.view}:`, err);
      errors++;
    }
  }

  if (errors > 0) {
    process.exit(1);
  } else {
    console.log('All views compiled successfully!');
    process.exit(0);
  }
} else {
  app.listen(port, host, () => {
    console.log(`Hacker Dojo server running at http://${host}:${port}`);
  });
}
