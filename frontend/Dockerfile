# ---------------------------------------------------------------------------
# Etapa 1: builder
# Compila la aplicación Angular a archivos estáticos (HTML/JS/CSS) usando
# Node 20 LTS. Esta etapa no forma parte de la imagen final.
# ---------------------------------------------------------------------------
FROM node:20-alpine AS builder

WORKDIR /app

COPY package.json package-lock.json ./

# npm ci en vez de npm install: instala exactamente las versiones fijadas
# en package-lock.json (build reproducible) en vez de resolver de nuevo el
# árbol de dependencias en cada build.
RUN npm ci

COPY . .

RUN npm run build -- --configuration production

# ---------------------------------------------------------------------------
# Etapa 2: runner
# Sirve los archivos estáticos compilados con Nginx (variante "unprivileged":
# corre sin root y escucha en 8080).
# ---------------------------------------------------------------------------
FROM nginxinc/nginx-unprivileged:alpine AS runner

COPY --from=builder --chown=nginx:nginx /app/dist/frontend/browser /usr/share/nginx/html

COPY --chown=nginx:nginx nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 8080

CMD ["nginx", "-g", "daemon off;"]
