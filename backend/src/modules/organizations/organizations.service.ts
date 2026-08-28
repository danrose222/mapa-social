import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { Organization } from './entities/organization.entity';
import { User } from '../users/entities/user.entity';
import { ModeratorLocality } from '../users/entities/moderator-locality.entity';
import { Need } from '../needs/entities/need.entity';
import { Resource } from '../resources/entities/resource.entity';
import { CreateOrganizationDto } from './dto/create-organization.dto';
import { UpdateOrganizationDto } from './dto/update-organization.dto';
import { matchesAnyLocality } from '../../common/utils/locality-match.util';
import { ensureUnique, saveOrConflict } from '../../common/utils/save-or-conflict.util';

interface AuthUser {
  id: number;
  role: string;
}

@Injectable()
export class OrganizationsService {
  constructor(
    @InjectRepository(Organization)
    private readonly repository: Repository<Organization>,

    @InjectRepository(User)
    private readonly userRepository: Repository<User>,

    @InjectRepository(ModeratorLocality)
    private readonly localityRepository: Repository<ModeratorLocality>,

    @InjectRepository(Need)
    private readonly needRepository: Repository<Need>,

    @InjectRepository(Resource)
    private readonly resourceRepository: Repository<Resource>,
  ) {}

  async create(
    dto: CreateOrganizationDto,
    currentUser: AuthUser,
    isCityScale: boolean,
  ) {
    // La colación de la columna (utf8mb4_0900_ai_ci) ya es insensible a
    // mayúsculas/acentos, así que esta comparación exacta alcanza -- sin
    // esto, dos organizaciones con el mismo nombre en la misma ciudad (o
    // "Comedor" vs "COMEDOR") convivían sin ningún aviso. Se compara por
    // nombre Y ciudad, no solo nombre: dos organizaciones sin relación en
    // ciudades distintas pueden compartir un nombre genérico legítimo.
    await ensureUnique(
      this.repository,
      { name: dto.name, ciudad: dto.ciudad },
      'Ya existe una organización registrada con ese nombre en esa ciudad',
    );

    const organization = await saveOrConflict(
      () =>
        this.repository.save(
          this.repository.create({
            ...dto,
            // Regla de escala territorial ("Burocracia vs. Confianza"): en
            // una ciudad con Municipio registrado, queda Pendiente hasta el
            // aval explícito de un moderador; en un pueblo sin esa
            // estructura, se autogestiona y nace ya avalada.
            verified: !isCityScale,
          }),
        ),
      'Ya existe una organización registrada con ese nombre en esa ciudad',
    );

    const hasModeratorAccess =
      currentUser.role === 'moderador';

    if (!hasModeratorAccess) {
      await this.userRepository.update(currentUser.id, {
        organizationId: organization.id,
      });
    }

    return organization;
  }

  findAll() {
    return this.repository.find({
      order: {
        id: 'ASC',
      },
    });
  }

  async findOne(id: number) {
    const organization = await this.repository.findOne({
      where: { id },
    });

    if (!organization) {
      throw new NotFoundException('Organización inexistente');
    }

    return organization;
  }

  // Perfil público de organización: qué recursos ofrece. Confirmamos
  // primero que la organización exista, así el 404 es claro si el id
  // no corresponde a ninguna.
  async findResources(organizationId: number) {
    await this.findOne(organizationId);

    return this.resourceRepository.find({
      where: { organizationId },
      relations: ['category', 'organization'],
      order: { id: 'ASC' },
    });
  }

  // Perfil público de organización: qué necesidades tiene.
  async findNeeds(organizationId: number) {
    await this.findOne(organizationId);

    return this.needRepository.find({
      where: { organizationId },
      relations: ['category'],
      order: { id: 'ASC' },
    });
  }

  private async assertCityInModeratorScope(
    organization: Organization,
    currentUser: AuthUser,
  ): Promise<void> {
    const localities = await this.localityRepository.find({
      where: { userId: currentUser.id },
    });

    const targetCity = organization.ciudad.trim().toLowerCase();
    // Comparación bidireccional (ver locality-match.util.ts): Georef no
    // distingue ciudad de barrio, así que "Córdoba" (moderador) y "Nueva
    // Córdoba" (una organización) tienen que considerarse la misma
    // jurisdicción.
    const isInScope = matchesAnyLocality(
      localities.map((l) => l.locality),
      targetCity,
    );

    if (!isInScope) {
      throw new ForbiddenException(
        'No tenés esa localidad asignada. Pedile a otro moderador que te la asigne en tu perfil.',
      );
    }
  }

  async update(id: number, dto: UpdateOrganizationDto, currentUser: AuthUser) {
    const organization = await this.findOne(id);

    const hasModeratorAccess =
      currentUser.role === 'moderador';

    if (hasModeratorAccess) {
      // Hay que validar las DOS ciudades si 'ciudad' viene en el mismo
      // request: la actual (para poder tocar esta organización) y la
      // nueva (para poder reubicarla ahí) -- validar solo una de las dos
      // deja abierta una mitad del mismo problema: o bien reubicar+avalar
      // fuera de tu jurisdicción, o bien "reclamar" una organización ajena
      // moviéndola hacia adentro de tu ciudad.
      await this.assertCityInModeratorScope(organization, currentUser);

      if (dto.ciudad !== undefined && dto.ciudad !== organization.ciudad) {
        await this.assertCityInModeratorScope(
          { ...organization, ciudad: dto.ciudad },
          currentUser,
        );
      }
    } else {
      // Autoservicio: un miembro de la propia organización puede editar su
      // perfil (nombre, descripción, contacto, dirección), pero JAMÁS
      // avalarse a sí mismo -- eso sigue siendo exclusivo de moderador.
      const member = await this.userRepository.findOne({
        where: { id: currentUser.id },
      });

      if (member?.organizationId !== id) {
        throw new ForbiddenException(
          'No pertenecés a esta organización',
        );
      }

      if (dto.verified !== undefined) {
        throw new ForbiddenException(
          'Solo un moderador puede avalar una organización',
        );
      }

      // Una organización ya avalada no puede "mudarse" de ciudad por
      // autoservicio -- eso la sacaría de la jurisdicción del moderador
      // que la aprobó, sin que nadie vuelva a revisarla. Si todavía no
      // está avalada, se permite: el dueño puede corregir la ciudad antes
      // de que un moderador la evalúe.
      if (
        dto.ciudad !== undefined &&
        dto.ciudad !== organization.ciudad &&
        organization.verified
      ) {
        throw new ForbiddenException(
          'Una organización ya avalada no puede cambiar de ciudad por autoservicio -- pedile a un moderador que la reubique.',
        );
      }
    }

    Object.assign(organization, dto);

    return saveOrConflict(
      () => this.repository.save(organization),
      'Ya existe una organización registrada con ese nombre en esa ciudad',
    );
  }

  async remove(id: number, currentUser: AuthUser) {
    const organization = await this.findOne(id);

    await this.assertCityInModeratorScope(organization, currentUser);

    await this.repository.remove(organization);

    return {
      message: 'Organización eliminada',
    };
  }
}
