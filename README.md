# MVP — Esqueleto Aplicación Web + json-server

Basado en la estructura de [JoseMariaAlvarez/esqueleto-aplicacion-web](https://github.com/JoseMariaAlvarez/esqueleto-aplicacion-web), con **json-server** como API local en lugar del servidor Express con JWT.

---

## Estructura

```
mvp/
├── cliente/
│   ├── index.html       ← Login
│   ├── admin.html       ← Dashboard admin
│   ├── personal.html    ← CRUD de usuarios (solo admin)
│   ├── manager.html     ← Dashboard manager
│   ├── worker.html      ← Dashboard worker
│   ├── viewer.html      ← Visor JSON (todos los perfiles)
│   ├── config.html      ← Config (placeholder)
│   ├── api.js           ← Funciones de comunicación con el servidor
│   └── styles.css       ← Estilos
└── servidor/
    ├── db.json          ← Base de datos json-server
    ├── middleware.js    ← Simulación de auth + CORS
    └── package.json
```

---

## Arranque rápido

### 1. Iniciar el servidor (json-server)

```bash
cd servidor
npm install
npm start
```

El servidor arranca en **http://localhost:3000**

### 2. Abrir el cliente

Abre `cliente/index.html` directamente en el navegador, o sirve la carpeta cliente con cualquier servidor estático:

```bash
# Opción con npx
npx serve cliente

# Opción con Python
cd cliente && python3 -m http.server 8080
```

---

## Usuarios de prueba

| Usuario  | Contraseña | Perfil  |
|----------|-----------|---------|
| admin    | admin123  | admin   |
| manager  | manager1  | manager |
| ana      | worker1   | worker  |
| carlos   | worker2   | worker  |

---

## API (json-server + middleware)

| Método | Ruta           | Acceso         | Descripción               |
|--------|----------------|----------------|---------------------------|
| POST   | /auth/login    | Público        | Login, devuelve token     |
| GET    | /me            | Autenticado    | Info del usuario actual   |
| GET    | /health        | Público        | Estado del servidor       |
| GET    | /usuarios      | Solo admin     | Lista de usuarios         |
| PUT    | /usuarios/:id  | Solo admin     | Editar usuario            |
| POST   | /usuarios      | Solo admin     | Crear usuario             |
| DELETE | /usuarios/:id  | Solo admin     | Eliminar usuario          |
| GET    | /schedule      | Admin/Manager  | Planificación             |

---

## Diferencias respecto al esqueleto original

| Original (Express + JWT real)      | Este MVP (json-server)             |
|------------------------------------|------------------------------------|
| JWT firmado con `jsonwebtoken`      | Token base64 simple (solo MVP)     |
| Passwords con bcrypt hash          | Passwords en texto plano           |
| `usersDB.js` separado              | `db.json` para todo                |
| Servidor Express complejo          | json-server + middleware.js        |

> **Nota**: Este MVP es solo para desarrollo y pruebas. Para producción, usa el servidor Express original con JWT real y bcrypt.

## Cómo ejecutar el servidor y acceder a él

- Hay que meterse en la carpeta de `mockup-server` y ejecutar lo de npm...
- Hay que meterse en la carpeta de `src` y ejecutar `python3 -m http.server 8080`
