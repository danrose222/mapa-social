import { Need } from './entities/need.entity';

interface AuthUser {
  id: number;
  role: string;
}

// Compartido entre NeedsController (listados propios de /needs) y
// OrganizationsController (perfil público de organización, /organizations/:id/needs)
// -- antes estaba duplicada solo en NeedsController, y el endpoint de
// organizaciones devolvía el contacto sin enmascarar, bypaseando por
// completo el flag requiresSolicitud.
export function hideNeedContactUnlessAuthorized(
  item: Need,
  user: AuthUser | null,
  acceptedNeedIds: Set<number>,
): Need {
  const isModerator = user?.role === 'moderador';
  const isOwner = user?.id === item.userId;

  if (isModerator || isOwner) {
    return item;
  }

  if (item.requiresSolicitud) {
    // Caso especial marcado por un moderador: se vuelve al circuito
    // viejo, contacto oculto hasta que el dueño acepte una Solicitud.
    const isAcceptedHelper = user != null && acceptedNeedIds.has(item.id);
    return isAcceptedHelper
      ? item
      : { ...item, contactName: undefined, contactInfo: undefined };
  }

  // Caso por defecto: cualquier persona LOGUEADA ve el contacto. Alguien
  // anónimo (sin sesión) sigue sin verlo.
  if (user) {
    return item;
  }

  return { ...item, contactName: undefined, contactInfo: undefined };
}
