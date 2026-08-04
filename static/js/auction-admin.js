/**
 * Auction Space admin UI — /auction/admin/
 * Requires admin role session (same OTP login as bidders).
 */
(function () {
  'use strict';

  function apiBase() {
    if (typeof window.HD_AUCTION_API === 'string' && window.HD_AUCTION_API) {
      return window.HD_AUCTION_API.replace(/\/$/, '');
    }
    return '';
  }

  async function fetchJson(path, options) {
    var opts = options || {};
    var res = await fetch(apiBase() + path, {
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
      throw err;
    }
    return data;
  }

  function escapeHtml(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function money(v) {
    if (v == null || v === '') return '—';
    var n = Number(v);
    if (!isFinite(n)) return String(v);
    return (
      '$' +
      n.toLocaleString(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })
    );
  }

  function toLocalInput(iso) {
    if (!iso) return '';
    var d = new Date(iso);
    if (!isFinite(d.getTime())) return '';
    var pad = function (n) {
      return n < 10 ? '0' + n : String(n);
    };
    return (
      d.getFullYear() +
      '-' +
      pad(d.getMonth() + 1) +
      '-' +
      pad(d.getDate()) +
      'T' +
      pad(d.getHours()) +
      ':' +
      pad(d.getMinutes())
    );
  }

  function fromLocalInput(local) {
    if (!local) return null;
    var d = new Date(local);
    return d.toISOString();
  }

  var root = document.getElementById('auction-admin');
  if (!root) return;

  var state = {
    user: null,
    artworks: [],
    selectedId: null,
    selected: null,
    bids: [],
  };

  function setFlash(msg, isError) {
    var el = document.getElementById('admin-flash');
    if (!el) return;
    el.hidden = !msg;
    el.textContent = msg || '';
    el.className = 'admin-flash' + (isError ? ' is-error' : '');
  }

  async function ensureAdmin() {
    var data = await fetchJson('/api/auction/auth/session');
    state.user = data && data.user;
    if (!state.user) {
      renderGate('Sign in with an admin email to manage the silent auction.');
      return false;
    }
    if (state.user.role !== 'admin') {
      renderGate(
        'Signed in as ' +
          state.user.email +
          ', but this account is not an admin. Set ADMIN_EMAIL and re-run npm run auction:seed-admin.'
      );
      return false;
    }
    return true;
  }

  function renderGate(message) {
    root.innerHTML =
      '<div class="admin-page">' +
      '<div class="section-title" style="text-align:left">Auction Admin</div>' +
      '<div class="auction-error">' +
      escapeHtml(message) +
      '</div>' +
      '<div id="admin-login-panel"></div>' +
      '</div>';
    mountLogin(document.getElementById('admin-login-panel'));
  }

  function mountLogin(panel) {
    if (!panel) return;
    panel.innerHTML =
      '<form id="admin-login-form" class="auction-form admin-login-form">' +
      '<label>Email<input type="email" name="email" required autocomplete="email" /></label>' +
      '<label>Name (optional)<input type="text" name="name" /></label>' +
      '<p id="admin-login-error" class="auction-modal-error" hidden></p>' +
      '<button type="submit" class="button button-red">Send Login Code</button>' +
      '</form>' +
      '<form id="admin-otp-form" class="auction-form admin-login-form" hidden>' +
      '<p id="admin-dev-otp" class="auction-modal-dev" hidden></p>' +
      '<label>Code<input type="text" name="token" required maxlength="6" inputmode="numeric" /></label>' +
      '<p id="admin-otp-error" class="auction-modal-error" hidden></p>' +
      '<button type="submit" class="button button-red">Verify</button>' +
      '</form>';

    var emailStored = '';
    document.getElementById('admin-login-form').addEventListener('submit', async function (e) {
      e.preventDefault();
      var fd = new FormData(e.target);
      emailStored = String(fd.get('email') || '').trim();
      var err = document.getElementById('admin-login-error');
      err.hidden = true;
      try {
        var res = await fetchJson('/api/auction/auth/request-link', {
          method: 'POST',
          body: {
            email: emailStored,
            name: String(fd.get('name') || '').trim() || undefined,
          },
        });
        document.getElementById('admin-login-form').hidden = true;
        document.getElementById('admin-otp-form').hidden = false;
        var dev = document.getElementById('admin-dev-otp');
        if (res && res.dev_otp) {
          dev.hidden = false;
          dev.innerHTML = 'Dev code: <strong>' + escapeHtml(res.dev_otp) + '</strong>';
        }
      } catch (ex) {
        err.hidden = false;
        err.textContent = ex.message;
      }
    });

    document.getElementById('admin-otp-form').addEventListener('submit', async function (e) {
      e.preventDefault();
      var fd = new FormData(e.target);
      var err = document.getElementById('admin-otp-error');
      err.hidden = true;
      try {
        await fetchJson('/api/auction/auth/verify', {
          method: 'POST',
          body: { email: emailStored, token: String(fd.get('token') || '').trim() },
        });
        boot();
      } catch (ex) {
        err.hidden = false;
        err.textContent = ex.message;
      }
    });
  }

  function rowHtml(a) {
    var selected = state.selectedId === a.id ? ' is-selected' : '';
    return (
      '<tr class="admin-row' +
      selected +
      '" data-id="' +
      escapeHtml(a.id) +
      '">' +
      '<td>' +
      escapeHtml(a.title) +
      '</td>' +
      '<td>' +
      escapeHtml(a.artist) +
      '</td>' +
      '<td><span class="admin-status">' +
      escapeHtml(a.status) +
      '</span></td>' +
      '<td>' +
      money(a.current_bid != null ? a.current_bid : a.starting_bid) +
      '</td>' +
      '<td>' +
      escapeHtml(a.ends_at ? new Date(a.ends_at).toLocaleString() : '') +
      '</td>' +
      '<td><button type="button" class="button admin-edit-btn" data-id="' +
      escapeHtml(a.id) +
      '">Edit</button></td>' +
      '</tr>'
    );
  }

  function emptyForm() {
    return {
      id: null,
      title: '',
      artist: '',
      description: '',
      imagesText: '',
      starting_bid: '20.00',
      minimum_increment: '5.00',
      ends_at: toLocalInput(new Date(Date.now() + 7 * 86400000).toISOString()),
      status: 'draft',
    };
  }

  function formFromArtwork(a) {
    return {
      id: a.id,
      title: a.title || '',
      artist: a.artist || '',
      description: a.description || '',
      imagesText: (a.images || []).join('\n'),
      starting_bid: a.starting_bid || '0.00',
      minimum_increment: a.minimum_increment || '5.00',
      ends_at: toLocalInput(a.ends_at),
      status: a.status || 'draft',
    };
  }

  function renderApp() {
    var form = state.selected
      ? formFromArtwork(state.selected)
      : emptyForm();
    var bidsHtml =
      state.bids && state.bids.length
        ? '<table class="admin-bids-table"><thead><tr><th>Amount</th><th>Bidder</th><th>Email</th><th>When</th></tr></thead><tbody>' +
          state.bids
            .map(function (b) {
              return (
                '<tr><td>' +
                money(b.amount) +
                '</td><td>' +
                escapeHtml(b.bidder_display || b.name || '') +
                '</td><td>' +
                escapeHtml(b.email || '') +
                '</td><td>' +
                escapeHtml(b.created_at ? new Date(b.created_at).toLocaleString() : '') +
                '</td></tr>'
              );
            })
            .join('') +
          '</tbody></table>'
        : '<p class="auction-bids-empty">No bids on this lot.</p>';

    root.innerHTML =
      '<div class="admin-page">' +
      '<div class="admin-header">' +
      '<div><div class="auction-hero-tagline">Admin</div>' +
      '<div class="section-title" style="text-align:left;margin-top:10px">Silent Auction</div>' +
      '<p class="auction-lede">Create lots, activate bidding, and close winners. Signed in as <strong>' +
      escapeHtml(state.user.email) +
      '</strong>.</p></div>' +
      '<div class="admin-header-actions">' +
      '<a class="button" href="/auction/">Public Gallery</a> ' +
      '<button type="button" class="button" id="admin-logout">Log Out</button>' +
      '</div></div>' +
      '<div id="admin-flash" class="admin-flash" hidden></div>' +
      '<div class="admin-toolbar">' +
      '<button type="button" class="button button-red" id="admin-new">New Artwork</button>' +
      '</div>' +
      '<div class="admin-layout">' +
      '<div class="admin-table-wrap">' +
      '<table class="admin-table">' +
      '<thead><tr><th>Title</th><th>Artist</th><th>Status</th><th>Bid</th><th>Ends</th><th></th></tr></thead>' +
      '<tbody>' +
      (state.artworks.length
        ? state.artworks.map(rowHtml).join('')
        : '<tr><td colspan="6">No lots yet. Create one.</td></tr>') +
      '</tbody></table></div>' +
      '<div class="admin-editor">' +
      '<h2>' +
      (form.id ? 'Edit Artwork' : 'New Artwork') +
      '</h2>' +
      '<form id="admin-form" class="auction-form">' +
      '<input type="hidden" name="id" value="' +
      escapeHtml(form.id || '') +
      '" />' +
      '<label>Title<input name="title" required value="' +
      escapeHtml(form.title) +
      '" /></label>' +
      '<label>Artist<input name="artist" required value="' +
      escapeHtml(form.artist) +
      '" /></label>' +
      '<label>Description<textarea name="description" rows="4">' +
      escapeHtml(form.description) +
      '</textarea></label>' +
      '<label>Images (https URLs, one per line)<textarea name="images" rows="3" placeholder="https://…">' +
      escapeHtml(form.imagesText) +
      '</textarea></label>' +
      '<div class="admin-form-row">' +
      '<label>Starting bid<input name="starting_bid" required value="' +
      escapeHtml(form.starting_bid) +
      '" /></label>' +
      '<label>Min increment<input name="minimum_increment" required value="' +
      escapeHtml(form.minimum_increment) +
      '" /></label>' +
      '</div>' +
      '<div class="admin-form-row">' +
      '<label>Ends at<input type="datetime-local" name="ends_at" required value="' +
      escapeHtml(form.ends_at) +
      '" /></label>' +
      '<label>Status<select name="status">' +
      ['draft', 'preview', 'active']
        .map(function (s) {
          return (
            '<option value="' +
            s +
            '"' +
            (form.status === s ? ' selected' : '') +
            '>' +
            s +
            '</option>'
          );
        })
        .join('') +
      (form.status === 'closed'
        ? '<option value="closed" selected>closed</option>'
        : '') +
      '</select></label></div>' +
      '<div class="admin-form-actions">' +
      '<button type="submit" class="button button-red">Save</button> ' +
      (form.id && form.status !== 'closed'
        ? '<button type="button" class="button button-darkblue" id="admin-close">Close Auction</button> '
        : '') +
      (form.id && form.status === 'draft'
        ? '<button type="button" class="button" id="admin-delete">Delete Draft</button>'
        : '') +
      '</div></form>' +
      (form.id
        ? '<div class="admin-bids-block"><h3>Bids</h3>' + bidsHtml + '</div>'
        : '') +
      '</div></div></div>';

    wireApp();
  }

  function wireApp() {
    document.getElementById('admin-logout').addEventListener('click', async function () {
      await fetchJson('/api/auction/auth/session', { method: 'DELETE' });
      boot();
    });
    document.getElementById('admin-new').addEventListener('click', function () {
      state.selectedId = null;
      state.selected = null;
      state.bids = [];
      renderApp();
    });

    root.querySelectorAll('.admin-edit-btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        selectArtwork(btn.getAttribute('data-id'));
      });
    });

    document.getElementById('admin-form').addEventListener('submit', async function (e) {
      e.preventDefault();
      setFlash('');
      var fd = new FormData(e.target);
      var id = String(fd.get('id') || '').trim();
      var payload = {
        title: String(fd.get('title') || '').trim(),
        artist: String(fd.get('artist') || '').trim(),
        description: String(fd.get('description') || ''),
        images: String(fd.get('images') || '')
          .split('\n')
          .map(function (s) {
            return s.trim();
          })
          .filter(Boolean),
        starting_bid: String(fd.get('starting_bid') || '').trim(),
        minimum_increment: String(fd.get('minimum_increment') || '').trim(),
        ends_at: fromLocalInput(String(fd.get('ends_at') || '')),
        status: String(fd.get('status') || 'draft'),
      };
      try {
        if (id) {
          var patched = await fetchJson('/api/auction/artworks/' + encodeURIComponent(id), {
            method: 'PATCH',
            body: payload,
          });
          setFlash('Saved “' + patched.artwork.title + '”.');
          state.selectedId = patched.artwork.id;
        } else {
          var created = await fetchJson('/api/auction/artworks', {
            method: 'POST',
            body: payload,
          });
          setFlash('Created “' + created.artwork.title + '”.');
          state.selectedId = created.artwork.id;
        }
        await reloadList();
        if (state.selectedId) await selectArtwork(state.selectedId);
        else renderApp();
      } catch (ex) {
        setFlash(ex.message, true);
      }
    });

    var closeBtn = document.getElementById('admin-close');
    if (closeBtn) {
      closeBtn.addEventListener('click', async function () {
        if (!state.selectedId) return;
        if (!confirm('Close this auction and lock in the high bidder as winner?')) return;
        try {
          await fetchJson(
            '/api/auction/artworks/' + encodeURIComponent(state.selectedId) + '/close',
            { method: 'POST' }
          );
          setFlash('Auction closed.');
          await reloadList();
          await selectArtwork(state.selectedId);
        } catch (ex) {
          setFlash(ex.message, true);
        }
      });
    }

    var delBtn = document.getElementById('admin-delete');
    if (delBtn) {
      delBtn.addEventListener('click', async function () {
        if (!state.selectedId) return;
        if (!confirm('Delete this draft permanently?')) return;
        try {
          await fetchJson(
            '/api/auction/artworks/' + encodeURIComponent(state.selectedId),
            { method: 'DELETE' }
          );
          setFlash('Draft deleted.');
          state.selectedId = null;
          state.selected = null;
          state.bids = [];
          await reloadList();
          renderApp();
        } catch (ex) {
          setFlash(ex.message, true);
        }
      });
    }
  }

  async function reloadList() {
    var data = await fetchJson('/api/auction/admin/artworks');
    state.artworks = (data && data.artworks) || [];
  }

  async function selectArtwork(id) {
    var data = await fetchJson(
      '/api/auction/admin/artworks?id=' + encodeURIComponent(id)
    );
    state.selectedId = id;
    state.selected = data.artwork;
    state.bids = data.bids || [];
    renderApp();
  }

  async function boot() {
    root.innerHTML = '<div class="auction-loading">Loading admin…</div>';
    try {
      var ok = await ensureAdmin();
      if (!ok) return;
      await reloadList();
      renderApp();
    } catch (ex) {
      root.innerHTML =
        '<div class="admin-page"><div class="auction-error">' +
        escapeHtml(ex.message) +
        '</div></div>';
    }
  }

  boot();
})();
