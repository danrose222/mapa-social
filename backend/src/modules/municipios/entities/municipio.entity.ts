import { Column, Entity } from 'typeorm';

import { BaseEntity } from '../../../common/entities/base.entity';

// Sin relación TypeORM formal hacia Organization: la jurisdicción se
// resuelve comparando `ciudad` con localitiesMatch(), igual que ya hace
// assertModeratorJurisdiction() para moderadores -- reutiliza el mismo
// mecanismo en vez de sumar una FK y una migración de datos existentes.
@Entity('municipios')
export class Municipio extends BaseEntity {
  @Column({
    length: 150,
  })
  nombre!: string;

  // El territorio que gobierna. Un municipio real administra una única
  // ciudad/partido -- por eso es una columna simple y no una tabla de
  // localidades como ModeratorLocality (ahí un moderador sí puede tener
  // varias ciudades a cargo).
  @Column({
    unique: true,
    length: 100,
  })
  ciudad!: string;

  @Column({
    name: 'contact_info',
    length: 255,
    nullable: true,
  })
  contactInfo?: string;
}
