// Comparación insensible a acentos/diacríticos: muy común escribir
// "cordoba" o "guemes" sin tilde/diéresis al buscar, aunque el dato
// guardado (o lo que pide GeoRef) sí los tenga -- una comparación de
// string plana nunca matchea eso.
export function normalizeText(value: string): string {
  return value.trim().toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '');
}
