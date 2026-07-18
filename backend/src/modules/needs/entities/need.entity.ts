import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';

import { BaseEntity } from '../../../common/entities/base.entity';

import { User } from '../../users/entities/user.entity';
import { Category } from '../../categories/entities/category.entity';

@Entity('needs')
export class Need extends BaseEntity {
  @Column({
    name: 'user_id',
  })
  userId!: number;

  @Column({
    name: 'category_id',
  })
  categoryId!: number;

  @Column({
    length: 255,
  })
  title!: string;

  @Column({
    type: 'text',
  })
  description!: string;

  @Column({
    type: 'decimal',
    precision: 10,
    scale: 8,
  })
  latitude!: number;

  @Column({
    type: 'decimal',
    precision: 11,
    scale: 8,
  })
  longitude!: number;

  @Column({
    length: 50,
    default: 'active',
  })
  status!: string;

  @ManyToOne(() => User, (user) => user.needs)
  @JoinColumn({
    name: 'user_id',
  })
  user!: User;

  @ManyToOne(() => Category, (category) => category.needs)
  @JoinColumn({
    name: 'category_id',
  })
  category!: Category;
}
