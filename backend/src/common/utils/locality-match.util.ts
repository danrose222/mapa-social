// 'ciudad' (organizaciones, localidades de moderador) y 'locality' (needs)
// vienen las dos de la misma API de Georef, pero Georef no distingue
// "ciudad" de "barrio" -- son todas "localidades" en su modelo. Eso
// significa que un moderador con "Córdoba" asignada y una necesidad con
// locality "Nueva Córdoba" (un barrio DENTRO de Córdoba) son, en los
// hechos, la misma jurisdicción -- pero como strings, son distintos.
//
// Esta función matchea en las dos direcciones ("¿A contiene a B, o B
// contiene a A?") para cubrir ese caso. Es una aproximación, no una
// jerarquía geográfica real -- funciona bien para Argentina/Córdoba, pero
// puede dar falsos positivos con nombres cortos que sean substring de
// otros no relacionados. Documentado así a propósito, para que quien lo
// lea después sepa la limitación.
//
// Tampoco considera 'provincia' (se guarda en ModeratorLocality y
// LocalityRequest, pero es solo informativa -- nunca se compara acá).
// Mientras el proyecto quede acotado a Córdoba esto no es un problema,
// pero apenas haya moderadores/organizaciones en otras provincias, dos
// localidades homónimas de provincias distintas (hay varias en
// Argentina: San Martín, Concepción, Libertador...) van a matchear entre
// sí como si fueran la misma jurisdicción. No bloqueante para el alcance
// actual, pero hay que resolverlo antes de escalar más allá de una sola
// provincia.
export function localitiesMatch(a: string, b: string): boolean {
  const normalizedA = a.trim().toLowerCase();
  const normalizedB = b.trim().toLowerCase();

  if (!normalizedA || !normalizedB) {
    return false;
  }

  return normalizedA.includes(normalizedB) || normalizedB.includes(normalizedA);
}
