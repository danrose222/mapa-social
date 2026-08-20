import { FindOptionsSelect } from 'typeorm';

import { User } from './entities/user.entity';

// Subconjunto de User seguro para exponer en endpoints públicos vía la
// relación user/resolvedBy de una necesidad o recurso -- el contacto real
// pasa por contactName/contactInfo (needs-contact.util.ts,
// resource-contact.util.ts), no por el email/teléfono de la cuenta.
export const PUBLIC_USER_FIELDS: FindOptionsSelect<User> = {
  id: true,
  firstName: true,
  lastName: true,
};
