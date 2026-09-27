const API_URL = '/api/items';
let currentFilter = 'all';
let isEditing = false;

const form = document.getElementById('item-form');
const errorBox = document.getElementById('error-box');
const itemsGrid = document.getElementById('items-grid');
const filtersContainer = document.getElementById('filters');
const posterInput = document.getElementById('poster-input');
const fileLabelText = document.getElementById('file-label-text');
const posterLabel = document.querySelector('.file-label');

const submitBtn = document.getElementById('submit-btn');
const cancelBtn = document.getElementById('cancel-btn');
const editIdInput = document.getElementById('edit-id');

posterInput.addEventListener('change', (e) => {
  const file = e.target.files[0];
  fileLabelText.textContent = file ? file.name : 'Выберите файл...';
  posterLabel.classList.toggle('has-file', !!file);
});

filtersContainer.addEventListener('click', (e) => {
  if (e.target.tagName === 'A') {
    document.querySelectorAll('.filters a').forEach(el => el.classList.remove('active'));
    e.target.classList.add('active');
    currentFilter = e.target.dataset.filter;
    loadItems();
  }
});

async function loadItems() {
  try {
    hideError();
    const res = await fetch(`${API_URL}?status=${encodeURIComponent(currentFilter)}`);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || 'Ошибка загрузки данных с сервера');
    renderItems(data);
  } catch (err) {
    showError(err.message);
  }
}

function renderItems(items) {
  if (!items || items.length === 0) {
    itemsGrid.innerHTML = `<p class="empty-state">Нет задач</p>`;
    return;
  }

  itemsGrid.innerHTML = items.map(() => `
    <div class="card">
      <span class="status-pill"></span>
      <div class="poster-wrapper"></div>
      <div class="type"></div>
      <h3></h3>
      <div class="date"></div>
      <div style="display: flex; gap: 8px; margin-top: auto;">
        <button type="button" class="edit-btn" style="flex: 1;">Изменить</button>
        <button type="button" class="del-btn" style="flex: 1;">Удалить</button>
      </div>
    </div>
  `).join('');

  const cards = itemsGrid.querySelectorAll('.card');

  cards.forEach((card, index) => {
    const item = items[index];

    card.querySelector('.status-pill').textContent = item.status.label;
    card.querySelector('.type').textContent = item.type;
    card.querySelector('h3').textContent = item.title;
    card.querySelector('.date').textContent = `Дата: ${item.dueDate}`;

    const posterWrapper = card.querySelector('.poster-wrapper');
    if (item.poster) {
      const img = document.createElement('img');
      img.src = item.poster;
      img.alt = item.title;
      posterWrapper.appendChild(img);
    } else {
      const noPoster = document.createElement('div');
      noPoster.className = 'no-poster';
      noPoster.textContent = 'Нет постера';
      posterWrapper.appendChild(noPoster);
    }

    card.querySelector('.edit-btn').addEventListener('click', () => startEdit(item));
    card.querySelector('.del-btn').addEventListener('click', () => deleteItem(item._id));
  });
}

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  hideError();

  const formData = new FormData();
  formData.append('title', document.getElementById('title').value);
  formData.append('type', document.getElementById('type').value);
  formData.append('statusId', document.getElementById('statusId').value);
  formData.append('dueDate', document.getElementById('dueDate').value);

  if (posterInput.files[0]) {
    formData.append('poster', posterInput.files[0]);
  }

  const id = editIdInput.value;
  const url = isEditing ? `${API_URL}/${id}` : API_URL;
  const method = isEditing ? 'PUT' : 'POST';

  try {
    const res = await fetch(url, { method, body: formData });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || 'Ошибка при сохранении записи');

    resetFormState();
    loadItems();
  } catch (err) {
    showError(err.message);
  }
});

function startEdit(item) {
  isEditing = true;
  editIdInput.value = item._id;
  document.getElementById('title').value = item.title;
  document.getElementById('type').value = item.type;
  document.getElementById('statusId').value = item.status.id;
  document.getElementById('dueDate').value = item.dueDate;

  submitBtn.textContent = 'Сохранить';
  cancelBtn.style.display = 'block';
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function cancelEdit() {
  resetFormState();
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
  try {
    hideError();
    const res = await fetch(`${API_URL}/${id}`, { method: 'DELETE' });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || 'Не удалось удалить элемент');
    loadItems();
  } catch (err) {
    showError(err.message);
  }
}

function showError(msg) {
  errorBox.textContent = msg;
  errorBox.style.display = 'block';
}

function hideError() {
  errorBox.textContent = '';
  errorBox.style.display = 'none';
}

window.cancelEdit = cancelEdit;

loadItems();
