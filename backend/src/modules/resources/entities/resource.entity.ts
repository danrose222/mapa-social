import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { User } from '../../users/entities/user.entity';
import { Category } from '../../categories/entities/category.entity';
import { Organization } from '../../organizations/entities/organization.entity';
@Entity('resources')
export class Resource extends BaseEntity {
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
    length: 255,
    nullable: true,
  })
  schedule?: string;
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
    default: 'available',
  })
  status!: string;
  @Column({
    name: 'image_url',
    length: 500,
    nullable: true,
  })
  imageUrl?: string;
  // Ver el comentario equivalente en need.entity.ts: "number | null"
  // (no solo undefined) porque TypeORM necesita null explícito para
  // limpiar la columna en el UPDATE.
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
  @ManyToOne(() => User, (user) => user.resources)
  @JoinColumn({
    name: 'user_id',
  })
  user!: User;
  @ManyToOne(() => Category, (category) => category.resources)
  @JoinColumn({
    name: 'category_id',
  })
  category!: Category;
  @ManyToOne(() => Organization, (organization) => organization.resources)
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
