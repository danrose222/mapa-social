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

const DEFAULT_ROLE_NAME = 'seed-role';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,

    @InjectRepository(Role)
    private readonly roleRepository: Repository<Role>,
  ) {}

  async create(dto: CreateUserDto) {
    const defaultRole = await this.roleRepository.findOne({
      where: {
        name: DEFAULT_ROLE_NAME,
      },
    });

    if (!defaultRole) {
      throw new NotFoundException(
        `No existe el rol por defecto ('${DEFAULT_ROLE_NAME}'). Contactar a un administrador.`,
      );
    }

    const user = this.userRepository.create({
      ...dto,
      roleId: defaultRole.id,
    });

    return this.userRepository.save(user);
  }

  findAll() {
    return this.userRepository.find({
      relations: ['role', 'organization'],
      order: {
        id: 'ASC',
      },
    });
  }

  async findOne(id: number) {
    const user = await this.userRepository.findOne({
      where: { id },
      relations: ['role', 'organization'],
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

    if (dto.roleId !== undefined && !isModerator) {
      throw new ForbiddenException('No podés cambiar tu propio rol');
    }

    if (dto.organizationId !== undefined && !isModerator) {
      throw new ForbiddenException(
        'No podés vincularte vos mismo a una organización',
      );
    }

    if (dto.ciudad !== undefined && !isModerator) {
      throw new ForbiddenException(
        'No podés asignarte vos mismo una ciudad a administrar',
      );
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

    delete (user as { role?: unknown }).role;
    delete (user as { organization?: unknown }).organization;

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
