import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { User } from '../../users/entities/user.entity';
import { Resource } from './resource.entity';
import { Organization } from '../../organizations/entities/organization.entity';

// Solicitud "express" de un usuario YA logueado hacia un recurso puntual:
// a diferencia de CollaborationRequest (anónimo, sin cuenta, solo
// organizationId), acá SÍ hay una cuenta real detrás -- por eso apunta a
// userId y resourceId, y el contacto/categoría/jurisdicción se heredan del
// perfil y del recurso en vez de volver a pedirse. organizationId queda
// denormalizado (igual que en CollaborationRequest) para no tener que
// hacer join contra resources en la bandeja de la organización.
@Entity('resource_requests')
export class ResourceRequest extends BaseEntity {
  @Column({
    name: 'user_id',
  })
  userId!: number;

  @Column({
    name: 'resource_id',
  })
  resourceId!: number;

  @Column({
    name: 'organization_id',
  })
  organizationId!: number;

  @Column({
    name: 'detail_text',
    type: 'text',
    nullable: true,
  })
  detailText?: string;

  @ManyToOne(() => User)
  @JoinColumn({
    name: 'user_id',
  })
  user?: User;

  @ManyToOne(() => Resource)
  @JoinColumn({
    name: 'resource_id',
  })
  resource?: Resource;

  @ManyToOne(() => Organization)
  @JoinColumn({
    name: 'organization_id',
  })
  organization?: Organization;
}
