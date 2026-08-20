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
import { localitiesMatch } from '../../common/utils/locality-match.util';

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
      // 'organization' se agrega para que AuthService.login() pueda emitir
      // organizationType sin una query aparte -- único caller de este
      // método (verificado), así que no afecta a nadie más.
      relations: ['role', 'organization'],
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

    // Nota: 'ciudad' ya no está restringido a moderador -- antes significaba
    // "territorio que administra este moderador", pero eso se mudó a la
    // tabla moderator_localities. Ahora es un dato de perfil normal (dónde
    // vivís), así que cualquiera puede editar el propio -- el chequeo de
    // isOwner-or-moderator de arriba ya cubre que no edites el de otro.

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

  // Un moderador solo puede otorgar/quitar jurisdicción sobre localidades
  // que él mismo ya tiene asignadas -- si no, cualquier moderador podría
  // darle a otro (o sacarle) jurisdicción sobre una ciudad ajena.
  private async assertCallerHasLocality(
    locality: string,
    currentUser: AuthUser,
  ) {
    const callerLocalities = await this.localityRepository.find({
      where: { userId: currentUser.id },
    });

    const inScope = callerLocalities.some((l) =>
      localitiesMatch(l.locality, locality),
    );

    if (!inScope) {
      throw new ForbiddenException(
        `No tenés asignada "${locality}" -- no podés otorgar ni quitar jurisdicción sobre una localidad que vos mismo no tenés.`,
      );
    }
  }

  async addLocality(
    userId: number,
    dto: AddModeratorLocalityDto,
    currentUser: AuthUser,
  ) {
    if (currentUser.role !== 'moderador') {
      throw new ForbiddenException(
        'Solo un moderador puede asignar localidades',
      );
    }

    if (userId === currentUser.id) {
      throw new ForbiddenException(
        'No podés asignarte una localidad a vos mismo -- tiene que hacerlo otro moderador',
      );
    }

    await this.findOne(userId);

    const normalizedLocality = dto.locality.trim();

    await this.assertCallerHasLocality(normalizedLocality, currentUser);

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
    if (currentUser.role !== 'moderador') {
      throw new ForbiddenException(
        'Solo un moderador puede quitar localidades',
      );
    }

    if (userId === currentUser.id) {
      throw new ForbiddenException(
        'No podés quitarte una localidad a vos mismo -- tiene que hacerlo otro moderador',
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

    await this.assertCallerHasLocality(locality.locality, currentUser);

    await this.localityRepository.remove(locality);

    return { message: 'Localidad quitada' };
  }
}
