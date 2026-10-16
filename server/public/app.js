const API_URL = '/api/items';
let currentFilter = 'all';
let isEditing = false;
let apiKey = localStorage.getItem('cinetrack_token') || '';

const urlParams = new URLSearchParams(window.location.search);
const resetToken = urlParams.get('token');
const isResetMode = Boolean(resetToken);

const form = document.getElementById('item-form');
const errorBox = document.getElementById('error-box');
const itemsGrid = document.getElementById('items-grid');
const filtersContainer = document.getElementById('filters');
const posterInput = document.getElementById('poster-input');
const fileLabelText = document.getElementById('file-label-text');
const posterLabel = document.querySelector('.file-label');
const welcomeMessage = document.getElementById('welcome-message');
const submitBtn = document.getElementById('submit-btn');
const cancelBtn = document.getElementById('cancel-btn');
const editIdInput = document.getElementById('edit-id');
const loginToggleBtn = document.getElementById('login-toggle-btn');
const logoutBtn = document.getElementById('logout-btn');
const loginModal = document.getElementById('login-modal');
const loginForm = document.getElementById('login-form');
const titleInput = document.getElementById('title');
const typeInput = document.getElementById('type');
const statusInput = document.getElementById('statusId');
const dueDateInput = document.getElementById('dueDate');
const loginEmailInput = document.getElementById('login-email');
const loginPasswordInput = document.getElementById('login-password');

const forgotLink = document.getElementById('forgot-link');
const recoverModal = document.getElementById('recover-modal');
const recoverForm = document.getElementById('recover-form');
const recoverEmailInput = document.getElementById('recover-email');
const recoverCancel = document.getElementById('recover-cancel');
const recoverMessage = document.getElementById('recover-message');

const mainApp = document.getElementById('main-app');
const resetSection = document.getElementById('reset-password-section');
const resetForm = document.getElementById('reset-password-form');
const newPasswordInput = document.getElementById('new-password');
const confirmPasswordInput = document.getElementById('confirm-password');
const resetSubmitBtn = document.getElementById('reset-submit-btn');
const resetMessage = document.getElementById('reset-message');

const authHeaders = () => (apiKey ? { Authorization: `Bearer ${apiKey}` } : {});

const escapeHtml = (str) =>
  String(str).replace(
    /[&<>"']/g,
    (c) =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[
        c
      ]
  );

function showError(msg) {
  errorBox.textContent = msg;
  errorBox.style.display = 'block';
}

function hideError() {
  errorBox.textContent = '';
  errorBox.style.display = 'none';
}

function setAuthUI(loggedIn) {
  loginToggleBtn.style.display = loggedIn ? 'none' : 'block';
  logoutBtn.style.display = loggedIn ? 'block' : 'none';
}

if (isResetMode) {
  if (mainApp) mainApp.hidden = true;
  resetSection.style.display = 'block';

  loginToggleBtn.style.display = 'none';
  logoutBtn.style.display = 'none';
}

function showResetMessage(text, isError = false) {
  resetMessage.textContent = text;
  resetMessage.className = isError
    ? 'message-box error'
    : 'message-box success';
  resetMessage.style.display = 'block';
}

resetForm.addEventListener('submit', async (e) => {
  e.preventDefault();

  const newPassword = newPasswordInput.value;
  const confirmPassword = confirmPasswordInput.value;

  if (newPassword !== confirmPassword) {
    showResetMessage('Пароли не совпадают', true);
    return;
  }

  if (newPassword.length < 8) {
    showResetMessage('Пароль должен быть минимум 8 символов', true);
    return;
  }

  resetSubmitBtn.disabled = true;
  resetSubmitBtn.textContent = 'Отправка...';

  try {
    const res = await fetch('/api/auth/reset-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: resetToken, newPassword }),
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Ошибка смены пароля');

    showResetMessage(
      'Пароль успешно изменён! Сейчас перенаправим на главную...',
      false
    );

    setTimeout(() => {
      window.location.href = '/';
    }, 2000);
  } catch (err) {
    showResetMessage(err.message, true);
    resetSubmitBtn.disabled = false;
    resetSubmitBtn.textContent = 'Сменить пароль';
  }
});

if (!isResetMode) {
  setAuthUI(!!apiKey);

  loginToggleBtn.addEventListener('click', () => {
    loginModal.style.display =
      loginModal.style.display === 'none' ? 'block' : 'none';
  });

  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    hideError();
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: loginEmailInput.value,
          password: loginPasswordInput.value,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Ошибка входа');

      apiKey = data.apiKey;
      localStorage.setItem('cinetrack_token', apiKey);
      loginModal.style.display = 'none';
      setAuthUI(true);
      loadItems();
    } catch (err) {
      showError(err.message);
    }
  });

  logoutBtn.addEventListener('click', () => {
    fetch('/api/auth/logout', { method: 'POST', headers: authHeaders() }).catch(
      () => {}
    );
    apiKey = '';
    localStorage.removeItem('cinetrack_token');
    setAuthUI(false);
    loadItems();
  });

  forgotLink.addEventListener('click', (e) => {
    e.preventDefault();
    loginModal.style.display = 'none';
    recoverModal.style.display = 'block';
    recoverMessage.style.display = 'none';
    recoverEmailInput.value = '';
  });

  recoverCancel.addEventListener('click', () => {
    recoverModal.style.display = 'none';
  });

  recoverForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    recoverMessage.style.display = 'none';

    try {
      const res = await fetch('/api/auth/recover', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: recoverEmailInput.value }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Ошибка восстановления');

      recoverMessage.textContent = data.message;
      recoverMessage.className = 'message-box success';
      recoverMessage.style.display = 'block';
      recoverEmailInput.value = '';
    } catch (err) {
      recoverMessage.textContent = err.message;
      recoverMessage.className = 'message-box error';
      recoverMessage.style.display = 'block';
    }
  });

  posterInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    fileLabelText.textContent = file ? file.name : 'Выберите файл...';
    posterLabel.classList.toggle('has-file', !!file);
  });

  filtersContainer.addEventListener('click', (e) => {
    if (e.target.tagName !== 'A') return;
    document
      .querySelectorAll('.filters a')
      .forEach((el) => el.classList.remove('active'));
    e.target.classList.add('active');
    currentFilter = e.target.dataset.filter;
    loadItems();
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    hideError();

    const formData = new FormData();
    formData.append('title', titleInput.value);
    formData.append('type', typeInput.value);
    formData.append('statusId', statusInput.value);
    formData.append('dueDate', dueDateInput.value);
    if (posterInput.files[0]) formData.append('poster', posterInput.files[0]);

    const url = isEditing ? `${API_URL}/${editIdInput.value}` : API_URL;

    try {
      const res = await fetch(url, {
        method: isEditing ? 'PUT' : 'POST',
        headers: authHeaders(),
        body: formData,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Ошибка при сохранении');

      resetFormState();
      loadItems();
    } catch (err) {
      showError(err.message);
    }
  });

  cancelBtn.addEventListener('click', resetFormState);

  loadItems();
}

async function loadItems() {
  hideError();

  if (!apiKey) {
    welcomeMessage.style.display = 'block';
    itemsGrid.innerHTML = '';
    return;
  }
  welcomeMessage.style.display = 'none';

  try {
    const res = await fetch(
      `${API_URL}?status=${encodeURIComponent(currentFilter)}`,
      { headers: authHeaders() }
    );
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || 'Ошибка загрузки данных');
    renderItems(data);
  } catch (err) {
    showError(err.message);
  }
}

function renderItems(items) {
  if (!items?.length) {
    itemsGrid.innerHTML = '<p class="empty-state">Нет задач</p>';
    return;
  }

  itemsGrid.innerHTML = items
    .map(
      (item) => `
      <div class="card" data-id="${item._id}">
        <span class="status-pill">${escapeHtml(item.status.label)}</span>
        <div class="poster-wrapper">
          ${
            item.poster
              ? `<img src="${escapeHtml(item.poster)}" alt="${escapeHtml(item.title)}">`
              : '<div class="no-poster">Нет постера</div>'
          }
        </div>
        <div class="type">${escapeHtml(item.type)}</div>
        <h3>${escapeHtml(item.title)}</h3>
        <div class="date">Дата: ${escapeHtml(item.dueDate)}</div>
        <div class="card-actions">
          <button type="button" class="edit-btn">Изменить</button>
          <button type="button" class="del-btn">Удалить</button>
        </div>
      </div>`
    )
    .join('');

  itemsGrid.onclick = (e) => {
    const card = e.target.closest('.card');
    if (!card) return;
    const item = items.find((i) => i._id === card.dataset.id);
    if (e.target.classList.contains('edit-btn')) startEdit(item);
    if (e.target.classList.contains('del-btn')) deleteItem(item._id);
  };
}

function startEdit(item) {
  isEditing = true;
  editIdInput.value = item._id;
  titleInput.value = item.title;
  typeInput.value = item.type;
  statusInput.value = item.status.id;
  dueDateInput.value = item.dueDate;

  submitBtn.textContent = 'Сохранить';
  cancelBtn.style.display = 'block';
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function resetFormState() {
  form.reset();
  isEditing = false;
  editIdInput.value = '';
  submitBtn.textContent = 'Добавить';
  cancelBtn.style.display = 'none';
  fileLabelText.textContent = 'Выберите файл...';
  posterLabel.classList.remove('has-file');
}

async function deleteItem(id) {
  hideError();
  try {
    const res = await fetch(`${API_URL}/${id}`, {
      method: 'DELETE',
      headers: authHeaders(),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || 'Не удалось удалить элемент');
    loadItems();
  } catch (err) {
    showError(err.message);
  }
}
