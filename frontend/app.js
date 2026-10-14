const apiBaseUrl = (window.APP_CONFIG?.apiBaseUrl || '').replace(/\/$/, '');
const tableBody = document.querySelector('#people-table-body');
const searchInput = document.querySelector('#search-input');
const dialog = document.querySelector('#person-dialog');
const form = document.querySelector('#person-form');
const saveButton = document.querySelector('#save-button');
const toast = document.querySelector('#toast');
let people = [];
let toastTimer;

function apiUrl(path) {
  const isLocalhost = ['localhost', '127.0.0.1'].includes(window.location.hostname);
  if (!apiBaseUrl && !isLocalhost) {
    throw new Error('API URL is not configured. Set apiBaseUrl in frontend/config.js.');
  }
  return `${apiBaseUrl || window.location.origin}${path}`;
}

async function request(path, options = {}) {
  let response;
  try {
    response = await fetch(apiUrl(path), {
      ...options,
      headers: { 'Content-Type': 'application/json', ...options.headers },
    });
  } catch {
    throw new Error('Could not reach the API. Check the API URL and that the Express server is running.');
  }

  if (response.status === 204) return null;
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || `Request failed (${response.status})`);
  return result;
}

function setApiStatus(online, label = online ? 'API connected' : 'API offline') {
  document.querySelector('#api-status').textContent = label;
  document.querySelector('#api-stat').textContent = online ? 'Online' : 'Offline';
  for (const dot of document.querySelectorAll('#status-dot, #header-status-dot')) {
    dot.classList.toggle('online', online);
    dot.classList.toggle('offline', !online);
  }
}

function initials(name) {
  return name.trim().split(/\s+/).slice(0, 2).map((part) => part[0]).join('').toUpperCase();
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (character) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  })[character]);
}

function renderPeople() {
  const query = searchInput.value.trim().toLowerCase();
  const visiblePeople = people.filter((person) => (
    person.name.toLowerCase().includes(query) || person.email.toLowerCase().includes(query)
  ));
  document.querySelector('#total-stat').textContent = people.length;
  document.querySelector('#nav-count').textContent = people.length;
  document.querySelector('#record-count').textContent = people.length;
  document.querySelector('#average-stat').textContent = people.length
    ? `${Math.round(people.reduce((total, person) => total + person.age, 0) / people.length)} yrs`
    : '—';

  if (!visiblePeople.length) {
    tableBody.innerHTML = `<tr><td colspan="4" class="message-cell">${query ? 'No people match your search.' : 'No people yet. Add your first person to get started.'}</td></tr>`;
  } else {
    tableBody.innerHTML = visiblePeople.map((person, index) => `
      <tr>
        <td><div class="person-cell"><div class="avatar avatar-${index % 4}">${escapeHtml(initials(person.name))}</div><strong>${escapeHtml(person.name)}</strong></div></td>
        <td class="email-cell">${escapeHtml(person.email)}</td>
        <td><span class="age-pill">${person.age}</span></td>
        <td class="actions-cell"><button class="icon-button edit-button" type="button" data-action="edit" data-id="${escapeHtml(person.id)}" aria-label="Edit ${escapeHtml(person.name)}">↗</button><button class="icon-button delete-button" type="button" data-action="delete" data-id="${escapeHtml(person.id)}" aria-label="Delete ${escapeHtml(person.name)}">⌫</button></td>
      </tr>
    `).join('');
  }

  document.querySelector('#table-summary').textContent = query
    ? `Showing ${visiblePeople.length} of ${people.length} people`
    : `Showing ${people.length} ${people.length === 1 ? 'person' : 'people'}`;
}

function showToast(message, isError = false) {
  toast.textContent = message;
  toast.classList.toggle('error', isError);
  toast.classList.add('visible');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('visible'), 3200);
}

async function loadPeople() {
  try {
    const result = await request('/api/users');
    people = result.data;
    setApiStatus(true);
    renderPeople();
  } catch (error) {
    setApiStatus(false, 'API unavailable');
    tableBody.innerHTML = `<tr><td colspan="4" class="message-cell error-message">${escapeHtml(error.message)}</td></tr>`;
    document.querySelector('#table-summary').textContent = 'Could not load records';
    document.querySelector('#total-stat').textContent = '—';
    document.querySelector('#nav-count').textContent = '—';
    document.querySelector('#record-count').textContent = '—';
  }
}

function openDialog(person) {
  form.reset();
  document.querySelector('#person-id').value = person?.id || '';
  document.querySelector('#name-input').value = person?.name || '';
  document.querySelector('#email-input').value = person?.email || '';
  document.querySelector('#age-input').value = person?.age ?? '';
  document.querySelector('#dialog-title').textContent = person ? 'Edit person' : 'Add person';
  saveButton.textContent = person ? 'Save changes' : 'Save person';
  dialog.showModal();
  document.querySelector('#name-input').focus();
}

document.querySelector('#add-user-button').addEventListener('click', () => openDialog());
document.querySelector('#close-dialog').addEventListener('click', () => dialog.close());
document.querySelector('#cancel-dialog').addEventListener('click', () => dialog.close());
searchInput.addEventListener('input', renderPeople);

tableBody.addEventListener('click', async (event) => {
  const button = event.target.closest('button[data-action]');
  if (!button) return;
  const person = people.find((entry) => entry.id === button.dataset.id);
  if (!person) return;
  if (button.dataset.action === 'edit') {
    openDialog(person);
    return;
  }
  if (!window.confirm(`Delete ${person.name} from the directory?`)) return;

  try {
    await request(`/api/users/${encodeURIComponent(person.id)}`, { method: 'DELETE' });
    showToast(`${person.name} was deleted.`);
    await loadPeople();
  } catch (error) {
    showToast(error.message, true);
  }
});

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  if (!form.reportValidity()) return;
  const id = document.querySelector('#person-id').value;
  const person = {
    name: document.querySelector('#name-input').value.trim(),
    email: document.querySelector('#email-input').value.trim(),
    age: Number(document.querySelector('#age-input').value),
  };
  saveButton.disabled = true;
  saveButton.textContent = 'Saving…';

  try {
    await request(id ? `/api/users/${encodeURIComponent(id)}` : '/api/users', {
      method: id ? 'PUT' : 'POST',
      body: JSON.stringify(person),
    });
    dialog.close();
    showToast(id ? 'Person details updated.' : 'Person added to the directory.');
    await loadPeople();
  } catch (error) {
    showToast(error.message, true);
  } finally {
    saveButton.disabled = false;
    saveButton.textContent = id ? 'Save changes' : 'Save person';
  }
});

loadPeople();
