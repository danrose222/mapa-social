import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { Organization } from '../../organizations/entities/organization.entity';

// Mensaje de un visitante (con o sin cuenta) que quiere colaborar con la
// organización dueña de un recurso, sin exponer contacto personal de
// terceros. A propósito NO tiene columna resourceId/needId: el mensaje se
// asocia solo a la organización, nunca a la publicación puntual que lo
// originó (ver notas técnicas de la tarjeta "Modal Quiero Colaborar").
@Entity('collaboration_requests')
export class CollaborationRequest extends BaseEntity {
  @Column({
    name: 'organization_id',
  })
  organizationId!: number;

  @Column({
    name: 'contact_name',
    length: 150,
  })
  contactName!: string;

  @Column({
    name: 'contact_email',
    length: 255,
  })
  contactEmail!: string;

  @Column({
    type: 'text',
    nullable: true,
  })
  message?: string;

  @ManyToOne(() => Organization)
  @JoinColumn({
    name: 'organization_id',
  })
  organization?: Organization;
}
