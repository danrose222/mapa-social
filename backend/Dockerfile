# ---------------------------------------------------------------------------
# Etapa 1: builder
# Instala TODAS las dependencias (incluidas devDependencies, necesarias para
# compilar TypeScript) y genera el build de producción en /app/dist.
# ---------------------------------------------------------------------------
FROM node:20-alpine AS builder

WORKDIR /app

# Copiamos primero solo los manifiestos de dependencias para aprovechar la
# cache de capas de Docker: si package*.json no cambia, esta capa (npm ci)
# no se vuelve a ejecutar aunque cambie el código fuente.
COPY package.json package-lock.json ./

# npm ci en lugar de npm install: instala exactamente las versiones fijadas
# en package-lock.json (build reproducible) y es más rápido en entornos de
# CI/contenedores que npm install.
RUN npm ci

COPY . .

RUN npm run build

# Eliminamos las devDependencies ya usadas para compilar, para copiar a la
# etapa final solo lo que se necesita en tiempo de ejecución.
RUN npm prune --omit=dev

# ---------------------------------------------------------------------------
# Etapa 2: runner
# Imagen final, liviana, solo con el build compilado y las dependencias de
# producción. No incluye TypeScript, el código fuente ni herramientas de
# build.
# ---------------------------------------------------------------------------
FROM node:20-alpine AS runner

ENV NODE_ENV=production
WORKDIR /app

# uploads.service.ts crea este directorio en runtime si no existe (para el
# storage local de imágenes) -- como usuario "node" no puede crear nada
# directo bajo /app (queda owned por root), hay que dejarlo hecho acá con
# el owner correcto antes de bajar privilegios.
RUN mkdir -p uploads && chown node:node uploads

# Las imágenes oficiales node:*-alpine ya incluyen un usuario sin privilegios
# llamado "node". Ejecutar la app con ese usuario (en vez del root por
# defecto) reduce el impacto de una eventual RCE dentro del contenedor.
USER node

COPY --chown=node:node --from=builder /app/dist ./dist
COPY --chown=node:node --from=builder /app/node_modules ./node_modules
COPY --chown=node:node --from=builder /app/package.json ./package.json

EXPOSE 3000

# Se invoca node directamente sobre el archivo compilado en vez de
# "npm run start:prod", evitando el proceso intermedio de npm.
CMD ["node", "dist/main"]
