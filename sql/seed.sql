-- PostgreSQL — Datos de ejemplo 
INSERT INTO users (username, is_admin, password) VALUES
  ('admin', TRUE, 'admin123'),
  ('alice', FALSE, 'alice123'),
  ('bob', FALSE, 'bob123');

INSERT INTO tasks (title, status, created_at, due_date, user_id) VALUES
  ('Preparar informe', 'pendiente', CURRENT_DATE, CURRENT_DATE, (SELECT id FROM users WHERE username='alice')),
  ('Revisar contratos', 'pendiente', CURRENT_DATE, CURRENT_DATE, (SELECT id FROM users WHERE username='bob')),
  ('Enviar correos', 'completada', CURRENT_DATE, CURRENT_DATE, (SELECT id FROM users WHERE username='alice')),
  ('Backup semanal', 'pendiente', CURRENT_DATE - INTERVAL '7 days', CURRENT_DATE - INTERVAL '5 days', (SELECT id FROM users WHERE username='bob')),
  ('Actualizar landing', 'pendiente', CURRENT_DATE - INTERVAL '5 days', CURRENT_DATE - INTERVAL '3 days', (SELECT id FROM users WHERE username='admin'));
