/**
 * Hacker Dojo - Live Nexudus Membership Pricing Sync & Automatic Date Transition
 * Pulls current published tariffs and plans directly from hackerdojo.nexudus.site
 * Smooth, static DOM updates with zero cumulative layout shift (no jerkiness).
 */
(function () {
  'use strict';

  var NEXUDUS_API = 'https://hackerdojo.spaces.nexudus.com/api/public/plans/published';
  var BACKUP_API = '/api/plans';
  var CHECKOUT_BASE = 'https://hackerdojo.nexudus.site/hackerdojo/checkout/tariffs';

  // Default transition date: November 1, 2026 00:00:00 Pacific Time
  var DEFAULT_TRANSITION_DATE = new Date('2026-11-01T00:00:00-07:00');

  function getCurrentTime() {
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

        // Render values smoothly into existing static DOM
        renderPlans(plans, isAutoPast);

        // Update static banner without shifting layout
        var banner = document.getElementById('rate-transition-banner');
        var bannerText = document.getElementById('rate-transition-text');
        var toggleGroup = document.getElementById('rate-toggle-group');

        if (banner) {
          if (isAutoPast) {
            banner.style.background = '#f3f4f6';
            banner.style.border = '1px solid #e5e7eb';
            banner.style.color = '#374151';
            if (bannerText) {
              bannerText.innerHTML = '<strong>Current Rates Active:</strong> Showing active rates effective ' + transitionDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) + '.';
            }
            if (toggleGroup) toggleGroup.style.display = 'none';
          }
        }

        // Wire up preview buttons if present
        var btnCurrent = document.getElementById('btn-show-current');
        var btnFuture = document.getElementById('btn-show-future');
        if (btnCurrent && btnFuture) {
          btnCurrent.onclick = function () {
            renderPlans(plans, false);
            btnCurrent.style.background = '#f59e0b';
            btnCurrent.style.color = '#fff';
            btnFuture.style.background = '#fff';
            btnFuture.style.color = '#92400e';
          };
          btnFuture.onclick = function () {
            renderPlans(plans, true);
            btnFuture.style.background = '#f59e0b';
            btnFuture.style.color = '#fff';
            btnCurrent.style.background = '#fff';
            btnCurrent.style.color = '#92400e';
          };
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
