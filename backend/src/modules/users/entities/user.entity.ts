import { Column, Entity, JoinColumn, ManyToOne, OneToMany } from 'typeorm';

import { BaseEntity } from '../../../common/entities/base.entity';
import { Role } from '../../roles/entities/role.entity';
import { Need } from '../../needs/entities/need.entity';
import { Resource } from '../../resources/entities/resource.entity';

@Entity('users')
export class User extends BaseEntity {
  @Column({
    name: 'first_name',
    length: 100,
  })
  firstName!: string;

  @Column({
    name: 'last_name',
    length: 100,
  })
  lastName!: string;

  @Column({
    unique: true,
    length: 150,
  })
  email!: string;

  @Column({
    length: 255,
  })
  password!: string;

  @Column({
    nullable: true,
    length: 30,
  })
  phone?: string;

  @Column({
    default: true,
  })
  active!: boolean;

  @Column({
    name: 'role_id',
  })
  roleId!: number;

  @ManyToOne(() => Role, (role) => role.users)
  @JoinColumn({
    name: 'role_id',
  })
  role!: Role;

  @OneToMany(() => Need, (need: Need): User => need.user)
  needs!: Need[];

  @OneToMany(() => Resource, (resource) => resource.user)
  resources!: Resource[];
}
