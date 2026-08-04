/**
 * Auction Space client — gallery, detail, login OTP, place bid.
 * window.HD_AUCTION_API = optional API origin (no trailing slash)
 */
(function () {
  'use strict';

  var state = {
    user: null,
    artwork: null,
    artworkId: null,
  };

  function apiBase() {
    if (typeof window.HD_AUCTION_API === 'string' && window.HD_AUCTION_API) {
      return window.HD_AUCTION_API.replace(/\/$/, '');
    }
    return '';
  }

  function apiUrl(path) {
    return apiBase() + path;
  }

  async function fetchJson(path, options) {
    var opts = options || {};
    var res = await fetch(apiUrl(path), {
      credentials: 'include',
      headers: Object.assign(
        { Accept: 'application/json' },
        opts.body ? { 'Content-Type': 'application/json' } : {},
        opts.headers || {}
      ),
      method: opts.method || 'GET',
      body: opts.body ? JSON.stringify(opts.body) : undefined,
    });
    if (res.status === 204) return null;
    var data = await res.json().catch(function () {
      return null;
    });
    if (!res.ok) {
      var msg =
        (data && data.error && data.error.message) ||
        'Request failed (' + res.status + ')';
      var err = new Error(msg);
      err.status = res.status;
      err.code = data && data.error && data.error.code;
      err.payload = data;
      throw err;
    }
    return data;
  }

  function formatMoney(value) {
    if (value == null || value === '') return '—';
    var n = Number(value);
    if (!isFinite(n)) return String(value);
    return (
      '$' +
      n.toLocaleString(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })
    );
  }

  function formatCountdown(endsAt) {
    var end = new Date(endsAt).getTime();
    if (!isFinite(end)) return { text: '—', ended: true };
    var ms = end - Date.now();
    if (ms <= 0) return { text: 'Ended', ended: true };
    var totalSec = Math.floor(ms / 1000);
    var days = Math.floor(totalSec / 86400);
    var hours = Math.floor((totalSec % 86400) / 3600);
    var mins = Math.floor((totalSec % 3600) / 60);
    var secs = totalSec % 60;
    var pad = function (n) {
      return n < 10 ? '0' + n : String(n);
    };
    if (days > 0) {
      return {
        text: days + 'd ' + pad(hours) + 'h ' + pad(mins) + 'm',
        ended: false,
      };
    }
    return {
      text: pad(hours) + ':' + pad(mins) + ':' + pad(secs),
      ended: false,
    };
  }

  function bindCountdowns(root) {
    var nodes = (root || document).querySelectorAll('[data-ends-at]');
    function tick() {
      nodes.forEach(function (el) {
        var c = formatCountdown(el.getAttribute('data-ends-at'));
        el.textContent = c.text;
        if (c.ended) el.classList.add('is-ended');
        else el.classList.remove('is-ended');
      });
    }
    tick();
    if (nodes.length) setInterval(tick, 1000);
  }

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  async function refreshSession() {
    try {
      var data = await fetchJson('/api/auction/auth/session');
      state.user = (data && data.user) || null;
    } catch (e) {
      state.user = null;
    }
    return state.user;
  }

  /* ---------- Modal ---------- */

  function ensureModal() {
    var existing = document.getElementById('auction-modal');
    if (existing) return existing;
    var wrap = document.createElement('div');
    wrap.id = 'auction-modal';
    wrap.className = 'auction-modal';
    wrap.hidden = true;
    wrap.innerHTML =
      '<div class="auction-modal-backdrop" data-close="1"></div>' +
      '<div class="auction-modal-dialog" role="dialog" aria-modal="true" aria-labelledby="auction-modal-title">' +
      '<button type="button" class="auction-modal-close" data-close="1" aria-label="Close">×</button>' +
      '<h2 id="auction-modal-title" class="auction-modal-title"></h2>' +
      '<div id="auction-modal-body" class="auction-modal-body"></div>' +
      '</div>';
    document.body.appendChild(wrap);
    wrap.addEventListener('click', function (e) {
      if (e.target && e.target.getAttribute('data-close') === '1') closeModal();
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && !wrap.hidden) closeModal();
    });
    return wrap;
  }

  function openModal(title, bodyHtml) {
    var modal = ensureModal();
    modal.querySelector('#auction-modal-title').textContent = title;
    modal.querySelector('#auction-modal-body').innerHTML = bodyHtml;
    modal.hidden = false;
    document.body.classList.add('auction-modal-open');
    var focusable = modal.querySelector('input, button:not([data-close])');
    if (focusable) focusable.focus();
  }

  function closeModal() {
    var modal = document.getElementById('auction-modal');
    if (modal) modal.hidden = true;
    document.body.classList.remove('auction-modal-open');
  }

  function setModalError(msg) {
    var el = document.getElementById('auction-modal-error');
    if (el) {
      el.textContent = msg || '';
      el.hidden = !msg;
    }
  }

  /* ---------- Login flow ---------- */

  function showLoginForm(opts) {
    opts = opts || {};
    openModal(
      'Log In to Bid',
      '<p class="auction-modal-help">Enter your email. We will send a one-time code.</p>' +
        '<form id="auction-login-form" class="auction-form">' +
        '<label>Name <span class="optional">(optional)</span>' +
        '<input type="text" name="name" autocomplete="name" placeholder="Jamie" /></label>' +
        '<label>Email' +
        '<input type="email" name="email" required autocomplete="email" placeholder="you@example.com" /></label>' +
        '<p id="auction-modal-error" class="auction-modal-error" hidden></p>' +
        '<div class="auction-modal-actions">' +
        '<button type="button" class="button" data-close="1">Cancel</button>' +
        '<button type="submit" class="button button-red">Send Code</button>' +
        '</div></form>'
    );

    document.getElementById('auction-login-form').addEventListener('submit', async function (e) {
      e.preventDefault();
      setModalError('');
      var fd = new FormData(e.target);
      var email = String(fd.get('email') || '').trim();
      var name = String(fd.get('name') || '').trim();
      var btn = e.target.querySelector('[type=submit]');
      btn.disabled = true;
      try {
        var res = await fetchJson('/api/auction/auth/request-link', {
          method: 'POST',
          body: { email: email, name: name || undefined },
        });
        showOtpForm({
          email: email,
          devOtp: res && res.dev_otp,
          onSuccess: opts.onSuccess,
        });
      } catch (err) {
        setModalError(err.message || 'Could not send code');
        btn.disabled = false;
      }
    });
  }

  function showOtpForm(opts) {
    var hint = opts.devOtp
      ? '<p class="auction-modal-dev">Dev code: <strong>' +
        escapeHtml(opts.devOtp) +
        '</strong> (email not configured)</p>'
      : '<p class="auction-modal-help">Check your inbox for a 6-digit code.</p>';

    openModal(
      'Enter Login Code',
      hint +
        '<form id="auction-otp-form" class="auction-form">' +
        '<label>Code' +
        '<input type="text" name="token" required inputmode="numeric" autocomplete="one-time-code" pattern="[0-9]{6}" maxlength="6" placeholder="123456" /></label>' +
        '<p id="auction-modal-error" class="auction-modal-error" hidden></p>' +
        '<div class="auction-modal-actions">' +
        '<button type="button" class="button" id="auction-otp-back">Back</button>' +
        '<button type="submit" class="button button-red">Verify</button>' +
        '</div></form>'
    );

    document.getElementById('auction-otp-back').addEventListener('click', function () {
      showLoginForm({ onSuccess: opts.onSuccess });
    });

    document.getElementById('auction-otp-form').addEventListener('submit', async function (e) {
      e.preventDefault();
      setModalError('');
      var fd = new FormData(e.target);
      var token = String(fd.get('token') || '').trim();
      var btn = e.target.querySelector('[type=submit]');
      btn.disabled = true;
      try {
        var res = await fetchJson('/api/auction/auth/verify', {
          method: 'POST',
          body: { email: opts.email, token: token },
        });
        state.user = res.user;
        closeModal();
        if (typeof opts.onSuccess === 'function') opts.onSuccess(res.user);
      } catch (err) {
        setModalError(err.message || 'Invalid code');
        btn.disabled = false;
      }
    });
  }

  /* ---------- Bid flow ---------- */

  function showBidForm(art) {
    var min = art.minimum_next_bid;
    openModal(
      'Place a Bid',
      '<p class="auction-modal-help"><strong>' +
        escapeHtml(art.title) +
        '</strong><br/>Minimum bid: ' +
        formatMoney(min) +
        '</p>' +
        '<form id="auction-bid-form" class="auction-form">' +
        '<label>Amount (USD)' +
        '<input type="text" name="amount" required inputmode="decimal" value="' +
        escapeHtml(min) +
        '" /></label>' +
        '<p id="auction-modal-error" class="auction-modal-error" hidden></p>' +
        '<div class="auction-modal-actions">' +
        '<button type="button" class="button" data-close="1">Cancel</button>' +
        '<button type="submit" class="button button-red">Submit Bid</button>' +
        '</div>' +
        '<p class="auction-note">You will get an email if someone outbids you.</p>' +
        '</form>'
    );

    document.getElementById('auction-bid-form').addEventListener('submit', async function (e) {
      e.preventDefault();
      setModalError('');
      var fd = new FormData(e.target);
      var amount = String(fd.get('amount') || '').trim();
      var btn = e.target.querySelector('[type=submit]');
      btn.disabled = true;
      try {
        var res = await fetchJson('/api/auction/bids', {
          method: 'POST',
          body: { artwork_id: art.id, amount: amount },
        });
        closeModal();
        openModal(
          'Bid Placed',
          '<p class="auction-modal-help">Your bid of <strong>' +
            formatMoney(res.bid.amount) +
            '</strong> is the current high bid.</p>' +
            '<div class="auction-modal-actions">' +
            '<button type="button" class="button button-red" data-close="1">Done</button>' +
            '</div>'
        );
        if (state.artworkId) {
          var detail = document.getElementById('auction-detail');
          if (detail) mountDetail(detail, state.artworkId);
        }
      } catch (err) {
        setModalError(err.message || 'Bid failed');
        btn.disabled = false;
      }
    });
  }

  function startBidFlow(art) {
    if (!art) return;
    if (!state.user) {
      showLoginForm({
        onSuccess: function () {
          showBidForm(art);
        },
      });
      return;
    }
    showBidForm(art);
  }

  /* ---------- Gallery / detail ---------- */

  function cardHtml(art) {
    var bidLabel =
      art.current_bid != null
        ? 'Current ' + formatMoney(art.current_bid)
        : 'Starting ' + formatMoney(art.starting_bid);
    var img = art.primary_image
      ? '<img class="auction-card-image" src="' +
        escapeHtml(art.primary_image) +
        '" alt="' +
        escapeHtml(art.title) +
        '" loading="lazy" />'
      : '<div class="auction-card-image-placeholder">No image</div>';
    var href = '/auction/artwork/?id=' + encodeURIComponent(art.id);
    return (
      '<article class="auction-card">' +
      '<a class="auction-card-link" href="' +
      href +
      '">' +
      img +
      '<div class="auction-card-body">' +
      '<div class="auction-card-title">' +
      escapeHtml(art.title) +
      '</div>' +
      '<div class="auction-card-artist">' +
      escapeHtml(art.artist) +
      '</div>' +
      '<div class="auction-card-meta">' +
      '<div><strong>' +
      bidLabel +
      '</strong></div>' +
      '<div>Ends in <span class="auction-countdown" data-ends-at="' +
      escapeHtml(art.ends_at) +
      '">…</span></div>' +
      '<div class="auction-card-cta">View lot →</div>' +
      '</div></div></a></article>'
    );
  }

  async function mountGallery(el) {
    el.innerHTML = '<div class="auction-loading">Loading lots…</div>';
    try {
      var data = await fetchJson('/api/auction/artworks?status=all_public&limit=50');
      var list = (data && data.artworks) || [];
      if (!list.length) {
        el.innerHTML =
          '<div class="auction-empty">No auction lots are live yet. Check back soon.</div>';
        return;
      }
      el.innerHTML =
        '<div class="auction-grid">' + list.map(cardHtml).join('') + '</div>';
      bindCountdowns(el);
    } catch (err) {
      el.innerHTML =
        '<div class="auction-error">Could not load auction lots. ' +
        escapeHtml(err.message || 'Try again later.') +
        '</div>';
    }
  }

  function statusPill(status) {
    var cls = 'auction-status-pill';
    if (status === 'closed' || status === 'preview') cls += ' is-' + status;
    return (
      '<span class="' +
      cls +
      '">' +
      escapeHtml(status || 'unknown') +
      '</span>'
    );
  }

  function relativeTime(iso) {
    var t = new Date(iso).getTime();
    if (!isFinite(t)) return '';
    var sec = Math.round((Date.now() - t) / 1000);
    if (sec < 60) return 'just now';
    if (sec < 3600) return Math.floor(sec / 60) + 'm ago';
    if (sec < 86400) return Math.floor(sec / 3600) + 'h ago';
    return Math.floor(sec / 86400) + 'd ago';
  }

  async function mountDetail(el, id) {
    state.artworkId = id;
    el.innerHTML = '<div class="auction-loading">Loading artwork…</div>';
    try {
      await refreshSession();
      var data = await fetchJson(
        '/api/auction/artworks/' + encodeURIComponent(id)
      );
      var art = data.artwork;
      state.artwork = art;
      var bids = data.bids || [];
      var img =
        art.images && art.images[0]
          ? '<img class="auction-detail-image" src="' +
            escapeHtml(art.images[0]) +
            '" alt="' +
            escapeHtml(art.title) +
            '" />'
          : '<div class="auction-card-image-placeholder" style="aspect-ratio:4/3">No image</div>';

      var current =
        art.current_bid != null
          ? formatMoney(art.current_bid)
          : formatMoney(art.starting_bid);
      var currentLabel = art.current_bid != null ? 'Current bid' : 'Starting bid';

      var bidRows =
        bids.length === 0
          ? '<p class="auction-bids-empty">No bids yet — be the first!</p>'
          : '<ul class="auction-bids-list">' +
            bids
              .map(function (b) {
                return (
                  '<li><span><strong>' +
                  formatMoney(b.amount) +
                  '</strong> · ' +
                  escapeHtml(b.bidder_display || 'Bidder') +
                  '</span><span>' +
                  escapeHtml(relativeTime(b.created_at)) +
                  '</span></li>'
                );
              })
              .join('') +
            '</ul>';

      var canBid = art.status === 'active' && new Date(art.ends_at) > new Date();
      var sessionLine = state.user
        ? '<p class="auction-session">Signed in as <strong>' +
          escapeHtml(state.user.email) +
          '</strong> · <button type="button" class="auction-link-btn" id="auction-logout">Log out</button></p>'
        : '<p class="auction-session">Not signed in</p>';

      var cta = canBid
        ? '<button type="button" class="button button-red auction-bid-cta is-ready" id="auction-place-bid">Place Bid</button>'
        : '<button type="button" class="button button-red auction-bid-cta" disabled>Bidding Closed</button>';

      el.innerHTML =
        '<a class="auction-back" href="/auction/">← Back to Auction</a>' +
        '<div class="auction-detail">' +
        '<div class="auction-detail-image-wrap">' +
        img +
        '</div>' +
        '<div class="auction-detail-info">' +
        statusPill(art.status) +
        '<h1>' +
        escapeHtml(art.title) +
        '</h1>' +
        '<div class="auction-detail-artist">' +
        escapeHtml(art.artist) +
        '</div>' +
        '<div class="auction-price-block">' +
        '<div class="auction-price-row"><span class="label">' +
        currentLabel +
        '</span><span class="value accent" id="auction-current-bid">' +
        current +
        '</span></div>' +
        '<div class="auction-price-row"><span class="label">Minimum next bid</span><span class="value" id="auction-min-next">' +
        formatMoney(art.minimum_next_bid) +
        '</span></div>' +
        '<div class="auction-price-row"><span class="label">Ends in</span><span class="value auction-countdown" data-ends-at="' +
        escapeHtml(art.ends_at) +
        '">…</span></div>' +
        '</div>' +
        '<div class="auction-description">' +
        escapeHtml(art.description || '') +
        '</div>' +
        sessionLine +
        cta +
        '<div class="auction-bids"><h2>Recent Bids</h2>' +
        bidRows +
        '</div>' +
        '</div></div>';

      bindCountdowns(el);

      var placeBtn = document.getElementById('auction-place-bid');
      if (placeBtn) {
        placeBtn.addEventListener('click', function () {
          startBidFlow(state.artwork);
        });
      }
      var logoutBtn = document.getElementById('auction-logout');
      if (logoutBtn) {
        logoutBtn.addEventListener('click', async function () {
          try {
            await fetchJson('/api/auction/auth/session', { method: 'DELETE' });
          } catch (e) {
            /* ignore */
          }
          state.user = null;
          mountDetail(el, id);
        });
      }
    } catch (err) {
      el.innerHTML =
        '<a class="auction-back" href="/auction/">← Back to Auction</a>' +
        '<div class="auction-error">' +
        escapeHtml(err.message || 'Artwork not found') +
        '</div>';
    }
  }

  async function init() {
    var gallery = document.getElementById('auction-gallery');
    if (gallery) mountGallery(gallery);

    var detail = document.getElementById('auction-detail');
    if (detail) {
      var params = new URLSearchParams(window.location.search);
      var id = params.get('id') || detail.getAttribute('data-artwork-id');
      if (id) mountDetail(detail, id);
      else {
        detail.innerHTML =
          '<div class="auction-error">Missing artwork id. <a href="/auction/">Back to gallery</a></div>';
      }
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  window.HDAuction = {
    fetchJson: fetchJson,
    formatMoney: formatMoney,
    formatCountdown: formatCountdown,
    bindCountdowns: bindCountdowns,
    refreshSession: refreshSession,
    startBidFlow: startBidFlow,
  };
})();
