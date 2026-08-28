// GeoRef y el click del mapa manejan coordenadas con precisión de punto
// flotante completa, pero el backend valida latitude/longitude con
// @IsNumber({ maxDecimalPlaces: 8 }) y rechaza cualquier valor con más
// decimales -- redondear acá, en un solo lugar, evita que cada
// consumidor tenga que recordar el límite por su cuenta.
export function roundCoordinate(value: number): number {
  return Math.round(value * 1e6) / 1e6;
}
