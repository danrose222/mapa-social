// Fórmula de Haversine en SQL crudo (MySQL), compartida entre
// by-distance.strategy.ts (búsqueda de necesidades por radio) y
// resources.service.ts (matching necesidad→recursos cercanos) -- antes
// estaba duplicada como dos strings independientes, con un comentario en
// uno de los dos diciendo que se hizo así "para no tener dos versiones
// que puedan desincronizarse", que era exactamente lo que ya había
// pasado.
//
// El GREATEST(-1, LEAST(1, ...)) clampea el argumento de acos() al rango
// válido [-1, 1] antes de llamarlo. Sin el clamp, cuando el punto de
// origen y el de destino son (casi) idénticos, el redondeo de coma
// flotante puede empujar el argumento fraccionalmente por encima de 1 --
// acos() de MySQL devuelve NULL en ese caso, y esa fila (que en los
// hechos está a distancia 0, el match más cercano posible) desaparece
// silenciosamente de cualquier "< :radius".
export function haversineDistanceExpr(
  alias: string,
  latParam: string,
  lngParam: string,
): string {
  return `(6371 * acos(GREATEST(-1, LEAST(1,
      cos(radians(:${latParam})) * cos(radians(${alias}.latitude))
      * cos(radians(${alias}.longitude) - radians(:${lngParam}))
      + sin(radians(:${latParam})) * sin(radians(${alias}.latitude))
    ))))`;
}
