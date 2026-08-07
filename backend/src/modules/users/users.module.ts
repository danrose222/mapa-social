import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import { Role } from '../roles/entities/role.entity';
import { Category } from '../categories/entities/category.entity';
import { Need } from '../needs/entities/need.entity';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
@Module({
  imports: [TypeOrmModule.forFeature([User, Role, Category, Need])],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
