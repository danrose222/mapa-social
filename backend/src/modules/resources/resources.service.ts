import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Resource } from './entities/resource.entity';
import { User } from '../users/entities/user.entity';
import { Category } from '../categories/entities/category.entity';
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
    private readonly organizationsService: OrganizationsService,
  ) {}
  async create(currentUser: AuthUser, dto: CreateResourceDto) {
    const user = await this.userRepository.findOne({
      where: { id: currentUser.id },
    });
    if (!user) {
      throw new NotFoundException('Usuario inexistente');
    }
    const isModerator = currentUser.role === 'moderador' || currentUser.role === 'admin';
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
      order: {
        id: 'ASC',
      },
    });
  }
  findOne(id: number) {
    return this.repository.findOne({
      where: { id },
      relations: ['user', 'category', 'organization', 'resolvedBy'],
    });
  }
  private assertCanModify(resource: Resource, currentUser: AuthUser) {
    const isOwner = resource.userId === currentUser.id;
    const isModerator = currentUser.role === 'moderador' || currentUser.role === 'admin';
    if (!isOwner && !isModerator) {
      throw new ForbiddenException(
        'No podés modificar un recurso que no es tuyo',
      );
    }
  }
  async update(id: number, dto: UpdateResourceDto, currentUser: AuthUser) {
    const resource = await this.repository.findOne({
      where: { id },
    });
    if (!resource) {
      throw new NotFoundException('Recurso inexistente');
    }
    this.assertCanModify(resource, currentUser);
    const isModerator = currentUser.role === 'moderador' || currentUser.role === 'admin';
    if (dto.status !== undefined && !isModerator) {
      throw new ForbiddenException(
        'Solo un moderador puede cambiar el estado del recurso',
      );
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
    });
    if (!resource) {
      throw new NotFoundException('Recurso inexistente');
    }
    this.assertCanModify(resource, currentUser);
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
    const distanceExpr = `(6371 * acos(
        cos(radians(:lat)) * cos(radians(entity.latitude))
        * cos(radians(entity.longitude) - radians(:lng))
        + sin(radians(:lat)) * sin(radians(entity.latitude))
      ))`;

    return this.repository
      .createQueryBuilder('entity')
      .leftJoinAndSelect('entity.category', 'category')
      .leftJoinAndSelect('entity.user', 'user')
      .leftJoinAndSelect('entity.organization', 'organization')
      .where('entity.status = :status', { status: 'available' })
      .andWhere('entity.categoryId = :categoryId', { categoryId })
      .andWhere(`${distanceExpr} < :radius`)
      .setParameters({ lat, lng, radius: radiusKm })
      .orderBy(distanceExpr, 'ASC')
      .limit(limit)
      .getMany();
  }
}
