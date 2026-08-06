import { Column, Entity, OneToMany } from 'typeorm';

import { BaseEntity } from '../../../common/entities/base.entity';
import { User } from '../../users/entities/user.entity';
import { Need } from '../../needs/entities/need.entity';
import { Resource } from '../../resources/entities/resource.entity';

@Entity('organizations')
export class Organization extends BaseEntity {
  @Column({
    length: 150,
  })
  name!: string;

  @Column({
    type: 'text',
    nullable: true,
  })
  description?: string;

  @Column({
    name: 'contact_info',
    length: 255,
    nullable: true,
  })
  contactInfo?: string;

  @Column({
    length: 255,
    nullable: true,
  })
  address?: string;

  @Column({
    length: 20,
  })
  type!: string;

  @Column({
    length: 100,
  })
  ciudad!: string;

  @Column({
    default: false,
  })
  verified!: boolean;

  @OneToMany(() => User, (user) => user.organization)
  users!: User[];

  @OneToMany(() => Need, (need) => need.organization)
  needs!: Need[];

  @OneToMany(() => Resource, (resource) => resource.organization)
  resources!: Resource[];
}
