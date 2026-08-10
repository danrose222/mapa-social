import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { InjectRepository } from '@nestjs/typeorm';

import { In, Repository } from 'typeorm';

import { User } from './entities/user.entity';
import { Role } from '../roles/entities/role.entity';
import { Category } from '../categories/entities/category.entity';
import { Need } from '../needs/entities/need.entity';

import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

interface AuthUser {
  id: number;
  role: string;
  ciudad?: string;
}

// Comunidad (comedor/club) y ong (fundacion) son los roles que ofrecen o
// solicitan recursos a nombre de una organizacion: un moderador (municipio)
// tiene que aprobarlos antes de que puedan publicar. Ciudadano y moderador
// quedan aprobados automaticamente.
const ROLES_QUE_REQUIEREN_APROBACION = ['comunidad', 'ong'];

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,

    @InjectRepository(Role)
    private readonly roleRepository: Repository<Role>,

    @InjectRepository(Category)
    private readonly categoryRepository: Repository<Category>,

    @InjectRepository(Need)
    private readonly needRepository: Repository<Need>,
  ) {}

  // Capa pública para donantes: comunidades en estado crítico, visible sin
  // login. A propósito NO devuelve la ubicación exacta ni la dirección —
  // redondea lat/lng a ~1km de precisión (zona aproximada, no la puerta de
  // la casa de una familia vulnerable) — ni expone approved=false (una
  // comunidad todavía no avalada no debería recibir donaciones directas).
  // "Qué necesita" no es un campo propio: se deriva de las categorías de
  // sus propias Necesidades activas, así no hace falta una columna nueva.
  async findComunidadesCriticasPublico() {
    const comunidades = await this.userRepository.find({
      where: { role: { name: 'comunidad' }, estadoAyuda: 'critico', approved: true },
      relations: ['role'],
    });

    const conNecesidades = await Promise.all(
      comunidades.map(async (u) => ({
        usuario: u,
        necesidades: await this.needRepository.find({
          where: { userId: u.id, status: 'active' },
          relations: ['category'],
        }),
      })),
    );

    return conNecesidades
      .map(({ usuario: u, necesidades }) => {
        // La comunidad no siempre tiene su propia latitud/longitud cargada
        // (se completa recién si edita su perfil): mientras tanto, se usa
        // la ubicación de su necesidad activa más reciente como respaldo,
        // para no perder de la capa a comunidades que sí están publicando.
        const latitude = u.latitude ?? necesidades[0]?.latitude ?? null;
        const longitude = u.longitude ?? necesidades[0]?.longitude ?? null;

        const necesita = [
          ...new Set(
            necesidades
              .map((n) => n.category?.name)
              .filter((nombre): nombre is string => !!nombre),
          ),
        ];

        return {
          id: u.id,
          nombre: u.organizationName ?? `${u.firstName} ${u.lastName}`,
          ciudad: u.ciudad,
          // Redondeo a 2 decimales (~1.1km): zona aproximada, no la
          // ubicación exacta del dispositivo.
          lat: latitude != null ? Math.round(Number(latitude) * 100) / 100 : null,
          lng: longitude != null ? Math.round(Number(longitude) * 100) / 100 : null,
          horario: u.schedule,
          necesita,
        };
      })
      .filter((c) => c.lat != null && c.lng != null);
  }

  async create(dto: CreateUserDto, autoAprobar = false) {
    const { offeredCategoryIds, ...rest } = dto;

    const role = await this.roleRepository.findOne({
      where: {
        id: dto.roleId,
      },
    });

    if (!role) {
      throw new NotFoundException('Rol inexistente');
    }

    // El perfil institucional (nombre de organizacion, ubicacion, horario,
    // categorias que ofrece) solo tiene sentido para comunidad/ong.
    const offeredCategories = offeredCategoryIds?.length
      ? await this.categoryRepository.find({
          where: { id: In(offeredCategoryIds) },
        })
      : [];

    // Una comunidad u ong nace sin aprobar: no puede publicar recursos hasta
    // que un moderador la valide. Los demás roles no pasan por este control.
    // Excepcion: si un moderador la registra el mismo (tramite presencial en
    // la municipalidad), ya quedo validada en persona y nace aprobada.
    const user = this.userRepository.create({
      ...rest,
      offeredCategories,
      approved:
        autoAprobar || !ROLES_QUE_REQUIEREN_APROBACION.includes(role.name),
    });

    return this.userRepository.save(user);
  }

  // Un moderador solo administra las comunidades/ongs de su propia
  // jurisdiccion (su ciudad). Si por algun motivo no tiene ciudad cargada,
  // no filtramos (TypeORM ignora una condicion undefined) para no dejarlo
  // sin ver nada.
  findAll(moderadorCiudad?: string) {
    return this.userRepository.find({
      where: moderadorCiudad
        ? { ciudad: moderadorCiudad, role: { name: In(ROLES_QUE_REQUIEREN_APROBACION) } }
        : {},
      relations: ['role', 'offeredCategories'],
      order: {
        id: 'ASC',
      },
    });
  }

  // A quien le puede pedir ayuda directamente cada rol:
  // - comunidad: al moderador (municipio) de su propia jurisdiccion, y a
  //   cualquier ong ya aprobada.
  // - ong: solo a otra ong ya aprobada (nunca al municipio, que unicamente
  //   la aprueba pero no le da asistencia directa).
  // Devuelve solo los campos necesarios para elegir destinatario, sin datos
  // sensibles de la cuenta.
  async findDirectorioAyuda(solicitante: {
    id: number;
    role: string;
    ciudad?: string;
  }) {
    const where =
      solicitante.role === 'ong'
        ? [{ approved: true, role: { name: 'ong' as const } }]
        : [
            {
              approved: true,
              role: { name: 'moderador' as const },
              ciudad: solicitante.ciudad,
            },
            {
              approved: true,
              role: { name: 'ong' as const },
            },
          ];

    const destinatarios = await this.userRepository.find({
      where,
      relations: ['role'],
      order: { organizationName: 'ASC' },
    });

    return destinatarios
      .filter((usuario) => usuario.id !== solicitante.id)
      .map((usuario) => ({
        id: usuario.id,
        organizationName:
          usuario.organizationName ??
          `${usuario.firstName} ${usuario.lastName}`,
        ciudad: usuario.ciudad,
        role: usuario.role.name,
        // Se usa tambien para ubicar al Municipio/ONGs en el mapa de una
        // comunidad logueada (ver mapa.component.ts): son cuentas de
        // organizacion, no personas, asi que exponer su ubicacion exacta
        // es el mismo criterio ya usado en findAll() para el moderador.
        latitude: usuario.latitude,
        longitude: usuario.longitude,
      }));
  }

  // A quien se le puede derivar:
  // - comunidad/ong: a cualquier otra comunidad u ong aprobada (excluyendo a
  //   quien deriva), sin importar jurisdiccion, porque lo que importa es
  //   quien tenga el recurso disponible.
  // - moderador: solo a las comunidades/ongs aprobadas de su propia
  //   jurisdiccion (las que el mismo ya avalo), no a todo el listado
  //   nacional.
  async findDirectorioDerivar(solicitante: {
    id: number;
    role: string;
    ciudad?: string;
  }) {
    const entidades = await this.userRepository.find({
      where: {
        approved: true,
        role: { name: In(['comunidad', 'ong']) },
        ...(solicitante.role === 'moderador'
          ? { ciudad: solicitante.ciudad }
          : {}),
      },
      relations: ['role'],
      order: { organizationName: 'ASC' },
    });

    return entidades
      .filter((usuario) => usuario.id !== solicitante.id)
      .map((usuario) => ({
        id: usuario.id,
        organizationName:
          usuario.organizationName ??
          `${usuario.firstName} ${usuario.lastName}`,
        ciudad: usuario.ciudad,
        role: usuario.role.name,
      }));
  }

  async findMunicipiosPublico() {
    const municipios = await this.userRepository.find({
      where: { role: { name: 'moderador' } },
      relations: ['role'],
      order: { ciudad: 'ASC' },
    });

    return municipios
      .filter((municipio) => !!municipio.ciudad)
      .map((municipio) => ({
        ciudad: municipio.ciudad,
        nombre: municipio.organizationName ?? `Municipio de ${municipio.ciudad}`,
      }));
  }

  findPendingApprovals(moderadorCiudad?: string) {
    return this.userRepository.find({
      where: {
        approved: false,
        ciudad: moderadorCiudad,
        role: {
          name: In(ROLES_QUE_REQUIEREN_APROBACION),
        },
      },
      relations: ['role', 'offeredCategories'],
      order: {
        id: 'ASC',
      },
    });
  }

  async findOne(id: number) {
    const user = await this.userRepository.findOne({
      where: { id },
      relations: ['role', 'offeredCategories'],
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

    // Solo un moderador puede aprobar (o desaprobar) una comunidad u ong.
    if (dto.approved !== undefined && !isModerator) {
      throw new ForbiddenException(
        'Solo un moderador puede aprobar una comunidad u organización',
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
