# Mapa Social

Plataforma colaborativa territorial para conectar necesidades comunitarias con recursos disponibles, ubicados geográficamente en un mapa interactivo. Pensada para que vecinos y organizaciones de Córdoba puedan registrar una necesidad o publicar un recurso, y encontrar ayuda cercana filtrando por categoría y distancia.

## Tecnologías

- **Backend**: NestJS + TypeORM
- **Frontend**: Angular + Leaflet
- **Base de datos**: MySQL 8
- **Infraestructura**: Docker & Docker Compose

## Estructura del proyecto

```
backend/    API REST (NestJS), migraciones y seed de datos de ejemplo
frontend/   Aplicación Angular (inicio, mapa, matching, estadísticas,
            solicitudes, perfil de organización, paneles de moderador)
database/   Script de inicialización de MySQL
```

## Requisitos previos

- Docker y Docker Compose
- Puertos libres en el host: **80** (frontend), **3000** (backend), **3306** (base de datos)

## Cómo levantar el proyecto — producción

Desde la raíz del repositorio:

```bash
docker compose up -d --build
```

Esto levanta los tres servicios (`db`, `backend`, `frontend`). La primera vez, o después de borrar el volumen de la base de datos, hay que crear las tablas y cargar datos de ejemplo:

```bash
docker exec mapa_social_backend npm run migration:run:prod
docker exec mapa_social_backend npm run seed:prod
```

Una vez arriba:

| Servicio | URL |
|---|---|
| Frontend | http://localhost |
| API | http://localhost:3000/api |
| Documentación (Swagger) | http://localhost:3000/docs |

## Cómo levantar el proyecto — desarrollo

El compose de desarrollo monta el código como volumen y corre el backend con `--watch`, para no reconstruir la imagen ante cada cambio.

```bash
# Primera vez (o tras cambiar dependencias)
docker compose -f docker-compose.dev.yml build

# Levantar
docker compose -f docker-compose.dev.yml up -d

# Ver logs del backend
docker compose -f docker-compose.dev.yml logs -f backend

# Entrar al contenedor del backend
docker compose -f docker-compose.dev.yml exec backend sh
```

Dentro del contenedor de desarrollo, las dependencias se instalan como en cualquier proyecto Node:

```bash
npm install <paquete>
```

## Variables de entorno

El backend lee su configuración de un archivo `.env` (ver `backend/.env.example`):

```
APP_NAME=Mapa Social
PORT=3000
NODE_ENV=development

DB_HOST=db
DB_PORT=3306
DB_USER=mapa_user
DB_PASS=mapa_password
DB_NAME=mapa_social

TYPEORM_LOGGING=true
TYPEORM_SYNCHRONIZE=false

JWT_SECRET=CAMBIAR_ESTA_CLAVE_MUY_LARGA
JWT_EXPIRES=7d
```

## Migraciones y datos de ejemplo

El esquema se maneja con migraciones de TypeORM (`synchronize` está deshabilitado a propósito). Hay dos variantes de cada comando según el entorno: contra el código fuente con `ts-node` (desarrollo) o contra el build compilado en `dist/` (producción, donde no existe código fuente dentro del contenedor).

| Acción | Desarrollo | Producción |
|---|---|---|
| Generar migración | `npm run migration:generate` | — |
| Correr migraciones | `npm run migration:run` | `npm run migration:run:prod` |
| Revertir última migración | `npm run migration:revert` | `npm run migration:revert:prod` |
| Cargar datos de ejemplo | `npm run seed` | `npm run seed:prod` |

El seed crea un rol, un usuario, una categoría, una necesidad y un recurso de ejemplo (centrados en Córdoba), útiles para ver el mapa poblado sin cargar datos a mano.

## Generar módulos (backend)

```bash
npx nest g module <nombre>
npx nest g controller <nombre>
npx nest g service <nombre>
```

## API

Módulos activos, todos bajo el prefijo `/api`: `roles`, `users`, `categories`, `needs`, `resources`, `organizations`, `solicitudes`, `stats`, `uploads`. Cada uno expone el CRUD estándar (`POST`, `GET`, `GET /:id`, `PATCH /:id`, `DELETE /:id`) donde corresponde.

`needs` además expone `GET /api/needs/search` (filtros por `category` y cercanía geográfica combinando `lat`, `lng` y `radius`, en kilómetros, hasta 50) y `GET /api/needs/:id/matches` (recursos disponibles de la misma categoría, ordenados por distancia).

El detalle completo de cada endpoint, con sus esquemas de entrada y salida, está en Swagger (`/docs`).

## Frontend

Rutas principales: `/` (inicio), `/mapa` (mapa interactivo centrado en Córdoba, con pines de necesidades y recursos), `/publicar/necesito-ayuda`, `/publicar/ofrecer-recurso`, `/organizacion/:id` (perfil público), `/estadisticas`, `/mis-solicitudes`, `/entrar` y `/registro`. Los paneles de moderador (`/moderador/publicaciones`, `/moderador/organizaciones`, `/moderador/mis-localidades`) requieren sesión con rol moderador.

## Flujo de trabajo

El repositorio sigue un esquema tipo git-flow: las ramas `feature/*` o `fix/*` se integran a `develop` mediante Pull Request, y `develop` se promueve a `main` de forma manual. `main` está protegida y requiere PR aprobado antes de mergear.
