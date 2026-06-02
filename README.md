# BancoSol - Aplicación Web de Gestión

Aplicación web para la gestión de campañas de recogida de alimentos en supermercados, con sistema de turnos y gestión de voluntarios.

## Inicio Rápido con Docker

### Prerrequisitos

- Docker y Docker Compose instalados
- Cuenta en [Supabase](https://supabase.com) con un proyecto creado

### 1. Configurar variables de entorno

Crea un archivo `.env` en la raíz del proyecto:

```bash
cp .env.example .env
```

Edita `.env` con tus credenciales de Supabase:

```env
SUPABASE_URL=https://tu-proyecto.supabase.co
SUPABASE_KEY=tu-anon-key
SUPABASE_SERVICE_KEY=tu-service-role-key
```

**Dónde encontrar las credenciales:**
- Ve a tu proyecto en [supabase.com](https://supabase.com)
- Settings → API
- Copia `Project URL`, `anon public key` y `service_role key`

### 2. Levantar la aplicación

```bash
docker-compose up -d
```

La aplicación estará disponible en:
- **Frontend**: http://localhost:3000
- **API**: http://localhost:3000/health

### 3. Ver logs

```bash
docker-compose logs -f
```

### 4. Detener la aplicación

```bash
docker-compose down
```

---

## 📦 Instalación sin Docker

### 1. Instalar dependencias

```bash
cd mockup-server
npm install
```

### 2. Configurar variables de entorno

Crea el archivo `.env` en la raíz del proyecto (ver sección anterior).

### 3. Iniciar el servidor

```bash
cd mockup-server
npm start
```

### 4. Servir el frontend

En otra terminal:

```bash
cd src
python3 -m http.server 8080
```

O con npx:

```bash
npx serve src -p 8080
```

Accede a http://localhost:8080

---

## Navegación entre React y HTML legacy

La regla simple es:
- React Router solo gestiona rutas React.
- Para salir de React e ir a HTML legacy usa enlaces <a> normales.
- Para volver desde HTML a React usa un <a> que apunte a /.

### React -> HTML legacy (recarga completa)

Usa enlaces <a> hacia /html/*.html. Esto hace una navegacion tradicional y carga el HTML legacy.

```jsx
export default function Home() {
	return (
		<nav>
			<a href="/html/inicio.html">Inicio (legacy)</a>
			<a href="/html/tiendas.html">Tiendas (legacy)</a>
		</nav>
	)
}
```

### HTML legacy -> React

En el header legacy, apunta a la raiz de React para volver a la SPA.

```html
<a href="/">Inicio React</a>
```

### React -> React (SPA)

Para navegar dentro de React, usa Link de react-router-dom.

```jsx
import { Link } from "react-router-dom";

function MenuReact() {
	return (
		<nav>
			<Link to="/">Home React</Link>
			<Link to="/react">Pagina React</Link>
		</nav>
	)
}
```

### Navegacion programatica en React

Si necesitas navegar despues de una accion (por ejemplo, un submit):

```jsx
import { useNavigate } from "react-router-dom";

function Login() {
	const navigate = useNavigate();

	function onSuccess() {
		navigate("/react");
	}

	return <button onClick={onSuccess}>Entrar</button>;
}
```

Con esto mantienes React vivo en sus rutas internas y haces transiciones limpias
entre la SPA y las paginas HTML legacy.

## 👥 Usuarios de Prueba

| Usuario | Contraseña | Rol         | Permisos                           |
|---------|-----------|-------------|-------------------------------------|
| admin   | admin123  | Administrador | Acceso total, gestión de usuarios |
| manager | manager1  | Gestor      | Gestión de campañas y turnos       |
| ana     | worker1   | Voluntario  | Ver turnos asignados               |
| carlos  | worker2   | Voluntario  | Ver turnos asignados               |

---

## 🗄️ Base de Datos (Supabase)

### Schema de tablas

**Principales:**
- `usuario` - Usuarios del sistema
- `campania` - Campañas de recogida
- `tienda` - Supermercados
- `entidad` - Organizaciones colaboradoras
- `turno` - Turnos asignados

**Auxiliares:**
- `zona` - Zonas geográficas
- `cp` - Códigos postales
- `cadena` - Cadenas de supermercados
- `distrito` - Distritos
- `voluntario` - Voluntarios
- `asignacion_tienda` - Asignaciones usuario-tienda
- `asignacion_zona` - Asignaciones usuario-zona
- `tienda_campania` - Relación tienda-campaña
- `contacto_adicional` - Contactos adicionales

---

## 🔌 API Endpoints

| Método | Ruta              | Acceso         | Descripción                    |
|--------|-------------------|----------------|--------------------------------|
| POST   | /auth/login       | Público        | Login, devuelve token          |
| GET    | /me               | Autenticado    | Info del usuario actual        |
| GET    | /health           | Público        | Estado del servidor            |
| GET    | /usuarios         | Solo admin     | Lista de usuarios              |
| POST   | /usuarios         | Solo admin     | Crear usuario                  |
| PUT    | /usuarios/:id     | Solo admin     | Editar usuario                 |
| DELETE | /usuarios/:id     | Solo admin     | Eliminar usuario               |
| GET    | /campanias        | Autenticado    | Lista de campañas              |
| POST   | /campanias        | Autenticado    | Crear campaña                  |
| GET    | /tiendas          | Autenticado    | Lista de tiendas               |
| POST   | /tiendas          | Autenticado    | Crear tienda                   |
| GET    | /entidades        | Autenticado    | Lista de entidades             |
| POST   | /entidades        | Autenticado    | Crear entidad                  |
| PUT    | /entidades/:id    | Autenticado    | Editar entidad                 |
| DELETE | /entidades/:id    | Autenticado    | Eliminar entidad               |
| GET    | /turnos           | Autenticado    | Lista de turnos                |
| POST   | /turnos           | Autenticado    | Crear turno                    |
| GET    | /schedule         | Admin/Manager  | Planificación (alias de turnos)|
| POST   | /schedule         | Admin/Manager  | Crear turno                    |
| PUT    | /schedule/:id     | Admin/Manager  | Editar turno                   |
| DELETE | /schedule/:id     | Admin/Manager  | Eliminar turno                 |

---

## 🛠️ Comandos Docker

```bash
# Levantar servicios
docker-compose up -d

# Ver logs en tiempo real
docker-compose logs -f

# Detener servicios
docker-compose down

# Reconstruir el servidor (tras cambios en código)
docker-compose up -d --build

# Reiniciar el servidor
docker-compose restart
```

---

## 📁 Estructura del Proyecto

```
.
├── src/                      # Frontend (HTML, CSS, JS)
│   ├── index.html           # Login
│   ├── admin.html           # Dashboard administrador
│   ├── manager.html         # Dashboard gestor
│   ├── worker.html          # Dashboard voluntario
│   ├── personal.html        # CRUD de usuarios
│   ├── config.html          # Configuración
│   ├── viewer.html          # Visor de datos
│   ├── api.js               # Cliente API
│   └── styles.css           # Estilos
├── mockup-server/           # Backend (Express + Supabase)
│   ├── server.js            # Servidor principal
│   ├── supabase-client.js   # Cliente de Supabase
│   ├── middleware.js        # Middleware de autenticación
│   ├── package.json         # Dependencias
│   └── Dockerfile           # Imagen Docker
├── docker-compose.yml       # Configuración Docker
├── .env.example             # Plantilla de variables de entorno
└── README.md                # Este archivo
```

---

## 🔒 Seguridad

> ⚠️ **Importante**: Este proyecto usa autenticación básica con tokens base64 para desarrollo. Para producción, implementa:
> - JWT firmados con `jsonwebtoken`
> - Passwords hasheados con `bcrypt`
> - HTTPS
> - Políticas RLS (Row Level Security) en Supabase

---

## 🤝 Contribuir

1. Haz fork del proyecto
2. Crea una rama para tu feature (`git checkout -b feature/nueva-funcionalidad`)
3. Commit tus cambios (`git commit -am 'Añadir nueva funcionalidad'`)
4. Push a la rama (`git push origin feature/nueva-funcionalidad`)
5. Abre un Pull Request

---

## 📝 Licencia

Este proyecto es parte de un trabajo académico.
