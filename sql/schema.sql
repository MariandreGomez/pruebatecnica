-- PostgreSQL — )
DROP TABLE IF EXISTS tasks;
DROP TABLE IF EXISTS users;

CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  username VARCHAR(50) UNIQUE NOT NULL,
  is_admin BOOLEAN NOT NULL DEFAULT FALSE,
  password TEXT NOT NULL
);

CREATE TABLE tasks (
  id SERIAL PRIMARY KEY,
  title VARCHAR(200) NOT NULL,
  status VARCHAR(12) NOT NULL CHECK (status IN ('pendiente','completada')),
  created_at DATE NOT NULL DEFAULT CURRENT_DATE,
  due_date DATE NOT NULL,
  user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  CONSTRAINT chk_due_after_created CHECK (due_date >= created_at)
);

CREATE INDEX idx_tasks_user ON tasks(user_id);
CREATE INDEX idx_tasks_due ON tasks(due_date);
