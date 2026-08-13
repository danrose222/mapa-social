import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { SearchNeedsDto } from './dto/search-needs.dto';
import { SearchService } from './search/search.service';
import { InjectRepository } from '@nestjs/typeorm';

import { In, Repository } from 'typeorm';

import { Need } from './entities/need.entity';
import { User } from '../users/entities/user.entity';
import { Category } from '../categories/entities/category.entity';
import { Resource } from '../resources/entities/resource.entity';
import { Solicitud } from '../solicitudes/entities/solicitud.entity';

import { CreateNeedDto } from './dto/create-need.dto';
import { UpdateNeedDto } from './dto/update-need.dto';

interface AuthUser {
  id: number;
  role: string;
}

@Injectable()
export class NeedsService {
  constructor(
    @InjectRepository(Need)
    private readonly repository: Repository<Need>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Category)
    private readonly categoryRepository: Repository<Category>,
    @InjectRepository(Resource)
    private readonly resourceRepository: Repository<Resource>,
    @InjectRepository(Solicitud)
    private readonly solicitudRepository: Repository<Solicitud>,
    private readonly searchService: SearchService,
  ) {}

  async create(userId: number, dto: CreateNeedDto) {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: ['role'],
    });

    if (!user) {
      throw new NotFoundException('Usuario inexistente');
    }

    // Un ciudadano no publica "necesidades": pide ayuda solicitando un
    // recurso puntual desde el mapa. Publicar una necesidad institucional es
    // cosa de comunidades y ONGs. El municipio no registra necesidades
    // propias (esa responsabilidad es del gobierno provincial, no del
    // municipio ni de una ONG/comunidad ajena): solo ofrece recursos, y
    // recibe solicitudes puntuales de las comunidades cuando necesitan algo.
    const isApprovedOrganization =
      ['comunidad', 'ong'].includes(user.role.name) && user.approved;

    if (!isApprovedOrganization) {
      throw new ForbiddenException(
        'Solo una comunidad u ONG puede registrar una necesidad. Si necesitás ayuda, usá "Solicitar ayuda" desde el mapa.',
      );
    }

    const category = await this.categoryRepository.findOne({
      where: { id: dto.categoryId },
    });

    if (!category) {
      throw new NotFoundException('Categoría inexistente');
    }

    const need = await this.repository.save(
      this.repository.create({ ...dto, userId }),
    );

    await this.notificarOngsRelevantes(need);

    return need;
  }

  // Sin esto, una necesidad publicada era solo un pin más en el mapa: para
  // que una ONG hiciera algo con ella, alguien tenía que verla y mandarle
  // una Solicitud aparte a mano. Ahora se genera esa Solicitud sola, apenas
  // se publica la necesidad, hacia cada ONG aprobada que ya ofrece la misma
  // categoría — así aparece directo en su panel de "Solicitudes recibidas",
  // sin ningún paso manual extra. No se notifica a la propia organización
  // que publicó la necesidad, aunque también ofrezca esa categoría.
  private async notificarOngsRelevantes(need: Need): Promise<void> {
    const recursosDeLaCategoria = await this.resourceRepository.find({
      where: { categoryId: need.categoryId },
      select: ['userId'],
    });

    const idsOrganizaciones = [
      ...new Set(recursosDeLaCategoria.map((recurso) => recurso.userId)),
    ].filter((id) => id !== need.userId);

    if (!idsOrganizaciones.length) {
      return;
    }

    const ongsAprobadas = await this.userRepository.find({
      where: {
        id: In(idsOrganizaciones),
        approved: true,
        role: { name: 'ong' },
      },
    });

    if (!ongsAprobadas.length) {
      return;
    }

    const solicitudes = ongsAprobadas.map((ong) =>
      this.solicitudRepository.create({
        userId: need.userId,
        targetUserId: ong.id,
        categoryId: need.categoryId,
        contactName: need.contactName,
        contactInfo: need.contactInfo,
        address: need.address,
        status: 'pendiente',
      }),
    );

    await this.solicitudRepository.save(solicitudes);
  }

  findAll() {
    return this.repository.find({
      relations: ['user', 'category'],
      order: {
        id: 'ASC',
      },
    });
  }
  search(dto: SearchNeedsDto) {
    const qb = this.repository
      .createQueryBuilder('entity')
      .leftJoinAndSelect('entity.category', 'category')
      .leftJoinAndSelect('entity.user', 'user')
      .where('entity.status = :status', { status: 'active' });
  
    return this.searchService.applyFilters(qb, dto).getMany();
  }
  findOne(id: number) {
    return this.repository.findOne({
      where: { id },
      relations: ['user', 'category'],
    });
  }

  async findMatches(id: number, radius: number) {
    const need = await this.repository.findOne({
      where: { id },
    });

    if (!need) {
      throw new NotFoundException('Necesidad inexistente');
    }

    return this.resourceRepository
      .createQueryBuilder('entity')
      .leftJoinAndSelect('entity.category', 'category')
      .where('entity.categoryId = :categoryId', {
        categoryId: need.categoryId,
      })
      .andWhere('entity.status = :status', { status: 'available' })
      .andWhere(
        `(6371 * acos(
            cos(radians(:lat)) * cos(radians(entity.latitude))
            * cos(radians(entity.longitude) - radians(:lng))
            + sin(radians(:lat)) * sin(radians(entity.latitude))
          )) < :radius`,
        { lat: need.latitude, lng: need.longitude, radius },
      )
      .orderBy(
        `(6371 * acos(
            cos(radians(:lat)) * cos(radians(entity.latitude))
            * cos(radians(entity.longitude) - radians(:lng))
            + sin(radians(:lat)) * sin(radians(entity.latitude))
          ))`,
        'ASC',
      )
      .limit(10)
      .getMany();
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

  async update(id: number, dto: UpdateNeedDto, currentUser: AuthUser) {
    const need = await this.repository.findOne({
      where: { id },
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

    const previousStatus = need.status;

    Object.assign(need, dto);

    if (dto.status === 'resuelta') {
      need.resolvedBy = currentUser.id;
      need.resolvedAt = new Date();
    } else if (dto.status !== undefined && previousStatus === 'resuelta') {
      need.resolvedBy = null;
      need.resolvedAt = null;
    }

    return this.repository.save(need);
  }

  async remove(id: number, currentUser: AuthUser) {
    const need = await this.repository.findOne({
      where: { id },
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
