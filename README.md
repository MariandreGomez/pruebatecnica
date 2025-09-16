# Gestor de Tareas 

## Requisitos
- Node.js 18+
- PostgreSQL 13+

## Configuración
1) Crea la base `taskmanager` y corre los scripts:
```bash
psql -d taskmanager -f sql/schema.sql
psql -d taskmanager -f sql/seed.sql
```
2) Crea `.env` (desde `.env.example`) y ajusta `DATABASE_URL` y `JWT_SECRET`.
3) Instala e inicia:
```bash
npm install
npm start
# Abre http://localhost:3000
```

## Usuarios demo
- admin / **admin123** (admin)
- alice / **alice123**
- bob / **bob123**
