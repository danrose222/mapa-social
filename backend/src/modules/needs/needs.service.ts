import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { SearchNeedsDto } from './dto/search-needs.dto';
import { SearchService } from './search/search.service';
import { InjectRepository } from '@nestjs/typeorm';
import { In, IsNull, Repository } from 'typeorm';
import { Need } from './entities/need.entity';
import { User } from '../users/entities/user.entity';
import { PUBLIC_USER_FIELDS } from '../users/public-user-fields.util';
import { Category } from '../categories/entities/category.entity';
import { localitiesMatch } from '../../common/utils/locality-match.util';
import { CreateNeedDto } from './dto/create-need.dto';
import { UpdateNeedDto } from './dto/update-need.dto';
import { CreatePrivateNeedDto } from './dto/create-private-need.dto';
import { ResourcesService } from '../resources/resources.service';
interface AuthUser {
  id: number;
  role: string;
  organizationType?: 'ong' | 'comunidad' | null;
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
    private readonly searchService: SearchService,
    private readonly resourcesService: ResourcesService,
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

  // Estado vacío de búsqueda -> "publicá tu necesidad": a diferencia de
  // create(), esta nunca aparece en el mapa público (ver findAll/search/
  // localities más abajo, todas con isPrivate: false). Sin título propio
  // ni dirección legible -- el formulario rápido no los pide.
  async createPrivate(userId: number, dto: CreatePrivateNeedDto) {
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
        userId,
        organizationId: user.organizationId,
        categoryId: dto.categoryId,
        title: `Necesidad privada de ${category.name}`,
        description: dto.description,
        urgency: dto.urgency,
        latitude: dto.latitude,
        longitude: dto.longitude,
        locality: dto.locality,
        contactInfo: dto.contactInfo,
        isPrivate: true,
      }),
    );
  }

  // Bandeja de necesidades privadas: un moderador ve todas (mismo criterio
  // amplio que ya tiene sobre el resto del contenido); una organización
  // solo las de su misma ciudad Y en una categoría donde ya publicó algún
  // recurso (categoryIdsForOrganization) -- sin eso no hay señal de que le
  // sirva a esa organización en particular.
  async findPrivateForViewer(currentUser: AuthUser) {
    if (currentUser.role === 'moderador') {
      return this.repository.find({
        where: { isPrivate: true, status: 'active' },
        relations: ['category'],
        order: { createdAt: 'DESC' },
      });
    }

    const user = await this.userRepository.findOne({
      where: { id: currentUser.id },
      relations: ['organization'],
    });

    if (!user?.organization || !user.organization.verified) {
      throw new ForbiddenException(
        'Solo un moderador o una organización avalada puede ver esta bandeja.',
      );
    }

    const categoryIds = await this.resourcesService.categoryIdsForOrganization(
      user.organization.id,
    );

    if (categoryIds.length === 0) {
      return [];
    }

    const needs = await this.repository.find({
      where: { isPrivate: true, status: 'active', categoryId: In(categoryIds) },
      relations: ['category'],
      order: { createdAt: 'DESC' },
    });

    const ciudad = user.organization.ciudad.trim().toLowerCase();

    return needs.filter(
      (need) => !!need.locality && localitiesMatch(need.locality, ciudad),
    );
  }

  // Modelo de visibilidad de necesidades: una necesidad expone que una
  // persona real está pidiendo ayuda, así que a diferencia de los
  // recursos (públicos para cualquiera) solo puede verla una cuenta de
  // una organización YA avalada -- y únicamente las de su propia
  // jurisdicción. null cubre tanto a un visitante anónimo como a un
  // usuario común y a un moderador: ninguno de los tres tiene
  // jurisdicción sobre necesidades acá (el moderador ya tiene su propio
  // circuito separado para necesidades is-Private en
  // findPrivateForViewer()). No confiar en organizationType tal cual
  // viaja en el token -- se vuelve a resolver desde la base, igual que ya
  // hace JwtStrategy con el mismo dato.
  private async resolveOrgViewer(
    currentUser?: AuthUser | null,
  ): Promise<{ ciudad: string } | null> {
    if (!currentUser?.organizationType) {
      return null;
    }

    const user = await this.userRepository.findOne({
      where: { id: currentUser.id },
      relations: ['organization'],
    });

    if (!user?.organization?.verified) {
      return null;
    }

    return { ciudad: user.organization.ciudad };
  }

  async findAll(currentUser?: AuthUser | null) {
    const viewer = await this.resolveOrgViewer(currentUser);

    if (!viewer) {
      return [];
    }

    const needs = await this.repository.find({
      relations: ['user', 'category', 'organization', 'resolvedBy'],
      // Regla de escala territorial: una organización Pendiente (en una
      // ciudad con Municipio, sin avalar todavía) no debe aparecer acá --
      // el OR cubre tanto las necesidades sin organización (un ciudadano
      // de a pie) como las de una organización ya avalada. isPrivate:
      // false en las dos ramas -- una necesidad privada nunca aparece
      // acá, ni logueado ni no.
      where: [
        { organizationId: IsNull(), isPrivate: false },
        { organization: { verified: true }, isPrivate: false },
      ],
      // Sin esto, el user/resolvedBy completo (con email y phone reales)
      // viaja en la respuesta -- el contacto para publicaciones pasa por
      // contactName/contactInfo (ver needs-contact.util.ts), no por los
      // datos de la cuenta.
      select: {
        user: PUBLIC_USER_FIELDS,
        resolvedBy: PUBLIC_USER_FIELDS,
      },
      order: {
        id: 'ASC',
      },
    });

    return needs.filter(
      (need) => !!need.locality && localitiesMatch(need.locality, viewer.ciudad),
    );
  }
  async search(dto: SearchNeedsDto, currentUser?: AuthUser | null) {
    const page = dto.page ?? 1;
    const limit = dto.limit ?? 20;

    const viewer = await this.resolveOrgViewer(currentUser);

    if (!viewer) {
      return { items: [], total: 0, page, limit, totalPages: 1 };
    }

    const qb = this.repository
      .createQueryBuilder('entity')
      .leftJoinAndSelect('entity.category', 'category')
      .leftJoin('entity.user', 'user')
      .addSelect(['user.id', 'user.firstName', 'user.lastName'])
      .leftJoinAndSelect('entity.organization', 'organization')
      .where('entity.status = :status', { status: 'active' })
      // Mismo criterio de escala territorial que findAll(): oculta las
      // necesidades de una organización todavía Pendiente.
      .andWhere('(entity.organizationId IS NULL OR organization.verified = true)')
      .andWhere('entity.isPrivate = false');

    // localitiesMatch() es una comparación difusa en las dos direcciones
    // (ver locality-match.util.ts) que no se puede expresar como un WHERE
    // de SQL -- por eso se pagina en memoria, después de filtrar por
    // jurisdicción, en vez de con skip/take en la consulta. Paginar antes
    // del filtro (como hacía la versión vieja) daría páginas incompletas:
    // de 20 filas traídas por SQL, solo alguna coincide con la
    // jurisdicción real del visitante.
    const matching = await this.searchService
      .applyFilters(qb, dto)
      .orderBy('entity.createdAt', 'DESC')
      .getMany();

    const items = matching.filter(
      (need) => !!need.locality && localitiesMatch(need.locality, viewer.ciudad),
    );
    const total = items.length;
    const paged = items.slice((page - 1) * limit, (page - 1) * limit + limit);

    return { items: paged, total, page, limit, totalPages: Math.ceil(total / limit) || 1 };
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
      .andWhere('entity.isPrivate = false')
      .andWhere('entity.locality IS NOT NULL')
      .andWhere("entity.locality != ''")
      .groupBy('entity.locality')
      .orderBy('count', 'DESC')
      .getRawMany<{ locality: string; count: string }>();

    return rows.map((r) => ({ locality: r.locality, count: Number(r.count) }));
  }
  // Sin ser el dueño ni un moderador, se devuelve null exactamente como si
  // no existiera -- no confirma su existencia a quien no tiene por qué
  // verla. Una necesidad privada queda ahí (la organización compatible la
  // ve a través de findPrivateForViewer(), no de este método); una
  // pública sigue requiriendo el mismo viewer de organización avalada y
  // misma jurisdicción que findAll()/search(), para que no alcance con
  // adivinar un id y pedirlo directo para saltarse ese filtro.
  async findOne(id: number, currentUser?: AuthUser | null) {
    const need = await this.repository.findOne({
      where: { id },
      relations: ['user', 'category', 'organization', 'resolvedBy'],
      select: {
        user: PUBLIC_USER_FIELDS,
        resolvedBy: PUBLIC_USER_FIELDS,
      },
    });

    if (!need) {
      return need;
    }

    const isOwner = currentUser?.id === need.userId;
    const isModerator = currentUser?.role === 'moderador';

    if (isOwner || isModerator) {
      return need;
    }

    if (need.isPrivate) {
      return null;
    }

    const viewer = await this.resolveOrgViewer(currentUser);

    if (!viewer || !need.locality || !localitiesMatch(need.locality, viewer.ciudad)) {
      return null;
    }

    return need;
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
  // El moderador ya no tiene ningún poder sobre publicaciones ajenas -- su
  // rol quedó acotado a avalar organizaciones (ver organizations.service.ts)
  // y gestionar otros moderadores. Cada publicación la maneja únicamente
  // quien la creó.
  private assertCanModify(need: Need, currentUser: AuthUser) {
    const isOwner = need.userId === currentUser.id;
    if (!isOwner) {
      throw new ForbiddenException(
        'No podés modificar una publicación que no es tuya',
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
    await this.repository.remove(need);
    return {
      message: 'Necesidad eliminada',
    };
  }
}
