-- QUERIES postgresSQL
-- 1) Todas las tareas ordenadas por vencimiento
SELECT t.id, t.title, t.status, t.created_at, t.due_date, u.username AS asignado_a
FROM tasks t JOIN users u ON u.id = t.user_id
ORDER BY t.due_date ASC;

-- 2) Contar pendientes vs. completadas
SELECT status, COUNT(*) FROM tasks GROUP BY status;

-- 3) Atrasadas
SELECT t.id, t.title, t.status, t.created_at, t.due_date, u.username
FROM tasks t JOIN users u ON u.id = t.user_id
WHERE t.status='pendiente' AND t.due_date < CURRENT_DATE
ORDER BY t.due_date;

-- 4) Tareas por usuario (por nombre)
SELECT t.id, t.title, t.status, t.created_at, t.due_date, u.username
FROM tasks t JOIN users u ON u.id = t.user_id
WHERE u.username = :username
ORDER BY t.due_date;
