// Espejo de backend/src/common/utils/locality-match.util.ts -- misma
// comparación bidireccional por substring, para que el filtro visual del
// moderador coincida exacto con lo que el servidor va a permitir o
// rechazar. Es una aproximación (puede dar falsos positivos con nombres
// cortos), documentado igual del lado del backend.
function stripDiacritics(value: string): string {
  return value.normalize('NFD').replace(/\p{M}/gu, '');
}

export function localitiesMatch(a: string, b: string): boolean {
  const normalizedA = stripDiacritics(a.trim().toLowerCase());
  const normalizedB = stripDiacritics(b.trim().toLowerCase());

  if (!normalizedA || !normalizedB) {
    return false;
  }

  return normalizedA.includes(normalizedB) || normalizedB.includes(normalizedA);
}

// Organizaciones (o cualquier otra cosa con 'ciudad') que caen bajo
// alguna de las localidades de un moderador -- mismo filtro que
// organizaciones-moderador.component.ts usaba solo, reutilizado acá para
// que app-shell.component.ts (el contador de pendientes del nav) no
// reimplemente la misma comparación por su cuenta.
export function inModeratorScope<T extends { ciudad: string }>(
  items: T[],
  moderatorLocalities: string[],
): T[] {
  return items.filter((item) =>
    moderatorLocalities.some((mine) => localitiesMatch(mine, item.ciudad)),
  );
}
