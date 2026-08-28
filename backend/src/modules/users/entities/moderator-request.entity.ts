import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Exclude } from 'class-transformer';

import { User } from './user.entity';

// Pedido de una cuenta común para convertirse en moderador ("aval
// municipal") de una localidad. Se aprueba solo -- no hay revisión humana
// de por medio, sino que confirmar el link enviado a officialEmail es la
// única prueba real de que quien pide esto controla ese canal (el resto de
// los datos son autodeclarados, sin forma de verificarlos por software).
// No tiene columna de estado: confirmar el token borra la fila (y
// promueve la cuenta), igual que un pedido vencido nunca confirmado queda
// simplemente sin usar. La restricción UNIQUE en user_id (ver la
// migración) evita que una misma cuenta tenga más de un pedido a la vez.
@Entity('moderator_requests')
export class ModeratorRequest {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ name: 'user_id' })
  userId!: number;

  @Column({ length: 150 })
  locality!: string;

  @Column({ length: 100, nullable: true })
  provincia?: string;

  // Datos institucionales -- a propósito más específicos de lo que
  // cualquier vecino común cargaría, para que quien revisa el pedido tenga
  // con qué juzgar si es un representante municipal real. No hay
  // verificación automática (no hay forma de confirmar esto por software);
  // la reduce a una decisión humana informada, igual que el aval de
  // organizaciones.
  @Column({ name: 'institution_name', length: 150 })
  institutionName!: string;

  @Column({ length: 150 })
  position!: string;

  @Column({ name: 'official_email', length: 255 })
  officialEmail!: string;

  @Column({ name: 'official_phone', length: 30 })
  officialPhone!: string;

  @Column({ type: 'text', nullable: true })
  justification?: string;

  @Exclude()
  @Column({ name: 'verification_token', length: 255 })
  verificationToken!: string;

  @Exclude()
  @Column({ name: 'verification_expires_at' })
  verificationExpiresAt!: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user!: User;
}
