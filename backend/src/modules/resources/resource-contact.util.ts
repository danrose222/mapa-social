import { Resource } from './entities/resource.entity';

interface AuthUser {
  id: number;
  role: string;
}

// Compartido entre ResourcesController y OrganizationsController (perfil
// público de organización, /organizations/:id/resources) -- antes estaba
// duplicada solo en ResourcesController, y el endpoint de organizaciones
// devolvía el contacto sin enmascarar.
export function hideResourceContactUnlessAuthorized(
  item: Resource,
  user: AuthUser | null,
): Resource {
  const isModerator = user?.role === 'moderador' || user?.role === 'admin';
  const isOwner = user?.id === item.userId;
  const belongsToOrganization = item.organizationId != null;

  if (isModerator || isOwner || belongsToOrganization) {
    // Si el recurso no tiene contacto propio pero sí pertenece a una
    // organización con contacto cargado, mostramos ese como respaldo --
    // si no, queda un recurso "publicado" sin ninguna forma de
    // contactarlo, que es peor que mostrar el de la organización.
    if (!item.contactInfo && item.organization?.contactInfo) {
      return {
        ...item,
        contactName: item.contactName ?? item.organization.name,
        contactInfo: item.organization.contactInfo,
      };
    }
    return item;
  }

  return { ...item, contactName: undefined, contactInfo: undefined };
}
