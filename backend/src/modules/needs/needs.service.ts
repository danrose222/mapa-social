import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { SearchNeedsDto } from './dto/search-needs.dto';
import { SearchService } from './search/search.service';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Need } from './entities/need.entity';
import { User } from '../users/entities/user.entity';
import { PUBLIC_USER_FIELDS } from '../users/public-user-fields.util';
import { Category } from '../categories/entities/category.entity';
import { ModeratorLocality } from '../users/entities/moderator-locality.entity';
import { localitiesMatch } from '../../common/utils/locality-match.util';
import { CreateNeedDto } from './dto/create-need.dto';
import { UpdateNeedDto } from './dto/update-need.dto';
interface AuthUser {
  id: number;
  role: string;
}
const RESOLVED_STATUS = 'resolved';
@Injectable()
export class NeedsService {
  constructor(
    @InjectRepository(Need)
    private readonly repository: Repository<Need>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Category)
    private readonly categoryRepository: Repository<Category>,
    @InjectRepository(ModeratorLocality)
    private readonly localityRepository: Repository<ModeratorLocality>,
    private readonly searchService: SearchService,
  ) {}
  async create(userId: number, dto: CreateNeedDto) {
    const user = await this.userRepository.findOne({
      where: { id: userId },
    });
    if (!user) {
      throw new NotFoundException('Usuario inexistente');
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
        userId,
        organizationId: user.organizationId,
      }),
    );
  }
  findAll() {
    return this.repository.find({
      relations: ['user', 'category', 'organization', 'resolvedBy'],
      // Sin esto, el user/resolvedBy completo (con email y phone reales)
      // viaja en un endpoint público -- el contacto para publicaciones
      // pasa por contactName/contactInfo (ver needs-contact.util.ts), no
      // por los datos de la cuenta.
      select: {
        user: PUBLIC_USER_FIELDS,
        resolvedBy: PUBLIC_USER_FIELDS,
      },
      order: {
        id: 'ASC',
      },
    });
  }
  async search(dto: SearchNeedsDto) {
    const page = dto.page ?? 1;
    const limit = dto.limit ?? 20;

    const qb = this.repository
      .createQueryBuilder('entity')
      .leftJoinAndSelect('entity.category', 'category')
      .leftJoin('entity.user', 'user')
      .addSelect(['user.id', 'user.firstName', 'user.lastName'])
      .leftJoinAndSelect('entity.organization', 'organization')
      .where('entity.status = :status', { status: 'active' });

    const [items, total] = await this.searchService
      .applyFilters(qb, dto)
      .orderBy('entity.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return { items, total, page, limit, totalPages: Math.ceil(total / limit) || 1 };
  }

  // Localidades que tienen al menos una necesidad activa, con cuántas --
  // es lo que arma el selector de territorio del lado del frontend, así
  // el filtro solo ofrece opciones que realmente tienen algo cargado.
  async localities() {
    const rows = await this.repository
      .createQueryBuilder('entity')
      .select('entity.locality', 'locality')
      .addSelect('COUNT(*)', 'count')
      .where('entity.status = :status', { status: 'active' })
      .andWhere('entity.locality IS NOT NULL')
      .andWhere("entity.locality != ''")
      .groupBy('entity.locality')
      .orderBy('count', 'DESC')
      .getRawMany<{ locality: string; count: string }>();

    return rows.map((r) => ({ locality: r.locality, count: Number(r.count) }));
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
  // Las propias necesidades de un usuario -- no hace falta la relación
  // 'user' acá (ya sabemos de quién son), solo resolvedBy si un moderador
  // ya la resolvió.
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
  private assertCanModify(need: Need, currentUser: AuthUser) {
    const isOwner = need.userId === currentUser.id;
    const isModerator = currentUser.role === 'moderador';
    if (!isOwner && !isModerator) {
      throw new ForbiddenException(
        'No podés modificar una publicación que no es tuya',
      );
    }
  }

  // Si un moderador (no el dueño) está actuando sobre esta
  // necesidad, tiene que tener asignada la localidad que le corresponde --
  // la de la organización si está vinculada, si no la propia 'locality'.
  // Sin ninguna de las dos (dato viejo, o nunca cargado) no podemos acotar,
  // así que se permite -- mejor eso que dejar contenido que nadie pueda
  // moderar.
  private async assertModeratorJurisdiction(need: Need, currentUser: AuthUser) {
    const isOwner = need.userId === currentUser.id;
    if (isOwner) {
      return;
    }

    const targetLocality = need.organization?.ciudad ?? need.locality;
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
        `No tenés asignada "${targetLocality}" -- no podés moderar esta publicación.`,
      );
    }
  }

  async update(id: number, dto: UpdateNeedDto, currentUser: AuthUser) {
    const need = await this.repository.findOne({
      where: { id },
      relations: ['organization'],
    });
    if (!need) {
      throw new NotFoundException('Necesidad inexistente');
    }
    this.assertCanModify(need, currentUser);
    const isModerator = currentUser.role === 'moderador';
    if (dto.status !== undefined && !isModerator) {
      throw new ForbiddenException(
        'Solo un moderador puede cambiar el estado de la publicación',
      );
    }
    if (dto.requiresSolicitud !== undefined && !isModerator) {
      throw new ForbiddenException(
        'Solo un moderador puede cambiar si esta necesidad requiere Solicitud',
      );
    }
    if (dto.status !== undefined || dto.requiresSolicitud !== undefined) {
      await this.assertModeratorJurisdiction(need, currentUser);
    }
    const previousStatus = need.status;
    Object.assign(need, dto);
    if (dto.status !== undefined) {
      if (dto.status === RESOLVED_STATUS) {
        need.resolvedById = currentUser.id;
        need.resolvedAt = new Date();
      } else if (previousStatus === RESOLVED_STATUS) {
        // null explícito, no undefined -- ver el comentario en
        // need.entity.ts. undefined hace que save() omita la columna
        // del UPDATE y quede con el valor viejo.
        need.resolvedById = null;
        need.resolvedAt = null;
      }
    }
    return this.repository.save(need);
  }
  async remove(id: number, currentUser: AuthUser) {
    const need = await this.repository.findOne({
      where: { id },
      relations: ['organization'],
    });
    if (!need) {
      throw new NotFoundException('Necesidad inexistente');
    }
    this.assertCanModify(need, currentUser);
    await this.assertModeratorJurisdiction(need, currentUser);
    await this.repository.remove(need);
    return {
      message: 'Necesidad eliminada',
    };
  }
}
