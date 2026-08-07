import {
  AfterLoad,
  BeforeInsert,
  BeforeUpdate,
  Column,
  Entity,
  JoinColumn,
  JoinTable,
  ManyToMany,
  ManyToOne,
  OneToMany,
} from 'typeorm';
import { Exclude } from 'class-transformer';
import * as bcrypt from 'bcrypt';
import { BaseEntity } from '../../../common/entities/base.entity';
import { Role } from '../../roles/entities/role.entity';
import { Need } from '../../needs/entities/need.entity';
import { Resource } from '../../resources/entities/resource.entity';
import { Category } from '../../categories/entities/category.entity';

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
    nullable: true,
    length: 255,
  })
  address?: string;

  // Jurisdiccion: para un moderador define el municipio que administra;
  // para una comunidad/ong define a que municipio pertenece (asi el
  // moderador de esa ciudad puede aprobarla, verla en su panel y ofrecerle
  // sus propios recursos, sin mezclarse con las demas jurisdicciones).
  @Column({
    nullable: true,
    length: 100,
  })
  ciudad?: string;

  @Column({
    nullable: true,
    length: 20,
  })
  gender?: string;

  // Los campos de abajo solo tienen sentido para los roles 'comunidad' y
  // 'ong': es el perfil institucional que completan al registrarse, para
  // no tener que repetir nombre/ubicacion/horario en cada recurso publicado.
  @Column({
    name: 'organization_name',
    nullable: true,
    length: 150,
  })
  organizationName?: string;

  @Column({
    nullable: true,
    length: 255,
  })
  schedule?: string;

  @Column({
    type: 'decimal',
    precision: 10,
    scale: 8,
    nullable: true,
  })
  latitude?: number;

  @Column({
    type: 'decimal',
    precision: 11,
    scale: 8,
    nullable: true,
  })
  longitude?: number;

  @ManyToMany(() => Category)
  @JoinTable({
    name: 'user_offered_categories',
    joinColumn: { name: 'user_id', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'category_id', referencedColumnName: 'id' },
  })
  offeredCategories!: Category[];

  @Column({
    default: true,
  })
  active!: boolean;

  @Column({
    default: true,
  })
  approved!: boolean;

  // Solo tiene sentido para el rol 'comunidad': le permite avisarle al
  // municipio (moderador) que necesita ayuda urgente (estado 'critico').
  @Column({
    name: 'estado_ayuda',
    type: 'varchar',
    length: 20,
    default: 'estable',
  })
  estadoAyuda!: 'estable' | 'critico';

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

  // Guarda el hash que ya estaba en la base antes de un update,
  // para saber si el password realmente cambió (y no volver a hashear un hash).
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
