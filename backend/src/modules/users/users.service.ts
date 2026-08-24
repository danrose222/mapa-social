import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { InjectRepository } from '@nestjs/typeorm';

import { Repository } from 'typeorm';
import { randomUUID } from 'crypto';

import { User } from './entities/user.entity';
import { ModeratorLocality } from './entities/moderator-locality.entity';
import { ModeratorRequest } from './entities/moderator-request.entity';
import { Role } from '../roles/entities/role.entity';

import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { AddModeratorLocalityDto } from './dto/add-moderator-locality.dto';
import { CreateModeratorRequestDto } from './dto/create-moderator-request.dto';
import { localitiesMatch } from '../../common/utils/locality-match.util';
import { MailService } from '../mail/mail.service';

interface AuthUser {
  id: number;
  role: string;
}

const DEFAULT_ROLE_NAME = 'seed-role';
const VERIFICATION_TOKEN_TTL_HOURS = 48;

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,

    @InjectRepository(Role)
    private readonly roleRepository: Repository<Role>,

    @InjectRepository(ModeratorLocality)
    private readonly localityRepository: Repository<ModeratorLocality>,

    @InjectRepository(ModeratorRequest)
    private readonly moderatorRequestRepository: Repository<ModeratorRequest>,

    private readonly mailService: MailService,
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

    const emailVerificationToken = randomUUID();

    const user = this.userRepository.create({
      ...dto,
      roleId: defaultRole.id,
      // Cualquier cuenta nueva (común, ONG o comunidad -- no hay
      // distinción acá, el rol por defecto es el mismo para todas) arranca
      // sin verificar, pisando el DEFAULT true de la columna (pensado para
      // no romper las cuentas ya existentes, ver migración 022).
      emailVerified: false,
      emailVerificationToken,
      emailVerificationExpiresAt: new Date(
        Date.now() + VERIFICATION_TOKEN_TTL_HOURS * 60 * 60 * 1000,
      ),
    });

    const saved = await this.userRepository.save(user);

    await this.mailService.sendVerificationEmail(
      saved.email,
      saved.firstName,
      emailVerificationToken,
    );

    return saved;
  }

  async verifyEmail(token: string) {
    const user = await this.userRepository.findOne({
      where: { emailVerificationToken: token },
    });

    if (!user) {
      throw new NotFoundException('El enlace de verificación no es válido.');
    }

    if (
      !user.emailVerificationExpiresAt ||
      user.emailVerificationExpiresAt.getTime() < Date.now()
    ) {
      throw new ForbiddenException(
        'El enlace de verificación venció. Pedí que te reenvíen uno nuevo.',
      );
    }

    user.emailVerified = true;
    user.emailVerificationToken = null;
    user.emailVerificationExpiresAt = null;

    await this.userRepository.save(user);

    return { message: 'Cuenta verificada.' };
  }

  async resendVerification(userId: number) {
    const user = await this.findOne(userId);

    if (user.emailVerified) {
      return { message: 'Tu cuenta ya está verificada.' };
    }

    const emailVerificationToken = randomUUID();

    await this.userRepository.update(userId, {
      emailVerificationToken,
      emailVerificationExpiresAt: new Date(
        Date.now() + VERIFICATION_TOKEN_TTL_HOURS * 60 * 60 * 1000,
      ),
    });

    await this.mailService.sendVerificationEmail(
      user.email,
      user.firstName,
      emailVerificationToken,
    );

    return { message: 'Te reenviamos el correo de verificación.' };
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

  // Cualquier cuenta común puede pedir convertirse en moderador de una
  // localidad -- sigue funcionando como ciudadano normal mientras se
  // revisa, no queda bloqueada. La aprobación humana (ver
  // approveModeratorRequest) es la única verificación real: no hay forma
  // de confirmar por software que quien completa esto es de verdad un
  // representante municipal.
  async requestModerator(dto: CreateModeratorRequestDto, currentUser: AuthUser) {
    if (currentUser.role === 'moderador') {
      throw new ForbiddenException('Ya sos moderador');
    }

    const existing = await this.moderatorRequestRepository.findOne({
      where: { userId: currentUser.id },
    });

    if (existing) {
      throw new ConflictException('Ya tenés una solicitud pendiente');
    }

    const request = this.moderatorRequestRepository.create({
      userId: currentUser.id,
      locality: dto.locality.trim(),
      provincia: dto.provincia?.trim(),
      institutionName: dto.institutionName.trim(),
      position: dto.position.trim(),
      officialEmail: dto.officialEmail.trim(),
      officialPhone: dto.officialPhone.trim(),
      justification: dto.justification?.trim(),
    });

    return this.moderatorRequestRepository.save(request);
  }

  // Sin scoping por localidad acá -- mismo criterio que organizations
  // .service.ts::findAll(), el filtro por jurisdicción lo aplica el
  // frontend con localitiesMatch() para decidir qué mostrar, y
  // approve/reject lo vuelven a validar server-side antes de actuar.
  findModeratorRequests() {
    return this.moderatorRequestRepository.find({
      relations: ['user'],
      order: { createdAt: 'ASC' },
    });
  }

  private async findModeratorRequestOrFail(id: number): Promise<ModeratorRequest> {
    const request = await this.moderatorRequestRepository.findOne({
      where: { id },
    });

    if (!request) {
      throw new NotFoundException('Solicitud inexistente');
    }

    return request;
  }

  async approveModeratorRequest(id: number, currentUser: AuthUser) {
    if (currentUser.role !== 'moderador') {
      throw new ForbiddenException('Solo un moderador puede aprobar esta solicitud');
    }

    const request = await this.findModeratorRequestOrFail(id);

    await this.assertCallerHasLocality(request.locality, currentUser);

    const moderatorRole = await this.roleRepository.findOne({
      where: { name: 'moderador' },
    });

    if (!moderatorRole) {
      throw new NotFoundException('Rol moderador inexistente');
    }

    await this.userRepository.update(request.userId, { roleId: moderatorRole.id });

    const existingLocality = await this.localityRepository.findOne({
      where: { userId: request.userId, locality: request.locality },
    });

    if (!existingLocality) {
      await this.localityRepository.save(
        this.localityRepository.create({
          userId: request.userId,
          locality: request.locality,
          provincia: request.provincia,
        }),
      );
    }

    await this.moderatorRequestRepository.remove(request);

    return { message: 'Solicitud aprobada' };
  }

  async rejectModeratorRequest(id: number, currentUser: AuthUser) {
    if (currentUser.role !== 'moderador') {
      throw new ForbiddenException('Solo un moderador puede rechazar esta solicitud');
    }

    const request = await this.findModeratorRequestOrFail(id);

    await this.assertCallerHasLocality(request.locality, currentUser);

    await this.moderatorRequestRepository.remove(request);

    return { message: 'Solicitud rechazada' };
  }
}
