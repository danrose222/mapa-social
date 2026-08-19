// Espejo de backend/src/common/utils/locality-match.util.ts -- misma
// comparación bidireccional por substring, para que el filtro visual del
// moderador coincida exacto con lo que el servidor va a permitir o
// rechazar. Es una aproximación (puede dar falsos positivos con nombres
// cortos), documentado igual del lado del backend.
export function localitiesMatch(a: string, b: string): boolean {
  const normalizedA = a.trim().toLowerCase();
  const normalizedB = b.trim().toLowerCase();

  if (!normalizedA || !normalizedB) {
    return false;
  }

  return normalizedA.includes(normalizedB) || normalizedB.includes(normalizedA);
}
