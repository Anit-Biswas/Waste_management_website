// ====== Simple Store using localStorage ======
const Store = {
  read(key, def) {
    try {
      return JSON.parse(localStorage.getItem(key)) ?? def;
    } catch {
      return def;
    }
  },
  write(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
  }
};

// ====== Seed Demo Data ======
(function seed() {
  if (!Store.read('users')) {
    Store.write('users', [
      { id: 1, name: 'User', email: 'user@.com', role: 'user', pass: '1234', rewards: 40 },
      { id: 2, name: 'Admin', email: 'admin@.com', role: 'admin', pass: 'admin123', rewards: 0 }
    ]);
  }
  if (!Store.read('bookings')) Store.write('bookings', []);
  if (!Store.read('transactions')) Store.write('transactions', []);
  if (!Store.read('captures')) Store.write('captures', []);
  if (!Store.read('notifications')) Store.write('notifications', []);
  if (!Store.read('tickets')) Store.write('tickets', []);
  if (!Store.read('facilities')) Store.write('facilities', [
    { name: 'Ward 12 MRF', type: 'MRF', distance: '1.2 km' },
    { name: 'Community Compost Center', type: 'Compost', distance: '2.0 km' },
    { name: 'E-waste Drop Point', type: 'E-waste', distance: '3.4 km' }
  ]);
  if (!Store.read('training')) Store.write('training', [
    { id: 1, title: 'Household Segregation Basics', mins: 15, done: false },
    { id: 2, title: 'Composting at Home', mins: 12, done: false },
    { id: 3, title: 'Plastic Reduction & Reuse', mins: 10, done: false }
  ]);
})();

// ====== App State ======
const State = {
  user: null,
  setUser(user) {
    this.user = user;
    UI.refreshHeader();
  }
};

// ====== UI Helpers ======
const $ = (q) => document.querySelector(q);
const $$ = (q) => document.querySelectorAll(q);
const fmt = (d) => new Date(d).toLocaleDateString();

// ====== UI Logic ======
const UI = {
  // --- Authentication ---
  register() {
    const name = $('#regName').value.trim();
    const email = $('#regEmail').value.trim();
    const role = $('#regRole').value;
    const pass = $('#regPass').value;
    if (!name || !email || !pass) return alert('Fill all fields');
    const users = Store.read('users', []);
    if (users.some(u => u.email === email)) return alert('Email already exists');
    const id = Date.now();
    users.push({ id, name, email, role, pass, rewards: 0 });
    Store.write('users', users);
    alert('Registered! You can login now.');
  },

  login() {
    const email = $('#loginEmail').value.trim();
    const pass = $('#loginPass').value.trim();
    const users = Store.read('users', []);
    const user = users.find(u => u.email === email && u.pass === pass);
    if (!user) {
      $('#loginErr').classList.remove('hidden');
      $('#loginErr').textContent = 'Invalid credentials';
      return;
    }
    State.setUser(user);
    $('#authViews').classList.add('hidden');
    $('#main').classList.remove('hidden');
    $('#userBadge').classList.remove('hidden');
    $('#logoutBtn').classList.remove('hidden');
    if (user.role === 'admin') $('#adminMenu').classList.remove('hidden');
    else $('#adminMenu').classList.add('hidden');
    this.switchView('home');
    this.renderAll();
  },

  logout() {
    State.setUser(null);
    location.reload();
  },

  refreshHeader() {
    if (State.user) {
      $('#userBadge').textContent = `User`;
    }
  },

  // --- Menu Routing ---
  initMenu() {
    $$('.menu button').forEach(btn => btn.addEventListener('click', () => {
      $$('.menu button').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      this.switchView(btn.dataset.view);
    }));
    $('#logoutBtn').addEventListener('click', () => this.logout());
  },

  switchView(id) {
    document.querySelectorAll('main > section').forEach(s => s.classList.add('hidden'));
    const el = $(`#view-${id}`);
    if (el) el.classList.remove('hidden');
    if (id === 'monitoring') this.drawChart();
  },

  // --- Renderers ---
  renderAll() {
    this.renderKPI();
    this.renderProfile();
    this.renderNotifs();
    this.renderBookings();
    this.renderTx();
    this.renderIncentives();
    this.renderCaptures();
    this.renderFacilities();
    this.renderTraining();
    this.renderAdmin();
  },

  renderKPI() {
    const bookings = Store.read('bookings', []).filter(b => b.uid === State.user.id);
    const tx = Store.read('transactions', []).filter(t => t.uid === State.user.id);
    const upcoming = bookings.filter(b => new Date(b.date) >= new Date());
    $('#kpiUpcoming').textContent = upcoming.length;
    $('#kpiNextDate').textContent = upcoming[0] ? fmt(upcoming[0].date) : '—';
    $('#kpiRewards').textContent = State.user.rewards || 0;
    $('#kpiTx').textContent = tx.slice(-30).length;
    const fines = tx.filter(t => t.purpose === 'Fine').reduce((a, b) => a + b.amount, 0);
    $('#kpiFines').textContent = fines ? `₹${fines} in fines` : 'No fines';
  },

  renderProfile() {
    $('#profileBox').innerHTML = `
      <div class="row"><div class="tag">Name</div><div>${State.user.name}</div></div>
      <div class="row"><div class="tag">Email</div><div>${State.user.email}</div></div>
      <div class="row"><div class="tag">Role</div><div>${State.user.role}</div></div>
      <div class="row"><div class="tag">Rewards</div><div>${State.user.rewards || 0} pts</div></div>
    `;
  },

  renderNotifs() {
    const n = Store.read('notifications', []).filter(x => x.uid === State.user.id).slice(-8).reverse();
    if (n.length === 0) {
      $('#notifBox').innerHTML = '<div class="empty">No notifications yet.</div>';
      return;
    }
    $('#notifBox').innerHTML = '<ul>' + n.map(x =>
      `<li>📩 ${x.text} <span class="tag">${new Date(x.ts).toLocaleString()}</span></li>`
    ).join('') + '</ul>';
  },

  renderBookings() {
    const list = Store.read('bookings', []).filter(b => b.uid === State.user.id).reverse();
    if (list.length === 0) {
      $('#bkTable').innerHTML = '<div class="empty">No bookings yet.</div>';
      return;
    }
    $('#bkTable').innerHTML = this.table(
      ['Date', 'Type', 'Freq', 'Address', 'Status'],
      list.map(b => [
        fmt(b.date),
        b.type,
        b.freq,
        b.addr,
        `<span class="tag">${b.status}</span>`
      ])
    );
  },

  addBooking() {
    const date = $('#bkDate').value;
    const type = $('#bkType').value;
    const freq = $('#bkFreq').value;
    const addr = $('#bkAddr').value.trim();
    if (!date || !addr) return alert('Select date and enter address');
    const bookings = Store.read('bookings', []);
    bookings.push({ id: Date.now(), uid: State.user.id, date, type, freq, addr, status: 'Confirmed' });
    Store.write('bookings', bookings);
    this.notify(State.user.id, `Booking confirmed for ${type} on ${fmt(date)}`);
    this.renderBookings();
    this.renderKPI();
  },

  renderTx() {
    const list = Store.read('transactions', []).filter(t => t.uid === State.user.id).reverse();
    if (list.length === 0) {
      $('#txTable').innerHTML = '<div class="empty">No transactions yet.</div>';
      return;
    }
    $('#txTable').innerHTML = this.table(
      ['When', 'Purpose', 'Amount'],
      list.map(t => [
        new Date(t.ts).toLocaleString(),
        t.purpose,
        `₹${t.amount}`
      ])
    );
  },

  pay() {
    const purpose = $('#payPurpose').value;
    const amount = parseInt($('#payAmt').value || '0', 10);
    if (!amount) return alert('Enter amount');
    const tx = Store.read('transactions', []);
    tx.push({ id: Date.now(), uid: State.user.id, purpose, amount, ts: Date.now() });
    Store.write('transactions', tx);

    // rewards: 1 point per ₹100 for non-fine
    if (purpose !== 'Fine') {
      const users = Store.read('users', []);
      const u = users.find(x => x.id === State.user.id);
      u.rewards = (u.rewards || 0) + Math.floor(amount / 100);
      Store.write('users', users);
      State.user = u;
      this.refreshHeader();
      this.notify(State.user.id, `Payment ₹${amount} successful. Rewards updated: ${u.rewards} pts`);
    } else {
      this.notify(State.user.id, `Fine of ₹${amount} paid.`);
    }
    this.renderTx();
    this.renderKPI();
    this.renderIncentives();
  },

  renderIncentives() {
    const tx = Store.read('transactions', []).filter(t => t.uid === State.user.id);
    const fines = tx.filter(t => t.purpose === 'Fine');
    $('#compReport').innerHTML = fines.length
      ? this.table(['When', 'Amount'], fines.map(f => [new Date(f.ts).toLocaleString(), `₹${f.amount}`]))
      : '<div class="empty">No fines. You\'re doing great! 🎉</div>';
    $('#rewardBox').innerHTML = `
      <div class="row">
        <span class="tag">Current Points</span>
        <div class="value">${State.user.rewards || 0}</div>
      </div>
    `;
  },

  renderCaptures() {
    const list = Store.read('captures', []).filter(c => c.uid === State.user.id).reverse();
    if (list.length === 0) {
      $('#capTable').innerHTML = '<div class="empty">No records yet.</div>';
      return;
    }
    $('#capTable').innerHTML = this.table(
      ['Date', 'Type', 'Kg'],
      list.map(c => [fmt(c.date), c.type, c.kg + ' kg'])
    );
  },

  capture() {
    const date = $('#capDate').value;
    const type = $('#capType').value;
    const kg = parseFloat($('#capKg').value || '0');
    if (!date || !kg) return alert('Enter date and weight');
    const caps = Store.read('captures', []);
    caps.push({ id: Date.now(), uid: State.user.id, date, type, kg });
    Store.write('captures', caps);
    this.notify(State.user.id, `Pickup recorded: ${type} ${kg}kg on ${fmt(date)}`);
    this.renderCaptures();
    this.drawChart();
  },

  drawChart() {
    const ctx = $('#chart').getContext('2d');
    const data = Store.read('captures', []).filter(c => c.uid === State.user?.id).slice(-10);
    const max = Math.max(1, ...data.map(d => d.kg));
    // clear
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    // axes
    ctx.strokeStyle = '#1f2937';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(30, 10);
    ctx.lineTo(30, 150);
    ctx.lineTo(320, 150);
    ctx.stroke();
    // bars
    const bw = 20, gap = 10;
    let x = 40;
    ctx.fillStyle = '#3b82f6';
    data.forEach(d => {
      const h = (d.kg / max) * 120;
      ctx.fillRect(x, 150 - h, bw, h);
      x += bw + gap;
    });
  },

  renderFacilities() {
    const fac = Store.read('facilities', []);
    $('#facTable').innerHTML = this.table(
      ['Name', 'Type', 'Distance'],
      fac.map(f => [f.name, f.type, f.distance])
    );
    const tickets = Store.read('tickets', []).filter(t => t.uid === State.user.id).reverse();
    $('#ticketBox').innerHTML = tickets.length
      ? ('<ul>' + tickets.map(t =>
        `<li>#${t.id} — ${t.text} <span class=tag>${new Date(t.ts).toLocaleString()}</span></li>`
      ).join('') + '</ul>')
      : '<div class="empty">No tickets.</div>';
  },

  raiseTicket() {
    const text = $('#supportMsg').value.trim();
    if (!text) return;
    const t = Store.read('tickets', []);
    t.push({ id: Math.floor(Math.random() * 9999), uid: State.user.id, text, ts: Date.now() });
    Store.write('tickets', t);
    $('#supportMsg').value = '';
    this.renderFacilities();
    this.notify(State.user.id, 'Support ticket raised');
  },

  renderTraining() {
    const list = Store.read('training', []);
    $('#trainList').innerHTML = list.map(m =>
      `<li class="row" style="justify-content:space-between">
        <div>${m.title} <span class="tag">${m.mins} mins</span></div>
        <button class="btn" onclick="UI.completeModule(${m.id})">${m.done ? 'Completed' : 'Start'}</button>
      </li>`
    ).join('');
    const done = list.filter(m => m.done);
    $('#certBox').innerHTML = done.length
      ? `<div class="row"><span class="tag">Certificates</span><div>${done.map(d =>
        `<a download href="#">${d.title}.pdf</a>`
      ).join(' • ')}</div></div>`
      : '<div class="empty">Complete modules to unlock certificates.</div>';
  },

  completeModule(id) {
    const list = Store.read('training', []);
    const m = list.find(x => x.id === id);
    m.done = true;
    Store.write('training', list);
    this.renderTraining();
    this.notify(State.user.id, `Training completed: ${m.title}`);
  },

  // --- Admin ---
  renderAdmin() {
    if (State.user.role !== 'admin') {
      $('#govtBox').innerHTML = '<div class="empty">Login as <b>Admin</b> to see analytics.</div>';
      return;
    }
    const users = Store.read('users', []);
    $('#userTable').innerHTML = this.table(
      ['Name', 'Email', 'Role', 'Rewards'],
      users.map(u => [u.name, u.email, u.role, u.rewards || 0])
    );
    const allBk = Store.read('bookings', []);
    const caps = Store.read('captures', []);
    const tx = Store.read('transactions', []);
    $('#adminKPI').innerHTML = `
      <div class="card"><div class="label">Total Users</div><div class="value">${users.length}</div></div>
      <div class="card"><div class="label">Bookings</div><div class="value">${allBk.length}</div></div>
      <div class="card"><div class="label">Collections</div><div class="value">${caps.length}</div></div>
      <div class="card"><div class="label">Payments</div><div class="value">₹${tx.reduce((a, b) => a + b.amount, 0)}</div></div>
    `;
    $('#govtBox').innerHTML = '<div class="row"><span class="tag">Reports exported (mock)</span><span class="tag">Community drives: 4</span><span class="tag">Ward coverage: 91%</span></div>';
  },

  // --- Utilities ---
  table(headers, rows) {
    return `
      <table>
        <thead>
          <tr>${headers.map(h => `<th>${h}</th>`).join('')}</tr>
        </thead>
        <tbody>
          ${rows.map(r => `<tr>${r.map(c => `<td>${c}</td>`).join('')}</tr>`).join('')}
        </tbody>
      </table>
    `;
  },

  notify(uid, text) {
    const n = Store.read('notifications', []);
    n.push({ id: Date.now(), uid, text, ts: Date.now() });
    Store.write('notifications', n);
    this.renderNotifs();
  }
};

// ====== Initialize App ======
UI.initMenu();
window.UI = UI;