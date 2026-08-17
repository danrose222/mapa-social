import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { User } from '../../users/entities/user.entity';
import { Category } from '../../categories/entities/category.entity';
import { Organization } from '../../organizations/entities/organization.entity';
@Entity('needs')
export class Need extends BaseEntity {
  @Column({
    name: 'user_id',
  })
  userId!: number;
  @Column({
    name: 'category_id',
  })
  categoryId!: number;
  @Column({
    name: 'organization_id',
    nullable: true,
  })
  organizationId?: number;
  @Column({
    length: 255,
  })
  title!: string;
  @Column({
    type: 'text',
  })
  description!: string;
  @Column({
    type: 'decimal',
    precision: 10,
    scale: 8,
  })
  latitude!: number;
  @Column({
    type: 'decimal',
    precision: 11,
    scale: 8,
  })
  longitude!: number;
  @Column({
    length: 255,
    nullable: true,
  })
  address?: string;
  @Column({
    length: 150,
    nullable: true,
  })
  locality?: string;
  @Column({
    name: 'contact_name',
    length: 150,
    nullable: true,
  })
  contactName?: string;
  @Column({
    name: 'contact_info',
    length: 255,
    nullable: true,
  })
  contactInfo?: string;
  @Column({
    length: 50,
    default: 'active',
  })
  status!: string;
  @Column({
    name: 'image_url',
    length: 500,
    nullable: true,
  })
  imageUrl?: string;

  // Por defecto (false), cualquier persona logueada ve el contacto. Un
  // moderador puede prenderlo para forzar el circuito de Solicitudes en un
  // caso puntual (necesidad sensible, por ejemplo) -- el dueño nunca lo
  // decide, solo un moderador.
  @Column({
    name: 'requires_solicitud',
    default: false,
  })
  requiresSolicitud!: boolean;
  // Se completan solos cuando un moderador cambia el status -- nunca
  // vienen del body del cliente (ver needs.service.ts -> update()).
  // Tipo "number | null" (no solo "number | undefined"): TypeORM
  // necesita que le asignemos null explícito para que el UPDATE
  // realmente ponga la columna en NULL -- undefined hace que la
  // omita del UPDATE y quede con el valor viejo.
  @Column({
    name: 'resolved_by',
    nullable: true,
  })
  resolvedById?: number | null;
  @Column({
    name: 'resolved_at',
    type: 'datetime',
    nullable: true,
  })
  resolvedAt?: Date | null;
  @ManyToOne(() => User, (user) => user.needs)
  @JoinColumn({
    name: 'user_id',
  })
  user!: User;
  @ManyToOne(() => Category, (category) => category.needs)
  @JoinColumn({
    name: 'category_id',
  })
  category!: Category;
  @ManyToOne(() => Organization, (organization) => organization.needs)
  @JoinColumn({
    name: 'organization_id',
  })
  organization?: Organization;
  @ManyToOne(() => User)
  @JoinColumn({
    name: 'resolved_by',
  })
  resolvedBy?: User | null;
}
