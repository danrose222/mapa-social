import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';

import { User } from './user.entity';

// Una fila = "este moderador puede administrar organizaciones de esta
// localidad". Un moderador puede tener varias filas (varias ciudades a
// cargo) -- por eso es tabla aparte y no una sola columna en users.
@Entity('moderator_localities')
export class ModeratorLocality {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ name: 'user_id' })
  userId!: number;

  @Column({
    length: 150,
  })
  locality!: string;

  @Column({
    length: 100,
    nullable: true,
  })
  provincia?: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @ManyToOne(() => User, (user) => user.localities, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user!: User;
}
