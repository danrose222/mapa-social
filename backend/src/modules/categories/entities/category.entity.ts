import { Column, Entity, OneToMany } from 'typeorm';

import { BaseEntity } from '../../../common/entities/base.entity';
import { Need } from '../../needs/entities/need.entity';
import { Resource } from '../../resources/entities/resource.entity';

@Entity('categories')
export class Category extends BaseEntity {
  @Column({
    unique: true,
    length: 100,
  })
  name!: string;

  @Column({
    type: 'text',
    nullable: true,
  })
  description?: string;

  @Column({
    default: true,
  })
  active!: boolean;

  @OneToMany(() => Need, (need) => need.category)
  needs!: Need[];

  @OneToMany(() => Resource, (resource) => resource.category)
  resources!: Resource[];
}
