import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { InjectRepository } from '@nestjs/typeorm';

import { Repository } from 'typeorm';

import { User } from './entities/user.entity';
import { ModeratorLocality } from './entities/moderator-locality.entity';
import { Role } from '../roles/entities/role.entity';

import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { AddModeratorLocalityDto } from './dto/add-moderator-locality.dto';

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

    @InjectRepository(ModeratorLocality)
    private readonly localityRepository: Repository<ModeratorLocality>,
  ) {}

  async create(dto: CreateUserDto) {
    // Sin este chequeo, un email repetido llega directo a la constraint
    // 'unique' de la columna y MySQL/TypeORM lo devuelve como un error sin
    // capturar (500 genérico) en vez de un 409 -- el frontend de registro
    // ya asume que existe este chequeo y espera un 409 puntualmente.
    const existingUser = await this.userRepository.findOne({
      where: {
        email: dto.email,
      },
    });

    if (existingUser) {
      throw new ConflictException(
        'Ya existe un usuario registrado con ese email.',
      );
    }

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
      relations: ['role', 'organization', 'localities'],
      order: {
        id: 'ASC',
      },
    });
  }

  async findOne(id: number) {
    const user = await this.userRepository.findOne({
      where: { id },
      relations: ['role', 'organization', 'localities'],
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
    const isAdmin = currentUser.role === 'admin';
    // 'admin' incluye todo lo que puede hacer un moderador, más el cambio
    // de roles -- por eso esta variable se llama "hasModeratorAccess" y no
    // "isModerator": evita repetir "role === 'moderador' || role === 'admin'"
    // en cada chequeo de abajo.
    const hasModeratorAccess = currentUser.role === 'moderador' || isAdmin;

    if (!isOwner && !hasModeratorAccess) {
      throw new ForbiddenException(
        'No podés modificar un usuario que no sos vos',
      );
    }

    if (dto.roleId !== undefined) {
      if (!isAdmin) {
        throw new ForbiddenException(
          'Solo un admin puede cambiar el rol de un usuario -- ni siquiera un moderador puede hacerlo, para que no puedan promoverse o degradarse entre sí',
        );
      }

      await this.assertNotDemotingLastAdmin(user, dto.roleId);
    }

    if (dto.organizationId !== undefined && !hasModeratorAccess) {
      throw new ForbiddenException(
        'No podés vincularte vos mismo a una organización',
      );
    }

    if (dto.ciudad !== undefined && !hasModeratorAccess) {
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

  // Evita dos formas de quedarse sin nadie que pueda gestionar roles:
  // que el último admin se degrade a sí mismo, o que otro admin lo degrade.
  private async assertNotDemotingLastAdmin(
    user: User,
    newRoleId: number,
  ): Promise<void> {
    const wasAdmin = user.role?.name === 'admin';
    const staysAdmin = wasAdmin && user.roleId === newRoleId;

    if (!wasAdmin || staysAdmin) {
      return;
    }

    const adminRole = await this.roleRepository.findOne({
      where: { name: 'admin' },
    });

    if (!adminRole) {
      return;
    }

    const adminCount = await this.userRepository.count({
      where: { roleId: adminRole.id },
    });

    if (adminCount <= 1) {
      throw new ForbiddenException(
        'No podés quitarle el rol de admin al último admin que queda -- el sistema se quedaría sin nadie que pueda gestionar roles.',
      );
    }
  }

  async remove(id: number, currentUser: AuthUser) {
    const user = await this.findOne(id);

    const isAdmin = currentUser.role === 'admin';
    const targetHasPrivilegedRole =
      user.role?.name === 'moderador' || user.role?.name === 'admin';

    // Un moderador puede borrar vecinos comunes, pero no a otro moderador
    // ni a un admin -- eso queda reservado a un admin, por la misma razón
    // que el cambio de rol.
    if (targetHasPrivilegedRole && !isAdmin) {
      throw new ForbiddenException(
        'Solo un admin puede eliminar la cuenta de un moderador o de otro admin',
      );
    }

    if (user.role?.name === 'admin') {
      const adminRole = await this.roleRepository.findOne({
        where: { name: 'admin' },
      });

      const adminCount = adminRole
        ? await this.userRepository.count({ where: { roleId: adminRole.id } })
        : 0;

      if (adminCount <= 1) {
        throw new ForbiddenException(
          'No podés eliminar al último admin que queda.',
        );
      }
    }

    await this.userRepository.remove(user);

    return {
      message: 'Usuario eliminado',
    };
  }

  async addLocality(
    userId: number,
    dto: AddModeratorLocalityDto,
    currentUser: AuthUser,
  ) {
    if (currentUser.role !== 'moderador' && currentUser.role !== 'admin') {
      throw new ForbiddenException(
        'Solo un moderador o un admin puede asignar localidades',
      );
    }

    await this.findOne(userId);

    const normalizedLocality = dto.locality.trim();

    const existing = await this.localityRepository.findOne({
      where: { userId, locality: normalizedLocality },
    });

    if (existing) {
      // Ya la tiene asignada -- no es un error, devolvemos la fila
      // existente en vez de duplicarla o romper con un 409.
      return existing;
    }

    const locality = this.localityRepository.create({
      userId,
      locality: normalizedLocality,
      provincia: dto.provincia?.trim(),
    });

    return this.localityRepository.save(locality);
  }

  async removeLocality(
    userId: number,
    localityId: number,
    currentUser: AuthUser,
  ) {
    if (currentUser.role !== 'moderador' && currentUser.role !== 'admin') {
      throw new ForbiddenException(
        'Solo un moderador o un admin puede quitar localidades',
      );
    }

    const locality = await this.localityRepository.findOne({
      where: { id: localityId, userId },
    });

    if (!locality) {
      throw new NotFoundException(
        'Esa localidad no está asignada a este usuario',
      );
    }

    await this.localityRepository.remove(locality);

    return { message: 'Localidad quitada' };
  }
}
