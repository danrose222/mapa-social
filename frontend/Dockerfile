# ---------------------------------------------------------------------------
# Etapa 1: builder
# Compila la aplicación Angular a archivos estáticos (HTML/JS/CSS) usando
# Node 20 LTS. Esta etapa no forma parte de la imagen final: sus
# devDependencies, código fuente y herramientas de build no viajan a
# producción.
# ---------------------------------------------------------------------------
FROM node:20-alpine AS builder

WORKDIR /app

# Copiamos primero solo los manifiestos de dependencias para aprovechar la
# cache de capas de Docker: si package*.json no cambia, esta capa (npm ci)
# no se vuelve a ejecutar aunque cambie el código fuente.
COPY package.json package-lock.json ./

# npm ci en lugar de npm install: instala exactamente las versiones fijadas
# en package-lock.json (build reproducible) y es más rápido en CI/contenedores.
RUN npm ci

COPY . .

RUN npm run build -- --configuration production

# ---------------------------------------------------------------------------
# Etapa 2: runner
# Sirve los archivos estáticos compilados con Nginx. Se usa la variante
# oficial "unprivileged" de Nginx en lugar de la imagen nginx:alpine
# estándar: viene preconfigurada para correr como usuario sin privilegios
# (no root) y escuchar en el puerto 8080, ya que el puerto 80 requiere
# privilegios de root que la imagen estándar no puede evitar.
# ---------------------------------------------------------------------------
FROM nginxinc/nginx-unprivileged:alpine AS runner

COPY --from=builder --chown=nginx:nginx /app/dist/frontend/browser /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 8080

CMD ["nginx", "-g", "daemon off;"]
