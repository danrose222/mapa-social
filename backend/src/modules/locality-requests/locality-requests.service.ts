import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { LocalityRequest } from './entities/locality-request.entity';
import { ModeratorLocality } from '../users/entities/moderator-locality.entity';
import { CreateLocalityRequestDto } from './dto/create-locality-request.dto';
import { RespondLocalityRequestDto } from './dto/respond-locality-request.dto';

interface AuthUser {
  id: number;
  role: string;
}

@Injectable()
export class LocalityRequestsService {
  constructor(
    @InjectRepository(LocalityRequest)
    private readonly repository: Repository<LocalityRequest>,

    @InjectRepository(ModeratorLocality)
    private readonly localityRepository: Repository<ModeratorLocality>,
  ) {}

  async create(dto: CreateLocalityRequestDto, currentUser: AuthUser) {
    if (currentUser.role !== 'moderador') {
      throw new ForbiddenException(
        'Solo un moderador puede pedir una localidad -- un admin no tiene restricción de localidad',
      );
    }

    const normalizedLocality = dto.locality.trim();

    const existingPending = await this.repository.findOne({
      where: { userId: currentUser.id, locality: normalizedLocality, status: 'pending' },
    });

    if (existingPending) {
      return existingPending;
    }

    const request = this.repository.create({
      userId: currentUser.id,
      locality: normalizedLocality,
      provincia: dto.provincia?.trim(),
      status: 'pending',
    });

    return this.repository.save(request);
  }

  findMine(currentUser: AuthUser) {
    return this.repository.find({
      where: { userId: currentUser.id },
      order: { createdAt: 'DESC' },
    });
  }

  findPending() {
    return this.repository.find({
      where: { status: 'pending' },
      relations: ['user'],
      order: { createdAt: 'ASC' },
    });
  }

  async respond(id: number, dto: RespondLocalityRequestDto, currentUser: AuthUser) {
    if (currentUser.role !== 'admin') {
      throw new ForbiddenException('Solo un admin puede aprobar o rechazar');
    }

    const request = await this.repository.findOne({ where: { id } });

    if (!request) {
      throw new NotFoundException('Esa solicitud no existe');
    }

    if (request.status !== 'pending') {
      throw new BadRequestException('Esta solicitud ya fue respondida');
    }

    request.status = dto.status;
    request.respondedAt = new Date();
    request.respondedById = currentUser.id;

    if (dto.status === 'approved') {
      const existing = await this.localityRepository.findOne({
        where: { userId: request.userId, locality: request.locality },
      });

      if (!existing) {
        await this.localityRepository.save(
          this.localityRepository.create({
            userId: request.userId,
            locality: request.locality,
            provincia: request.provincia,
          }),
        );
      }
    }

    return this.repository.save(request);
  }
}
