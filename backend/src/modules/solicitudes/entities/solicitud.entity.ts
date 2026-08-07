import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';

import { BaseEntity } from '../../../common/entities/base.entity';

import { User } from '../../users/entities/user.entity';
import { Resource } from '../../resources/entities/resource.entity';
import { Category } from '../../categories/entities/category.entity';

@Entity('solicitudes')
export class Solicitud extends BaseEntity {
  @Column({
    name: 'user_id',
  })
  userId!: number;

  // Ausente en una solicitud directa (comunidad -> municipio/ONG): esas no
  // piden un recurso puntual ya publicado, sino un tipo de ayuda (category).
  @Column({
    name: 'resource_id',
    nullable: true,
  })
  resourceId?: number;

  // A quien se le pide ayuda directamente (un moderador o una ong), cuando
  // la solicitud no es sobre un recurso ya publicado.
  @Column({
    name: 'target_user_id',
    nullable: true,
  })
  targetUserId?: number;

  // Tipo de ayuda pedida en una solicitud directa.
  @Column({
    name: 'category_id',
    nullable: true,
  })
  categoryId?: number;

  @Column({
    name: 'contact_name',
    length: 150,
    nullable: true,
  })
  contactName?: string;

  @Column({
    name: 'contact_info',
    length: 150,
    nullable: true,
  })
  contactInfo?: string;

  // Alternativa a contactInfo cuando quien pide ayuda no tiene un telefono o
  // email propio y seguro (por ejemplo, pidio ayuda desde el celular de
  // otra persona): permite coordinar una visita en persona.
  @Column({
    length: 255,
    nullable: true,
  })
  address?: string;

  @Column({
    length: 50,
    default: 'pendiente',
  })
  status!: string;

  @ManyToOne(() => User)
  @JoinColumn({
    name: 'user_id',
  })
  user!: User;

  @ManyToOne(() => Resource)
  @JoinColumn({
    name: 'resource_id',
  })
  resource?: Resource;

  @ManyToOne(() => User)
  @JoinColumn({
    name: 'target_user_id',
  })
  target?: User;

  @ManyToOne(() => Category)
  @JoinColumn({
    name: 'category_id',
  })
  category?: Category;
}
