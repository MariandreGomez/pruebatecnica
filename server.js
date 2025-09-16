//cargar modulos y variables de entorno
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const { Pool } = require('pg');
const jwt = require('jsonwebtoken');

//crear app y middlewares
const app = express();
app.use(express.json());
app.use(cors());
app.use(express.static(path.join(__dirname, 'public')));

//configurar base de datos
const DATABASE_URL = process.env.DATABASE_URL;
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';

if (!DATABASE_URL) {
  console.error('Falta DATABASE_URL en .env');
  process.exit(1);
}
const pool = new Pool({ connectionString: DATABASE_URL });

//autenticaciones y autorizaciones
function signUser(u) {
  return jwt.sign({ id: u.id, username: u.username, is_admin: u.is_admin }, JWT_SECRET, { expiresIn: '8h' });
}
function authRequired(req, res, next) {
  const auth = req.headers.authorization || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Falta token' });
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.user = payload; // {id, username, is_admin}
    next();
  } catch {
    return res.status(401).json({ error: 'Token inválido' });
  }
}
async function isAdmin(userId) {
  const { rows } = await pool.query('SELECT is_admin FROM users WHERE id = $1', [userId]);
  return rows[0]?.is_admin === true;
}

// -------- Auth ----------
app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ error: 'username y password requeridos' });
    const { rows } = await pool.query('SELECT id, username, is_admin, password FROM users WHERE username = $1', [username]);
    const user = rows[0];
    if (!user || user.password !== password) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }
    const token = signUser(user);
    res.json({ token, user: { id: user.id, username: user.username, is_admin: user.is_admin } });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Error en login' });
  }
});

app.get('/api/auth/me', authRequired, (req, res) => {
  res.json({ user: req.user });
});

// -------- Usuarios ----------
app.get('/api/users', authRequired, async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT id, username, is_admin FROM users ORDER BY id');
    res.json(rows);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Error obteniendo usuarios' });
  }
});

app.post('/api/users', authRequired, async (req, res) => {
  try {
    if (!req.user?.is_admin) return res.status(403).json({ error: 'Solo admin' });
    const { username, isAdmin, password } = req.body;
    if (!username || !password) return res.status(400).json({ error: 'username y password requeridos' });
    const { rows } = await pool.query(
      'INSERT INTO users (username, is_admin, password) VALUES ($1, $2, $3) RETURNING id, username, is_admin',
      [username, !!isAdmin, password]
    );
    res.status(201).json(rows[0]);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Error creando usuario' });
  }
});

// -------- Tareas ----------SS.
app.get('/api/tasks', authRequired, async (req, res) => {
  try {
    const currentUserId = req.user.id;
    const admin = req.user.is_admin === true;

    let query = `
      SELECT t.id, t.title, t.status, t.created_at, t.due_date, t.user_id, u.username
      FROM tasks t
      JOIN users u ON u.id = t.user_id
    `;
    const params = [];

    if (!admin) {
      params.push(currentUserId);
      query += ` WHERE t.user_id = $1 `;
    }

    query += ` ORDER BY t.due_date ASC `;

    const { rows } = await pool.query(query, params);
    res.json(rows);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Error obteniendo tareas' });
  }
});

app.post('/api/tasks', authRequired, async (req, res) => {
  try {
    const { title, createdAt, dueDate, userId } = req.body;
    if (!title || !createdAt || !dueDate || !userId) {
      return res.status(400).json({ error: 'title, createdAt, dueDate y userId son requeridos' });
    }
    if (dueDate < createdAt) {
      return res.status(400).json({ error: 'dueDate no puede ser anterior a createdAt' });
    }
    const { rows } = await pool.query(
      `INSERT INTO tasks (title, status, created_at, due_date, user_id)
       VALUES ($1, 'pendiente', $2, $3, $4)
       RETURNING id, title, status, created_at, due_date, user_id`,
      [title, createdAt, dueDate, userId]
    );
    res.status(201).json(rows[0]);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Error creando tarea' });
  }
});

app.patch('/api/tasks/:id', authRequired, async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { status } = req.body;
    if (!['pendiente','completada'].includes(status)) {
      return res.status(400).json({ error: 'status inválido' });
    }
    const { rows } = await pool.query(
      `UPDATE tasks SET status = $1 WHERE id = $2
       RETURNING id, title, status, created_at, due_date, user_id`,
      [status, id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'tarea no encontrada' });
    res.json(rows[0]);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Error actualizando tarea' });
  }
});

// -------- Fallback Front --------
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log('Servidor http://localhost:' + PORT));