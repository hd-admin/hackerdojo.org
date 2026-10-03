/**
 * Hacker Dojo - Live Nexudus Membership Pricing Sync & Automatic Date Transition
 * Pulls current published tariffs and plans directly from hackerdojo.nexudus.site
 * Automatically transitions to the new rates on the effective date (Nov 1, 2026).
 */
(function () {
  'use strict';

  var NEXUDUS_API = 'https://hackerdojo.spaces.nexudus.com/api/public/plans/published';
  var BACKUP_API = '/api/plans';
  var CHECKOUT_BASE = 'https://hackerdojo.nexudus.site/hackerdojo/checkout/tariffs';

  // Default transition date: November 1, 2026 00:00:00 Pacific Time
  var DEFAULT_TRANSITION_DATE = new Date('2026-11-01T00:00:00-07:00');

  function getCurrentTime() {
    // Allows testing future dates via URL query param: ?date=2026-11-05
    try {
      var params = new URLSearchParams(window.location.search);
      if (params.get('date')) {
        var testDate = new Date(params.get('date'));
        if (!isNaN(testDate.getTime())) return testDate;
      }
    } catch (e) {}
    return new Date();
  }

  function fetchPlans() {
    return fetch(NEXUDUS_API, { headers: { 'Accept': 'application/json' } })
      .then(function (r) {
        if (!r.ok) throw new Error('Nexudus direct HTTP ' + r.status);
        return r.json();
      })
      .catch(function () {
        return fetch(BACKUP_API).then(function (r) {
          if (!r.ok) throw new Error('Backup API HTTP ' + r.status);
          return r.json();
        });
      });
  }

  function cleanName(n) {
    return (n || '').replace(/^\*New\*\s*/i, '').trim().toLowerCase();
  }

  function formatPrice(p) {
    var num = parseFloat(p);
    return isNaN(num) ? p : Math.round(num);
  }

  function extractTransitionDate(plans) {
    for (var i = 0; i < plans.length; i++) {
      var desc = plans[i].Description || '';
      var m = desc.match(/Starting\s+([A-Za-z]+)\s+(\d{1,2})(?:st|nd|rd|th)?,\s+(\d{4})/i);
      if (m) {
        var parsed = new Date(m[1] + ' ' + m[2] + ', ' + m[3] + ' 00:00:00');
        if (!isNaN(parsed.getTime())) return parsed;
      }
    }
    return DEFAULT_TRANSITION_DATE;
  }

  function renderPlans(plans, showUpcoming) {
    var currentMap = {};
    var upcomingMap = {};

    plans.forEach(function (p) {
      var isUpcoming = (p.Name || '').indexOf('*New*') !== -1;
      var key = cleanName(p.Name);
      if (isUpcoming) {
        upcomingMap[key] = p;
      } else {
        currentMap[key] = p;
      }
    });

    // Pick active plan based on transition or toggle state
    var std = (showUpcoming && upcomingMap['standard']) ? upcomingMap['standard'] : (currentMap['standard'] || upcomingMap['standard']);
    var stu = (showUpcoming && upcomingMap['student']) ? upcomingMap['student'] : (currentMap['student'] || upcomingMap['student']);
    var ann = (showUpcoming && upcomingMap['annual']) ? upcomingMap['annual'] : (currentMap['annual'] || upcomingMap['annual']);
    var desk = currentMap['dedicated desk'] || upcomingMap['dedicated desk'];
    var hive = currentMap['hive'] || upcomingMap['hive'];

    // 1. Standard
    if (std) {
      var stdAmountEl = document.querySelector('#plan-standard-amount');
      if (stdAmountEl) stdAmountEl.textContent = formatPrice(std.Price);

      var stdBtn = document.querySelector('#plan-standard-btn');
      if (stdBtn) stdBtn.href = CHECKOUT_BASE + '?plan_id=' + std.Id;

      var stdAnnualSub = document.querySelector('#plan-standard-annual-sub');
      if (stdAnnualSub && ann) {
        var savedStd = Math.round((parseFloat(std.Price) * 12) - parseFloat(ann.Price));
        stdAnnualSub.innerHTML = 'or $' + formatPrice(ann.Price) + ' / year &mdash; save $' + savedStd;
      }
    }

    // 2. Student
    if (stu) {
      var stuAmountEl = document.querySelector('#plan-student-amount');
      if (stuAmountEl) stuAmountEl.textContent = formatPrice(stu.Price);

      var stuBtn = document.querySelector('#plan-student-btn');
      if (stuBtn) stuBtn.href = CHECKOUT_BASE + '?plan_id=' + stu.Id;
    }

    // 3. Annual
    if (ann) {
      var annAmountEl = document.querySelector('#annual-banner-amount');
      if (annAmountEl) annAmountEl.textContent = '$' + formatPrice(ann.Price);

      var annNoteEl = document.querySelector('#annual-banner-note');
      if (annNoteEl) {
        var moEquiv = Math.round(parseFloat(ann.Price) / 12);
        var stdPrice = std ? parseFloat(std.Price) : 150;
        var saved = Math.round((stdPrice * 12) - parseFloat(ann.Price));
        annNoteEl.innerHTML = 'Standard membership billed yearly is <strong>$' + formatPrice(ann.Price) + '</strong> &mdash; equivalent to <strong>$' + moEquiv + '/month</strong>. Save $' + saved + ' compared to monthly billing.';
      }

      var annBtn = document.querySelector('#annual-banner-btn');
      if (annBtn) annBtn.href = CHECKOUT_BASE + '?plan_id=' + ann.Id;
    }

    // 4. Dedicated Desk
    if (desk) {
      var deskAmountEl = document.querySelector('#desk-addon-amount');
      if (deskAmountEl) deskAmountEl.textContent = '$' + formatPrice(desk.Price);

      var deskBtn = document.querySelector('#desk-addon-btn');
      if (deskBtn) deskBtn.href = CHECKOUT_BASE + '?plan_id=' + desk.Id;
    }

    // 5. Hive
    if (hive) {
      var hiveAmountEl = document.querySelector('#hive-addon-amount');
      if (hiveAmountEl) hiveAmountEl.textContent = '$' + formatPrice(hive.Price);

      var hiveBtn = document.querySelector('#hive-addon-btn');
      if (hiveBtn) hiveBtn.href = CHECKOUT_BASE + '?plan_id=' + hive.Id;
    }
  }

  function init() {
    var container = document.querySelector('.pricing-section, #pricing-holder, .section-content');
    if (!container) return;

    fetchPlans()
      .then(function (data) {
        var plans = data && data.Plans ? data.Plans : [];
        if (!plans.length) return;

        var now = getCurrentTime();
        var transitionDate = extractTransitionDate(plans);
        var isAutoPast = now >= transitionDate;

        // Render initially with correct date mode
        renderPlans(plans, isAutoPast);

        // Add rate status banner & preview controls above plan-grid
        var planGrid = document.querySelector('.plan-grid');
        if (planGrid && !document.getElementById('rate-transition-banner')) {
          var banner = document.createElement('div');
          banner.id = 'rate-transition-banner';
          banner.style.cssText = 'grid-column: 1 / -1; margin-bottom: 24px; padding: 14px 20px; border-radius: 12px; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 12px; font-size: 14px;';

          if (isAutoPast) {
            banner.style.background = '#f3f4f6';
            banner.style.border = '1px solid #e5e7eb';
            banner.style.color = '#374151';
            banner.innerHTML = '<div style="display:flex;align-items:center;gap:8px;">' +
              '<svg style="width:18px;height:18px;color:#0e9f6e;" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"></path></svg>' +
              '<strong>Current Rates Active:</strong> Showing active rates effective ' + transitionDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) + '.</div>';
          } else {
            banner.style.background = '#fffbeb';
            banner.style.border = '1px solid #fde68a';
            banner.style.color = '#92400e';

            var daysLeft = Math.max(1, Math.ceil((transitionDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));

            banner.innerHTML = '<div style="display:flex;align-items:center;gap:10px;">' +
              '<span style="font-size:20px;">⚡</span>' +
              '<div><strong>Grandfathered Rates Available:</strong> Lock in current prices before ' + transitionDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) + ' (' + daysLeft + ' days left). Cancel anytime.</div>' +
              '</div>' +
              '<div style="display:flex;gap:6px;" id="rate-toggle-group">' +
                '<button type="button" id="btn-show-current" style="border:none;background:#f59e0b;color:#fff;padding:6px 12px;border-radius:6px;font-size:12px;font-weight:600;cursor:pointer;">Current Rates (Lock In)</button>' +
                '<button type="button" id="btn-show-future" style="border:1px solid #d97706;background:#fff;color:#92400e;padding:6px 12px;border-radius:6px;font-size:12px;font-weight:600;cursor:pointer;">Nov 1st Rates</button>' +
              '</div>';
          }

          planGrid.parentNode.insertBefore(banner, planGrid);

          // Wire up preview buttons if present
          var btnCurrent = document.getElementById('btn-show-current');
          var btnFuture = document.getElementById('btn-show-future');
          if (btnCurrent && btnFuture) {
            btnCurrent.addEventListener('click', function () {
              renderPlans(plans, false);
              btnCurrent.style.background = '#f59e0b';
              btnCurrent.style.color = '#fff';
              btnFuture.style.background = '#fff';
              btnFuture.style.color = '#92400e';
            });
            btnFuture.addEventListener('click', function () {
              renderPlans(plans, true);
              btnFuture.style.background = '#f59e0b';
              btnFuture.style.color = '#fff';
              btnCurrent.style.background = '#fff';
              btnCurrent.style.color = '#92400e';
            });
          }
        }

        // Live badge
        var liveBadge = document.getElementById('nexudus-live-sync-badge');
        if (!liveBadge) {
          liveBadge = document.createElement('div');
          liveBadge.id = 'nexudus-live-sync-badge';
          liveBadge.style.cssText = 'text-align:center;font-size:13px;color:#777;margin:18px auto 0;display:flex;align-items:center;justify-content:center;gap:6px;';
          liveBadge.innerHTML = '<svg style="width:14px;height:14px;color:#0e9f6e;" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"></path></svg> Real-time membership data synced with <a href="' + CHECKOUT_BASE + '" target="_blank" style="color:#6d3bdb;text-decoration:underline;">hackerdojo.nexudus.site</a>';
          var parentSection = document.querySelector('.pricing-section .section-content') || document.querySelector('.section-pricing');
          if (parentSection) parentSection.appendChild(liveBadge);
        }
      })
      .catch(function (err) {
        console.warn('Could not sync live pricing from Nexudus:', err);
      });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
