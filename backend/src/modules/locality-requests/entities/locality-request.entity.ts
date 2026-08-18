import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';

import { User } from '../../users/entities/user.entity';

// El paso que faltaba entre "un moderador no puede asignarse una localidad
// a sí mismo" y "entonces quién se la da la primera vez": pide una acá, un
// admin la aprueba o la rechaza. No reemplaza la asignación directa
// (addLocality) -- esa sigue existiendo para cuando un admin quiere
// bootstrapear a alguien sin esperar el pedido.
@Entity('locality_requests')
export class LocalityRequest {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ name: 'user_id' })
  userId!: number;

  @Column({ length: 150 })
  locality!: string;

  @Column({ length: 100, nullable: true })
  provincia?: string;

  @Column({ length: 20, default: 'pending' })
  status!: 'pending' | 'approved' | 'rejected';

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @Column({ name: 'responded_at', type: 'timestamp', nullable: true })
  respondedAt?: Date;

  @Column({ name: 'responded_by_id', nullable: true })
  respondedById?: number;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user!: User;

  @ManyToOne(() => User, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'responded_by_id' })
  respondedBy?: User;
}
