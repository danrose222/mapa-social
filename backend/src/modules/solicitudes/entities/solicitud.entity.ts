import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';

import { Need } from '../../needs/entities/need.entity';
import { User } from '../../users/entities/user.entity';

// El registro que faltaba desde el día 1: alguien ("helper") se ofrece a
// ayudar con una necesidad puntual. El dueño de la necesidad la acepta o
// la rechaza -- aceptarla es lo que habilita ver el contacto.
@Entity('solicitudes')
export class Solicitud {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ name: 'need_id' })
  needId!: number;

  @Column({ name: 'helper_user_id' })
  helperUserId!: number;

  @Column({ type: 'text', nullable: true })
  message?: string;

  @Column({ length: 20, default: 'pending' })
  status!: 'pending' | 'accepted' | 'rejected';

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @Column({ name: 'responded_at', type: 'timestamp', nullable: true })
  respondedAt?: Date;

  @ManyToOne(() => Need, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'need_id' })
  need!: Need;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'helper_user_id' })
  helper!: User;
}
