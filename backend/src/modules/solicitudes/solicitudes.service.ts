import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { Solicitud } from './entities/solicitud.entity';
import { Need } from '../needs/entities/need.entity';
import { ModeratorLocality } from '../users/entities/moderator-locality.entity';
import { CreateSolicitudDto } from './dto/create-solicitud.dto';
import { UpdateSolicitudDto } from './dto/update-solicitud.dto';
import { localitiesMatch } from '../../common/utils/locality-match.util';

interface AuthUser {
  id: number;
  role: string;
}

function hasModeratorAccess(user: AuthUser): boolean {
  return user.role === 'moderador';
}

@Injectable()
export class SolicitudesService {
  constructor(
    @InjectRepository(Solicitud)
    private readonly repository: Repository<Solicitud>,

    @InjectRepository(Need)
    private readonly needRepository: Repository<Need>,

    @InjectRepository(ModeratorLocality)
    private readonly localityRepository: Repository<ModeratorLocality>,
  ) {}

  private async findNeedOrFail(needId: number): Promise<Need> {
    const need = await this.needRepository.findOne({
      where: { id: needId },
      relations: ['organization'],
    });

    if (!need) {
      throw new NotFoundException('Necesidad inexistente');
    }

    return need;
  }

  // Mismo criterio que NeedsService.assertModeratorJurisdiction: un
  // moderador solo puede gestionar Solicitudes de necesidades dentro de su
  // propia jurisdicción -- si no, cualquier moderador podía ver quién se
  // ofreció y aceptar/rechazar pedidos de cualquier localidad del país.
  private async assertModeratorJurisdiction(
    need: Need,
    currentUser: AuthUser,
  ) {
    const targetLocality = need.organization?.ciudad ?? need.locality;
    if (!targetLocality) {
      return;
    }

    const localities = await this.localityRepository.find({
      where: { userId: currentUser.id },
    });

    const inScope = localities.some((l) =>
      localitiesMatch(l.locality, targetLocality),
    );

    if (!inScope) {
      throw new ForbiddenException(
        `No tenés asignada "${targetLocality}" -- no podés gestionar solicitudes de esta necesidad.`,
      );
    }
  }

  async create(needId: number, dto: CreateSolicitudDto, currentUser: AuthUser) {
    const need = await this.findNeedOrFail(needId);

    if (need.userId === currentUser.id) {
      throw new ForbiddenException('No podés ofrecerte ayuda a vos mismo');
    }

    if (need.status !== 'active') {
      throw new BadRequestException('Esta necesidad ya no está activa');
    }

    // Idempotente: si ya tiene una solicitud pendiente de esta misma
    // persona, devolvemos esa en vez de crear un duplicado -- evita que
    // clickear el botón dos veces genere spam.
    const existingPending = await this.repository.findOne({
      where: { needId, helperUserId: currentUser.id, status: 'pending' },
    });

    if (existingPending) {
      return existingPending;
    }

    const solicitud = this.repository.create({
      needId,
      helperUserId: currentUser.id,
      message: dto.message,
      status: 'pending',
    });

    return this.repository.save(solicitud);
  }

  async findForNeed(needId: number, currentUser: AuthUser) {
    const need = await this.findNeedOrFail(needId);

    const isOwner = need.userId === currentUser.id;

    if (!isOwner && !hasModeratorAccess(currentUser)) {
      throw new ForbiddenException(
        'Solo el dueño de la necesidad (o un moderador) puede ver quién se ofreció',
      );
    }

    if (!isOwner) {
      await this.assertModeratorJurisdiction(need, currentUser);
    }

    return this.repository.find({
      where: { needId },
      relations: ['helper'],
      order: { createdAt: 'DESC' },
    });
  }

  async updateStatus(
    needId: number,
    solicitudId: number,
    dto: UpdateSolicitudDto,
    currentUser: AuthUser,
  ) {
    const need = await this.findNeedOrFail(needId);

    const isOwner = need.userId === currentUser.id;

    if (!isOwner && !hasModeratorAccess(currentUser)) {
      throw new ForbiddenException(
        'Solo el dueño de la necesidad (o un moderador) puede aceptar o rechazar',
      );
    }

    if (!isOwner) {
      await this.assertModeratorJurisdiction(need, currentUser);
    }

    const solicitud = await this.repository.findOne({
      where: { id: solicitudId, needId },
    });

    if (!solicitud) {
      throw new NotFoundException('Esa solicitud no existe para esta necesidad');
    }

    solicitud.status = dto.status;
    solicitud.respondedAt = new Date();

    return this.repository.save(solicitud);
  }

  findMine(currentUser: AuthUser) {
    return this.repository.find({
      where: { helperUserId: currentUser.id },
      relations: ['need'],
      order: { createdAt: 'DESC' },
    });
  }

  // Usado por NeedsController para decidir si mostrar el contacto: si esta
  // persona tiene una solicitud ACEPTADA sobre esta necesidad puntual.
  async findAcceptedNeedIds(userId: number): Promise<Set<number>> {
    const rows = await this.repository.find({
      where: { helperUserId: userId, status: 'accepted' },
      select: ['needId'],
    });

    return new Set(rows.map((r) => r.needId));
  }
}
