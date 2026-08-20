import {
  AfterLoad,
  BeforeInsert,
  BeforeUpdate,
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
} from 'typeorm';
import { Exclude } from 'class-transformer';
import * as bcrypt from 'bcrypt';
import { BaseEntity } from '../../../common/entities/base.entity';
import { Role } from '../../roles/entities/role.entity';
import { Need } from '../../needs/entities/need.entity';
import { Resource } from '../../resources/entities/resource.entity';
import { Organization } from '../../organizations/entities/organization.entity';
import { ModeratorLocality } from './moderator-locality.entity';

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

  @Exclude()
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

  @Column({
    name: 'organization_id',
    nullable: true,
  })
  organizationId?: number;

  @Column({
    nullable: true,
    length: 100,
  })
  ciudad?: string;

  @ManyToOne(() => Role, (role) => role.users)
  @JoinColumn({
    name: 'role_id',
  })
  role!: Role;

  @ManyToOne(() => Organization, (organization) => organization.users)
  @JoinColumn({
    name: 'organization_id',
  })
  organization?: Organization;

  @OneToMany(() => Need, (need: Need): User => need.user)
  needs!: Need[];

  @OneToMany(() => Resource, (resource) => resource.user)
  resources!: Resource[];

  // Ciudades que este usuario (moderador) puede administrar. Reemplaza al
  // viejo campo único 'ciudad' para ese propósito -- ese campo se mantiene
  // solo como dato de perfil, no se usa más para autorizar nada.
  @OneToMany(() => ModeratorLocality, (locality) => locality.user)
  localities!: ModeratorLocality[];

  @Exclude()
  private previousPasswordHash?: string;

  @AfterLoad()
  private captureCurrentPasswordHash(): void {
    this.previousPasswordHash = this.password;
  }

  @BeforeInsert()
  private async hashPasswordOnInsert(): Promise<void> {
    this.password = await bcrypt.hash(this.password, 10);
  }

  @BeforeUpdate()
  private async hashPasswordOnUpdate(): Promise<void> {
    if (this.password !== this.previousPasswordHash) {
      this.password = await bcrypt.hash(this.password, 10);
    }
  }
}
