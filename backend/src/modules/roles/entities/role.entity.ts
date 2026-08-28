import { Column, Entity, OneToMany } from 'typeorm';

import { BaseEntity } from '../../../common/entities/base.entity';
import { User } from '../../users/entities/user.entity';

@Entity('roles')
export class Role extends BaseEntity {
  @Column({
    unique: true,
    length: 100,
  })
  name!: string;

  @Column({
    nullable: true,
    type: 'text',
  })
  description?: string;

  @OneToMany(() => User, (user) => user.role)
  users!: User[];
}
