import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { InjectRepository } from '@nestjs/typeorm';

import { Repository } from 'typeorm';

import { User } from './entities/user.entity';
import { Role } from '../roles/entities/role.entity';

import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

interface AuthUser {
  id: number;
  role: string;
}

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,

    @InjectRepository(Role)
    private readonly roleRepository: Repository<Role>,
  ) {}

  async create(dto: CreateUserDto) {
    const role = await this.roleRepository.findOne({
      where: {
        id: dto.roleId,
      },
    });

    if (!role) {
      throw new NotFoundException('Rol inexistente');
    }

    const user = this.userRepository.create(dto);

    return this.userRepository.save(user);
  }

  findAll() {
    return this.userRepository.find({
      relations: ['role'],
      order: {
        id: 'ASC',
      },
    });
  }

  async findOne(id: number) {
    const user = await this.userRepository.findOne({
      where: { id },
      relations: ['role'],
    });

    if (!user) {
      throw new NotFoundException('Usuario inexistente');
    }

    return user;
  }

  async findByEmail(email: string) {
    return this.userRepository.findOne({
      where: { email },
      relations: ['role'],
    });
  }

  async update(id: number, dto: UpdateUserDto, currentUser: AuthUser) {
    const user = await this.findOne(id);

    const isOwner = currentUser.id === id;
    const isModerator = currentUser.role === 'moderador';

    if (!isOwner && !isModerator) {
      throw new ForbiddenException(
        'No podés modificar un usuario que no sos vos',
      );
    }

    // Solo un moderador puede cambiar el rol de alguien (incluido el propio).
    // Si no, cualquier usuario podría auto-ascenderse mandando roleId en el body.
    if (dto.roleId !== undefined && !isModerator) {
      throw new ForbiddenException('No podés cambiar tu propio rol');
    }

    if (dto.roleId) {
      const role = await this.roleRepository.findOne({
        where: {
          id: dto.roleId,
        },
      });

      if (!role) {
        throw new NotFoundException('Rol inexistente');
      }
    }

    Object.assign(user, dto);

    return this.userRepository.save(user);
  }

  async remove(id: number) {
    const user = await this.findOne(id);

    await this.userRepository.remove(user);

    return {
      message: 'Usuario eliminado',
    };
  }
}
