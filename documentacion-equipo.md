# Mapa Social — Documentación para el equipo

Este documento cubre dos cosas: **quién puede hacer qué** (roles) y **qué hay en cada pantalla** (mapa de navegación). Refleja el estado real del código en `frontend-v2` + `backend` a la fecha de este documento — no es aspiracional, todo lo que dice acá está probado.

---

## 1. Roles

Hay 2 roles en la tabla `roles` de la base (`seed-role`, `moderador`), más un "nivel" extra que no es un rol propiamente dicho pero cambia lo que podés hacer: pertenecer a una organización avalada.

| Rol | Cómo se obtiene | Cuenta de prueba (login) | Qué puede hacer | ¿Tiene panel propio? |
|---|---|---|---|---|
| **Vecino** (`seed-role`) | Registro libre en `/registro`, nadie lo aprueba | `seed@example.com` / `seed-password`, o cualquiera de `lucia.fernandez@example.com` … `tomas.herrera@example.com` / `vecino123` | Publicar necesidades, ver el mapa, ofrecerse a ayudar (Solicitudes), crear una organización (queda pendiente), ver "Mis solicitudes" | No — solo sus propias pantallas |
| **Miembro de organización avalada** | No es un rol distinto en la base — es un vecino con `organizationId` apuntando a una organización con `verified: true` | Cualquier cuenta de vecino, una vez que un moderador avala su organización | Todo lo del vecino, más: publicar recursos en nombre de la organización, editar el perfil de la organización | `/organizacion/mi-organizacion` |
| **Moderador** | Solo otro moderador puede asignarlo (`PATCH /users/:id {roleId: 2}`), o se provisiona directo en `seed.ts`/la base | `moderador@example.com` / `moderador123` — tiene asignadas Córdoba y Río Segundo | Todo lo anterior, más: avalar/rechazar organizaciones (**acotado a sus localidades asignadas**), moderar cualquier necesidad/recurso (marcar resuelto, eliminar, ocultar contacto) — esto **no** está acotado por localidad, otorgar/quitar localidades a otro moderador que ya tenga esa localidad asignada | `/moderador/publicaciones`, `/moderador/organizaciones`, `/moderador/mis-localidades` |

No hay rol admin: promover/degradar usuarios lo puede hacer cualquier moderador (igual que el resto de las acciones de moderación), no hay una capa de "súper usuario" separada. Gestionar quién es moderador de qué localidad sigue siendo, por ahora, algo que se resuelve por API/base de datos — no hay una pantalla dedicada para que un moderador le otorgue una localidad a otro (queda documentado como pendiente, no bloqueante para lo que el equipo pidió).

### Protecciones de seguridad ya construidas

- Un miembro de organización puede editar su propio perfil, pero **nunca** puede auto-avalarse.
- Un moderador solo puede otorgar u quitar una localidad a otro usuario si él mismo ya tiene esa localidad asignada.
- Una organización ya avalada no puede cambiar de ciudad por autoservicio (solo un moderador puede reubicarla).

### Cómo iniciar sesión como cada uno

Todas las cuentas de arriba ya existen si corriste `npm run seed:prod`. Andá a `/entrar`, usá el email y contraseña de la tabla. No hay recuperación de contraseña todavía — si alguien la pierde, hay que resetearla a mano en la base.

---

## 2. Mapa de navegación

Todo vive bajo un layout global (`AppShellComponent`) que pone la barra de navegación azul en cada pantalla — el logo siempre vuelve a `/`.

```
/ (Mapa — home)
├── /publicar
│   ├── /publicar/necesito-ayuda
│   ├── /publicar/quiero-ayudar
│   │   └── /publicar/quiero-ayudar/:id
│   ├── /publicar/ofrecer-recurso
│   └── /organizacion/crear (link secundario, no una tarjeta grande)
├── /quienes-somos
├── /mis-solicitudes
├── /organizacion/mi-organizacion
├── /entrar
├── /registro
├── /moderador/publicaciones      (moderador)
├── /moderador/organizaciones     (moderador)
└── /moderador/mis-localidades    (moderador)
```

### Pantalla por pantalla

| Ruta | Quién entra | Qué se puede hacer ahí |
|---|---|---|
| `/` — **Mapa** | Cualquiera | Recorrer el mapa (pines: corazón naranja = necesidad, mano azul = recurso), filtrar por tipo y categoría (chips con el mismo color que el pin), buscar por texto, clic en una necesidad → va a su detalle, clic en un recurso → popup con contacto ahí mismo (no navega) |
| `/publicar` | Cualquiera | Elegir entre "Quiero ayudar" o "Necesito ayuda". Si calificás (moderador o de una organización avalada), aparece el link a "Ofrecer recurso" |
| `/publicar/necesito-ayuda` | Logueado | Formulario para publicar una necesidad: título, categoría, descripción, ubicación en el mapa, contacto, foto opcional |
| `/publicar/quiero-ayudar` | Cualquiera | Tarjetas swipeables de necesidades activas |
| `/publicar/quiero-ayudar/:id` | Cualquiera (algunas acciones requieren login) | Detalle de una necesidad. Si sos el dueño: ver y aceptar/rechazar quién se ofreció a ayudar. Si no: ofrecerte a ayudar (Solicitud), o ver el contacto directo si ya te aceptaron o si el contacto es público por defecto |
| `/publicar/ofrecer-recurso` | Moderador, o miembro de organización avalada | Formulario para publicar un recurso: título, categoría, descripción, ubicación, horario, contacto, foto. Si no calificás, te explica por qué y te manda a registrar una organización |
| `/quienes-somos` | Cualquiera | Página informativa: qué es la plataforma, cómo funciona, accesos rápidos al mapa y a publicar |
| `/mis-solicitudes` | Logueado | Listado de las necesidades donde te ofreciste a ayudar, con el estado de cada una (pendiente/aceptada/rechazada) |
| `/organizacion/mi-organizacion` | Logueado, con organización vinculada | Ver y editar el perfil de tu organización (nombre, descripción, contacto, dirección — nunca el estado de avalada), ver los recursos que publicaron |
| `/organizacion/crear` | Logueado | Registrar una organización nueva — queda pendiente de aprobación |
| `/entrar`, `/registro` | Público | Login y registro |
| `/moderador/publicaciones` | Moderador | Ver y moderar TODAS las necesidades y recursos: marcar resuelto, eliminar, y activar/desactivar si una necesidad requiere Solicitud para mostrar el contacto |
| `/moderador/organizaciones` | Moderador | Aprobar o rechazar organizaciones pendientes — solo ve las de sus localidades asignadas |
| `/moderador/mis-localidades` | Moderador | Ver las localidades que administrás |

---

## Notas para el equipo

- El botón de "Confirmar ayuda" de las primeras versiones ya no existe — se reemplazó por el sistema real de Solicitudes.
- Por defecto, **cualquier persona logueada ve el contacto** de una necesidad publicada. Un moderador puede ocultarlo caso por caso desde `/moderador/publicaciones`, forzando el circuito de Solicitudes.
- Los recursos siguen la regla vieja: contacto visible solo para dueño, moderador, o si el recurso pertenece a una organización (en cuyo caso, si el recurso no tiene contacto propio, ahora cae al contacto de la organización).
- Pendiente, no resuelto todavía: paginación (funciona bien con los volúmenes de prueba actuales, no con miles de registros), y "rechazar" una organización hoy la borra — no queda un estado "rechazada" archivado.
