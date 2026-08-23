import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { Resource } from './entities/resource.entity';
import { User } from '../users/entities/user.entity';
import { PUBLIC_USER_FIELDS } from '../users/public-user-fields.util';
import { Category } from '../categories/entities/category.entity';
import { ModeratorLocality } from '../users/entities/moderator-locality.entity';
import { localitiesMatch } from '../../common/utils/locality-match.util';
import { haversineDistanceExpr } from '../../common/utils/haversine.util';
import { OrganizationsService } from '../organizations/organizations.service';
import { CreateResourceDto } from './dto/create-resource.dto';
import { UpdateResourceDto } from './dto/update-resource.dto';
interface AuthUser {
  id: number;
  role: string;
}

const RESOLVED_STATUS = 'resolved';

@Injectable()
export class ResourcesService {
  constructor(
    @InjectRepository(Resource)
    private readonly repository: Repository<Resource>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Category)
    private readonly categoryRepository: Repository<Category>,
    @InjectRepository(ModeratorLocality)
    private readonly localityRepository: Repository<ModeratorLocality>,
    private readonly organizationsService: OrganizationsService,
  ) {}
  async create(currentUser: AuthUser, dto: CreateResourceDto) {
    const user = await this.userRepository.findOne({
      where: { id: currentUser.id },
    });
    if (!user) {
      throw new NotFoundException('Usuario inexistente');
    }
    const isModerator = currentUser.role === 'moderador';
    let organizationVerified = false;
    if (user.organizationId) {
      const organization = await this.organizationsService.findOne(
        user.organizationId,
      );
      organizationVerified = organization.verified;
    }
    if (!isModerator && !organizationVerified) {
      throw new ForbiddenException(
        'Solo un moderador o un usuario de una organización avalada puede publicar un recurso',
      );
    }
    const category = await this.categoryRepository.findOne({
      where: { id: dto.categoryId },
    });
    if (!category) {
      throw new NotFoundException('Categoría inexistente');
    }
    return this.repository.save(
      this.repository.create({
        ...dto,
        userId: user.id,
        organizationId: user.organizationId,
      }),
    );
  }
  findAll() {
    return this.repository.find({
      relations: ['user', 'category', 'organization', 'resolvedBy'],
      // Regla de escala territorial: un recurso de una organización
      // Pendiente (ciudad con Municipio, sin avalar todavía) no debe
      // aparecer en el mapa público -- ver el comentario equivalente en
      // needs.service.ts.
      where: [{ organizationId: IsNull() }, { organization: { verified: true } }],
      // Sin esto, el user/resolvedBy completo (con email y phone reales)
      // viaja en un endpoint público -- el contacto para publicaciones
      // pasa por contactName/contactInfo (ver resource-contact.util.ts),
      // no por los datos de la cuenta.
      select: {
        user: PUBLIC_USER_FIELDS,
        resolvedBy: PUBLIC_USER_FIELDS,
      },
      order: {
        id: 'ASC',
      },
    });
  }
  findOne(id: number) {
    return this.repository.findOne({
      where: { id },
      relations: ['user', 'category', 'organization', 'resolvedBy'],
      select: {
        user: PUBLIC_USER_FIELDS,
        resolvedBy: PUBLIC_USER_FIELDS,
      },
    });
  }
  // Los propios recursos de un usuario -- ver el comentario equivalente en
  // needs.service.ts.
  findMine(userId: number) {
    return this.repository.find({
      where: { userId },
      relations: ['category', 'organization', 'resolvedBy'],
      select: {
        resolvedBy: PUBLIC_USER_FIELDS,
      },
      order: { id: 'DESC' },
    });
  }
  private assertCanModify(resource: Resource, currentUser: AuthUser) {
    const isOwner = resource.userId === currentUser.id;
    const isModerator = currentUser.role === 'moderador';
    if (!isOwner && !isModerator) {
      throw new ForbiddenException(
        'No podés modificar un recurso que no es tuyo',
      );
    }
  }

  // Los recursos no tienen 'locality' propia (solo 'address' en texto
  // libre) -- la única señal de zona que tenemos es la ciudad de la
  // organización, si está vinculado a una. Sin organización, no hay con
  // qué acotar, así que se permite -- mejor eso que dejar un recurso que
  // ningún moderador pueda tocar.
  private async assertModeratorJurisdiction(resource: Resource, currentUser: AuthUser) {
    const isOwner = resource.userId === currentUser.id;
    if (isOwner) {
      return;
    }

    const targetLocality = resource.organization?.ciudad;
    if (!targetLocality) {
      return;
    }

    const localities = await this.localityRepository.find({
      where: { userId: currentUser.id },
    });

    const normalized = targetLocality.trim().toLowerCase();
    const inScope = localities.some((l) => localitiesMatch(l.locality, normalized));

    if (!inScope) {
      throw new ForbiddenException(
        `No tenés asignada "${targetLocality}" -- no podés moderar este recurso.`,
      );
    }
  }

  async update(id: number, dto: UpdateResourceDto, currentUser: AuthUser) {
    const resource = await this.repository.findOne({
      where: { id },
      relations: ['organization'],
    });
    if (!resource) {
      throw new NotFoundException('Recurso inexistente');
    }
    this.assertCanModify(resource, currentUser);
    const isModerator = currentUser.role === 'moderador';
    if (dto.status !== undefined && !isModerator) {
      throw new ForbiddenException(
        'Solo un moderador puede cambiar el estado del recurso',
      );
    }
    if (dto.status !== undefined) {
      await this.assertModeratorJurisdiction(resource, currentUser);
    }

    const previousStatus = resource.status;

    Object.assign(resource, dto);

    if (dto.status !== undefined) {
      if (dto.status === RESOLVED_STATUS) {
        resource.resolvedById = currentUser.id;
        resource.resolvedAt = new Date();
      } else if (previousStatus === RESOLVED_STATUS) {
        // null explícito -- ver el comentario en needs.service.ts.
        resource.resolvedById = null;
        resource.resolvedAt = null;
      }
    }

    return this.repository.save(resource);
  }
  async remove(id: number, currentUser: AuthUser) {
    const resource = await this.repository.findOne({
      where: { id },
      relations: ['organization'],
    });
    if (!resource) {
      throw new NotFoundException('Recurso inexistente');
    }
    this.assertCanModify(resource, currentUser);
    await this.assertModeratorJurisdiction(resource, currentUser);
    await this.repository.remove(resource);
    return {
      message: 'Recurso eliminado',
    };
  }

  // Matching: recursos de la MISMA categoría que una necesidad, dentro de
  // un radio -- misma fórmula de Haversine que ByDistanceStrategy (needs),
  // aplicada acá sobre resources para no tener dos versiones del cálculo
  // que puedan desincronizarse.
  async findNearbyByCategory(
    lat: number,
    lng: number,
    categoryId: number,
    radiusKm: number,
    limit: number,
  ) {
    const distanceExpr = haversineDistanceExpr('entity', 'lat', 'lng');

    return this.repository
      .createQueryBuilder('entity')
      .leftJoinAndSelect('entity.category', 'category')
      .leftJoin('entity.user', 'user')
      .addSelect(['user.id', 'user.firstName', 'user.lastName'])
      .leftJoinAndSelect('entity.organization', 'organization')
      .where('entity.status = :status', { status: 'available' })
      .andWhere('entity.categoryId = :categoryId', { categoryId })
      .andWhere(`${distanceExpr} < :radius`)
      .setParameters({ lat, lng, radius: radiusKm })
      .orderBy(distanceExpr, 'ASC')
      .limit(limit)
      .getMany();
  }

  // No existe una lista explícita de "categorías que esta organización
  // atiende" -- se infiere de en qué categorías ya publicó algún recurso.
  // Lo usa NeedsService.findPrivateForViewer() para decidir qué
  // necesidades privadas son "compatibles" con una organización.
  async categoryIdsForOrganization(organizationId: number): Promise<number[]> {
    const rows = await this.repository
      .createQueryBuilder('entity')
      .select('DISTINCT entity.categoryId', 'categoryId')
      .where('entity.organizationId = :organizationId', { organizationId })
      .getRawMany<{ categoryId: number }>();

    return rows.map((r) => r.categoryId);
  }
}
