// APIS y almacenamiento
const API = {
  login: '/api/auth/login',
  me: '/api/auth/me',
  users: '/api/users',
  tasks: '/api/tasks',
};
const STORAGE = {
  token: 'tm_token',
};


let token = localStorage.getItem(STORAGE.token) || '';

//peticions a API en el header 
async function api(path, options = {}) {
  options.headers = options.headers || {};
  if (token) options.headers['Authorization'] = 'Bearer ' + token;
  const res = await fetch(path, options);
  if (res.status === 401) {
    logout();
    return Promise.reject(new Error('No autorizado'));
  }
  return res;
}
function setToken(t) { token = t; localStorage.setItem(STORAGE.token, t); }
function logout() { token = ''; localStorage.removeItem(STORAGE.token); location.reload(); }

//Estado de la app para facilitar el render
let users = [];
let tasks = [];
let me = null;             

// utilizar el div app en el html
const app = document.getElementById('app');

//manejar fechas, verificar si una tarea esta vencida y obtener usuario por id
function parseDate(s) { return new Date(s + 'T00:00:00'); }
function formatDate(s) { return new Date(s + 'T00:00:00').toLocaleDateString(); }
function isOverdue(task) {
  const today = new Date(); today.setHours(0,0,0,0);
  const due = parseDate(task.due_date || task.dueDate);
  const status = task.status;
  return status === 'pendiente' && due < today;
}
function getUser(users, id) { return users.find(u => u.id === Number(id)); }

//Vista de login
function viewLogin(errorMsg = '') {
  app.innerHTML = `
  <div class="center">
    <div class="card login">
      <div class="brand">
        <div class="logo">GT</div>
        <h1>Gestor de Tareas</h1>
        <p class="helper">Ingresa con tu usuario y contraseña</p>
      </div>
      ${errorMsg ? `<div class="error">${errorMsg}</div>` : ''}
      <form id="loginForm" class="form" autocomplete="on">
        <div class="field">
          <label for="username">Usuario</label>
          <input id="username" name="username" type="text" required />
        </div>
        <div class="field">
          <label for="password">Contraseña</label>
          <input id="password" name="password" type="password" required />
        </div>
        <div class="actions">
          <button type="submit">Entrar</button>
        </div>
        <p class="helper">Usuarios demo: admin/admin123 · alice/alice123 · bob/bob123</p>
      </form>
    </div>
  </div>`;

  const form = document.getElementById('loginForm');
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const username = form.username.value.trim();
    const password = form.password.value.trim();
    try {
      const res = await fetch(API.login, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      if (!res.ok) {
        const err = await res.json().catch(()=>({error:'Error'}));
        return viewLogin(err.error || 'Error de autenticación');
      }
      const data = await res.json();
      setToken(data.token);
      await bootApp();
    } catch {
      viewLogin('No se pudo conectar al servidor');
    }
  });
}

// Vista principal de la app
function viewApp() {
  const showFilter = !!me?.is_admin;

  app.innerHTML = `
  <header class="card">
    <div style="display:flex;justify-content:space-between;align-items:center;gap:1rem;flex-wrap:wrap">
      <div>
        <h1 style="margin:.2rem 0">Gestor de Tareas</h1>
        <p class="subtitle">PostgreSQL · Login con token · Paleta verde</p>
      </div>
      <div>
        <button class="ghost" id="logoutBtn">Cerrar sesión (${me?.username}${me?.is_admin ? ' · admin' : ''})</button>
      </div>
    </div>
  </header>

  <section class="card">
    <h2>Controles</h2>
    <div class="controls">
      ${showFilter ? `
      <div class="control">
        <label for="filterUserSelect">Filtrar por usuario</label>
        <div class="row">
          <select id="filterUserSelect"></select>
          <button id="clearFilterBtn" class="ghost" type="button">Quitar filtro</button>
        </div>
      </div>` : `
      <p class="helper">Ves únicamente tus tareas.</p>`}
    </div>
    <div id="counters" class="counters" aria-live="polite"></div>
  </section>

  <section class="card">
    <h2>Tareas</h2>
    <div class="table-wrapper">
      <table>
        <thead>
          <tr>
            <th>Título</th>
            <th>Estado</th>
            <th>Creación</th>
            <th>Vencimiento</th>
            <th>Usuario</th>
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody id="taskTbody"></tbody>
      </table>
    </div>
  </section>

  <section class="grid">
    <details class="card">
      <summary><strong>➕ Agregar tarea</strong></summary>
      <form id="taskForm" class="form">
        <div class="field">
          <label for="taskTitle">Título</label>
          <input id="taskTitle" name="title" type="text" required />
        </div>
        <div class="field">
          <label for="taskCreated">Fecha de creación</label>
          <input id="taskCreated" name="createdAt" type="date" required />
        </div>
        <div class="field">
          <label for="taskDue">Fecha de vencimiento</label>
          <input id="taskDue" name="dueDate" type="date" required />
        </div>
        <div class="field">
          <label for="taskUser">Asignar a</label>
          <select id="taskUser" name="userId" required></select>
        </div>
        <div class="actions">
          <button type="submit">Guardar tarea</button>
        </div>
      </form>
    </details>

    <details class="card">
      <summary><strong>👤 Administrar usuarios</strong></summary>
      <form id="userForm" class="form">
        <div class="field">
          <label for="username">Nombre de usuario</label>
          <input id="username" name="username" type="text" required />
        </div>
        <div class="field">
          <label for="password">Contraseña</label>
          <input id="password" name="password" type="password" required />
        </div>
        <div class="field checkbox">
          <label class="checkbox">
            <input id="isAdmin" name="isAdmin" type="checkbox" />
            <span>Es administrador</span>
          </label>
        </div>
        <div class="actions">
          <button type="submit">Crear usuario</button>
        </div>
      </form>
    </details>
  </section>

  <footer class="footer">
    <small>Prueba Técnica — UI conectada a PostgreSQL con login</small>
  </footer>
  `;

  //filtros y logout
  document.getElementById('logoutBtn').addEventListener('click', logout);

  const filterUserSelect = document.getElementById('filterUserSelect');
  const clearFilterBtn = document.getElementById('clearFilterBtn');
  const taskTbody = document.getElementById('taskTbody');
  const countersEl = document.getElementById('counters');

  const taskForm = document.getElementById('taskForm');
  const taskTitleEl = document.getElementById('taskTitle');
  const taskCreatedEl = document.getElementById('taskCreated');
  const taskDueEl = document.getElementById('taskDue');
  const taskUserEl = document.getElementById('taskUser');

  const userForm = document.getElementById('userForm');
  const usernameEl = document.getElementById('username');
  const passwordEl = document.getElementById('password');
  const isAdminEl = document.getElementById('isAdmin');

  function populateUserSelects() {
    //Seleccionar opcion de usuario (solo admin puede asignar a otros)
    const assignable = me.is_admin ? users : users.filter(u => u.id === me.id);

    const optsUsers = users.map(u => `<option value="${u.id}">${u.username}${u.is_admin ? ' (admin)' : ''}</option>`).join('');
    const optsAssignable = assignable.map(u => `<option value="${u.id}">${u.username}${u.is_admin ? ' (admin)' : ''}</option>`).join('');

    if (filterUserSelect) {
      filterUserSelect.innerHTML = '<option value="">Todos</option>' + optsUsers;
      filterUserSelect.value = '';
    }
    taskUserEl.innerHTML = optsAssignable;
  }

  function render() {
    //filtrado de usuario
    let visible = tasks.slice();
    const filterUserId = filterUserSelect && filterUserSelect.value ? Number(filterUserSelect.value) : null;
    if (me.is_admin && filterUserId) visible = visible.filter(t => t.user_id === filterUserId);

    // Orden y tabla
    visible.sort((a,b) => a.due_date.localeCompare(b.due_date));
    taskTbody.innerHTML = visible.map(task => {
      const user = getUser(users, task.user_id);
      const overdue = isOverdue(task);
      const statusBadge = task.status === 'completada'
        ? `<span class="badge done">completada</span>`
        : overdue ? `<span class="badge overdue">pendiente</span>`
                  : `<span class="badge pending">pendiente</span>`;
      return `<tr class="${overdue ? 'overdue' : ''}" data-id="${task.id}">
        <td><span class="task-title ${overdue ? 'overdue' : ''}">${task.title}</span></td>
        <td>${statusBadge}</td>
        <td>${formatDate(task.created_at)}</td>
        <td>${formatDate(task.due_date)}</td>
        <td>${user ? user.username : '—'}</td>
        <td>
          <label class="checkbox">
            <input type="checkbox" class="complete-toggle" ${task.status === 'completada' ? 'checked' : ''} />
            <span>Marcar completada</span>
          </label>
        </td>
      </tr>`;
    }).join('');

    // Contadores de lo visible
    const pending = visible.filter(t => t.status === 'pendiente').length;
    const completed = visible.filter(t => t.status === 'completada').length;
    countersEl.textContent = `Pendientes: ${pending} • Completadas: ${completed}`;

    document.querySelectorAll('.complete-toggle').forEach(cb => {
      cb.addEventListener('change', async (e) => {
        const tr = e.target.closest('tr');
        const id = Number(tr.dataset.id);
        const status = e.target.checked ? 'completada' : 'pendiente';
        await api(`/api/tasks/${id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status })
        });
        await fetchTasks();
        render();
      });
    });
  }

  if (filterUserSelect) {
    filterUserSelect.addEventListener('change', render);
    clearFilterBtn.addEventListener('click', () => { filterUserSelect.value = ''; render(); });
  }

  // Crear tarea
  taskForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const title = taskTitleEl.value.trim();
    const createdAt = taskCreatedEl.value;
    const dueDate = taskDueEl.value;
    const userId = Number(taskUserEl.value);
    if (!title) return alert('El título es obligatorio');
    if (dueDate < createdAt) return alert('La fecha de vencimiento no puede ser anterior a la fecha de creación.');

    const res = await api(API.tasks, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, createdAt, dueDate, userId })
    });
    if (!res.ok) {
      const err = await res.json().catch(()=>({}));
      return alert('Error creando tarea: ' + (err.error || res.statusText));
    }
    taskForm.reset(); initDates();
    await fetchTasks();
    render();
  });

  // Crear usuario (solo admin)
  userForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const username = usernameEl.value.trim();
    const password = passwordEl.value.trim();
    const isAdmin = !!isAdminEl.checked;
    if (!username || !password) return alert('Usuario y contraseña son obligatorios');
    const res = await api(API.users, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password, isAdmin })
    });
    if (!res.ok) {
      const err = await res.json().catch(()=>({}));
      return alert('Error creando usuario: ' + (err.error || res.statusText));
    }
    usernameEl.value = ''; passwordEl.value = ''; isAdminEl.checked = false;
    await fetchUsers();
    populateUserSelects();
    await fetchTasks();
    render();
  });

  function initDates() {
    const today = new Date().toISOString().slice(0,10);
    taskCreatedEl.value = today;
    taskDueEl.value = today;
  }

  //view
  populateUserSelects();
  initDates();
  render();
}

// --------------- Carga de datos ---------------
async function fetchMe() {
  const res = await api(API.me);
  const data = await res.json();
  me = data.user; 
}
async function fetchUsers() {
  const res = await api(API.users);
  users = await res.json();
}
async function fetchTasks() {
  const res = await api(API.tasks);
  tasks = await res.json();
}

// --------------- Boot ---------------
async function bootApp() {
  try {
    await fetchMe();
    await fetchUsers();
    await fetchTasks();
    viewApp();
  } catch {
    viewLogin();
  }
}

// Start
if (token) { bootApp(); } else { viewLogin(); }