// El "Contactar" de una organización necesita un href real (mailto:/tel:),
// pero need.contactInfo es texto libre tipeado por un vecino ("Tel:
// 351-1234567", "mi.correo@gmail.com", "wsp 351 1234567") -- no hay forma
// de saber con certeza qué es, así que se resuelve con la heurística más
// simple posible: si tiene '@' es un email, si no se toman los dígitos
// como teléfono. Cuando ninguna de las dos aplica (texto sin @ ni
// dígitos), no hay link posible -- el llamador debe mostrar el texto tal
// cual, sin action.
export function contactLinkFor(raw: string | null | undefined): string | null {
  if (!raw) {
    return null;
  }

  const trimmed = raw.trim();
  if (!trimmed) {
    return null;
  }

  if (trimmed.includes('@')) {
    // Puede venir con texto alrededor ("Escribime a x@y.com") -- se toma
    // solo el primer token que parece un email.
    const match = trimmed.match(/[^\s]+@[^\s]+\.[^\s]+/);
    return match ? `mailto:${match[0]}` : null;
  }

  const digits = trimmed.replace(/[^\d+]/g, '');
  return digits.length >= 6 ? `tel:${digits}` : null;
}
