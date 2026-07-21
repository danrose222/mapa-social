# Mapa Social

Proyecto de academia para gestionar publicaciones de necesidades y recursos.

## Tecnologías
- Angular (Frontend)
- NestJS (Backend)
- MySQL (Base de datos)
- Docker & Docker Compose

## Cómo levantar el proyecto - producción
Ejecuta el siguiente comando en la raíz del proyecto:
```bash
docker-compose up --build
```

## Cómo utilizar docker en desarrollo

### La primera vez:

docker compose -f docker-compose.dev.yml build

### Levantar
docker compose -f docker-compose.dev.yml up -d

### Ver logs
docker compose -f docker-compose.dev.yml logs -f backend

### Entrar al contenedor
docker compose -f docker-compose.dev.yml exec backend sh

### Instalar paquetes

Ahora sí, dentro del contenedor podrás hacer simplemente:
npm install @nestjs/typeorm typeorm mysql2
Luego:
npm install class-validator class-transformer
etc.

### Generar módulos
    npx nest g module usuarios
    npx nest g controller usuarios
    npx nest g service usuarios

### Generar migraciones

    npm run migration:generate
    npm run migration:run
