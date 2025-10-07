 // --- Utility validators ---
    const el = id => document.getElementById(id);
    const fullname = el('fullname');
    const email = el('email');
    const password = el('password');
    const role = el('role');

    const nameMsg = el('nameMsg');
    const emailMsg = el('emailMsg');
    const passMsg = el('passMsg');
    const roleMsg = el('roleMsg');
    const globalMsg = el('globalMsg');

    const preview = el('preview');
    const previewContent = el('previewContent');

    // Password rule: min 8 chars, at least 1 uppercase, at least 1 number
    function validatePassword(p) {
      const minLen = p.length >= 8;
      const hasUpper = /[A-Z]/.test(p);
      const hasNumber = /[0-9]/.test(p);
      return {minLen, hasUpper, hasNumber, valid: minLen && hasUpper && hasNumber};
    }

    function validateEmail(e){
      // Basic HTML5-like check
      if (!e) return false;
      // simple regex (good for client-side)
      const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      return re.test(e);
    }

    // Show/Hide password
    const togglePassBtn = el('togglePass');
    togglePassBtn.addEventListener('click', () => {
      const type = password.type === 'password' ? 'text' : 'password';
      password.type = type;
      togglePassBtn.textContent = type === 'password' ? 'Show' : 'Hide';
      togglePassBtn.setAttribute('aria-pressed', type === 'text');
    });

    // Clear form
    el('clearBtn').addEventListener('click', e => {
      el('regForm').reset();
      nameMsg.textContent = emailMsg.textContent = passMsg.textContent = roleMsg.textContent = globalMsg.textContent = '';
      preview.hidden = true;
      preview.setAttribute('aria-hidden','true');
    });

    // Live validation on blur/input
    fullname.addEventListener('input', () => {
      const v = fullname.value.trim();
      if (!v) nameMsg.textContent = 'Full name is required.';
      else if (v.length < 3) nameMsg.textContent = 'Please provide your full name.';
      else nameMsg.textContent = '';
    });

    email.addEventListener('input', () => {
      const v = email.value.trim();
      if (!v) emailMsg.textContent = 'Email is required.';
      else if (!validateEmail(v)) emailMsg.textContent = 'Please enter a valid email.';
      else emailMsg.textContent = '';
    });

    password.addEventListener('input', () => {
      const v = password.value;
      const res = validatePassword(v);
      if (!v) passMsg.textContent = 'Password is required.';
      else if (!res.minLen) passMsg.textContent = 'Password must be at least 8 characters.';
      else if (!res.hasUpper) passMsg.textContent = 'Include at least one uppercase letter.';
      else if (!res.hasNumber) passMsg.textContent = 'Include at least one number.';
      else passMsg.textContent = '';
    });

    role.addEventListener('change', () => {
      roleMsg.textContent = role.value ? '' : 'Please select a role.';
    });

    // Submit handler
    el('regForm').addEventListener('submit', (ev) => {
      ev.preventDefault();
      // reset messages
      globalMsg.textContent = '';

      const data = {
        fullname: fullname.value.trim(),
        email: email.value.trim(),
        password: password.value,
        role: role.value
      };

      // client validation
      let ok = true;
      if (!data.fullname || data.fullname.length < 3) { nameMsg.textContent = 'Enter a valid full name.'; ok = false; } else nameMsg.textContent = '';
      if (!validateEmail(data.email)) { emailMsg.textContent = 'Enter a valid email.'; ok = false; } else emailMsg.textContent = '';
      const passCheck = validatePassword(data.password);
      if (!passCheck.valid) { passMsg.textContent = 'Password weak. Follow requirements.'; ok = false; } else passMsg.textContent = '';
      if (!data.role) { roleMsg.textContent = 'Choose a role.'; ok = false; } else roleMsg.textContent = '';

      if (!ok){
        globalMsg.textContent = 'Please fix the errors above.';
        return;
      }

      // At this point, client-side validation passed.
      // NOTE: Never send raw password to server without hashing and using HTTPS.
      // Here we just simulate a submission; in real app, send via fetch() to API.
      globalMsg.textContent = '';
      preview.hidden = false;
      preview.removeAttribute('aria-hidden');

      // Mask password for preview
      const masked = data.password.replace(/./g, '•');

      previewContent.innerHTML = `
        <div><strong>Name:</strong> ${escapeHtml(data.fullname)}</div>
        <div><strong>Email:</strong> ${escapeHtml(data.email)}</div>
        <div><strong>Role:</strong> ${escapeHtml(data.role)}</div>
        <div><strong>Password:</strong> ${masked}</div>
        <div style="margin-top:8px;color:var(--muted)">Form validated successfully. (This is a local preview.)</div>
      `;

      // Log the data (for developer). DO NOT log passwords in production.
      console.log('Registration data (client):', {
        fullname: data.fullname,
        email: data.email,
        role: data.role,
        // password omitted intentionally from console in this example
      });

      // Simulated success animation/message
      globalMsg.textContent = 'Account created successfully (simulated).';
      globalMsg.classList.remove(''); // no-op but placeholder
      globalMsg.classList.add('success');
      globalMsg.style.color = getComputedStyle(document.documentElement).getPropertyValue('--success') || 'green';

      // Optionally clear sensitive field
      password.value = '';
      togglePassBtn.textContent = 'Show';
      password.type = 'password';
    });

    // small helper to escape user-supplied text
    function escapeHtml(s){
      return s.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
    }

    // Accessibility: focus first invalid on submit - (enhancement)
    el('regForm').addEventListener('invalid', (ev) => {
      ev.preventDefault(); // keep custom validation flow
      const firstInvalid = el('regForm').querySelector(':invalid');
      if (firstInvalid) firstInvalid.focus();
    }, true);