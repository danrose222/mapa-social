// El backend valida la jurisdicción de un moderador comparando
// organization.ciudad === moderator.ciudad por igualdad exacta de string
// (ver organizations.service.ts: "Solo podés administrar organizaciones de
// tu misma ciudad"). Un campo de texto libre permite variantes como
// "Cordoba" / "Córdoba" / "Córdoba Capital" que nunca matchean entre sí, y
// la organización queda sin ningún moderador que pueda avalarla — un bug
// silencioso, no solo una cuestión de prolijidad.
//
// Esta lista fija es un workaround del lado frontend: no hay ningún
// endpoint en el backend real (a diferencia del fork de Corazones Unidos,
// que expone GET /users/municipios-publico) que sirva un listado
// canónico de municipios, y el alcance de esta tarea es solo frontend.
// Mientras la ciudad de cada moderador se siga asignando a mano (PATCH
// /users/:id), sigue existiendo el riesgo de que no coincida con estos
// valores. El fix de fondo es mover esta lista al backend y compartirla
// entre alta de organización y asignación de moderadores.
export const MUNICIPIOS_CORDOBA: readonly string[] = [
  'Córdoba Capital',
  'Alta Gracia',
  'Arroyito',
  'Bell Ville',
  'Colonia Caroya',
  'Cosquín',
  'Cruz del Eje',
  'Deán Funes',
  'Jesús María',
  'La Falda',
  'Laboulaye',
  'Leones',
  'Marcos Juárez',
  'Morteros',
  'Oncativo',
  'Río Cuarto',
  'Río Tercero',
  'San Francisco',
  'Villa Carlos Paz',
  'Villa Dolores',
  'Villa María',
];
