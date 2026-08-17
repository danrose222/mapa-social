import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { Organization } from './entities/organization.entity';
import { User } from '../users/entities/user.entity';
import { ModeratorLocality } from '../users/entities/moderator-locality.entity';
import { Need } from '../needs/entities/need.entity';
import { Resource } from '../resources/entities/resource.entity';
import { CreateOrganizationDto } from './dto/create-organization.dto';
import { UpdateOrganizationDto } from './dto/update-organization.dto';

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

  async create(dto: CreateOrganizationDto, currentUser: AuthUser) {
    const organization = await this.repository.save(
      this.repository.create(dto),
    );

    const hasModeratorAccess =
      currentUser.role === 'moderador' || currentUser.role === 'admin';

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
      relations: ['category'],
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
    // Un admin no está acotado a ninguna localidad -- por eso es "súper".
    if (currentUser.role === 'admin') {
      return;
    }

    const localities = await this.localityRepository.find({
      where: { userId: currentUser.id },
    });

    const targetCity = organization.ciudad.trim().toLowerCase();
    // Comparación case-insensitive/trim: los datos viejos de 'ciudad' son
    // texto libre sin normalizar, así que un match exacto sería demasiado
    // frágil contra mayúsculas/espacios.
    const isInScope = localities.some(
      (l) => l.locality.trim().toLowerCase() === targetCity,
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
      currentUser.role === 'moderador' || currentUser.role === 'admin';

    if (hasModeratorAccess) {
      await this.assertCityInModeratorScope(organization, currentUser);
    } else {
      // Autoservicio: un miembro de la propia organización puede editar su
      // perfil (nombre, descripción, contacto, dirección), pero JAMÁS
      // avalarse a sí mismo -- eso sigue siendo exclusivo de moderador/admin.
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
          'Solo un moderador o un admin puede avalar una organización',
        );
      }
    }

    Object.assign(organization, dto);

    return this.repository.save(organization);
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
