import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { InjectRepository } from '@nestjs/typeorm';

import { Repository } from 'typeorm';

import { Municipio } from './entities/municipio.entity';

import { CreateMunicipioDto } from './dto/create-municipio.dto';
import { UpdateMunicipioDto } from './dto/update-municipio.dto';
import { matchesAnyLocality } from '../../common/utils/locality-match.util';
import { saveOrConflict } from '../../common/utils/save-or-conflict.util';

@Injectable()
export class MunicipiosService {
  constructor(
    @InjectRepository(Municipio)
    private readonly repository: Repository<Municipio>,
  ) {}

  async create(dto: CreateMunicipioDto) {
    // Mismo chequeo que UsersService.create() para email: sin esto, una
    // ciudad repetida llega directo a la constraint UNIQUE y MySQL/TypeORM
    // la devuelve como 500 genérico en vez de un 409 legible.
    const existing = await this.repository.findOne({
      where: { ciudad: dto.ciudad },
    });

    if (existing) {
      throw new ConflictException(
        'Ya existe un municipio registrado para esa ciudad.',
      );
    }

    const municipio = this.repository.create(dto);

    return saveOrConflict(
      () => this.repository.save(municipio),
      'Ya existe un municipio registrado para esa ciudad.',
    );
  }

  findAll() {
    return this.repository.find({
      order: {
        id: 'ASC',
      },
    });
  }

  async findOne(id: number) {
    const municipio = await this.repository.findOne({
      where: { id },
    });

    if (!municipio) {
      throw new NotFoundException('Municipio inexistente');
    }

    return municipio;
  }

  async update(id: number, dto: UpdateMunicipioDto) {
    const municipio = await this.findOne(id);

    if (dto.ciudad !== undefined && dto.ciudad !== municipio.ciudad) {
      const existing = await this.repository.findOne({
        where: { ciudad: dto.ciudad },
      });

      if (existing) {
        throw new ConflictException(
          'Ya existe un municipio registrado para esa ciudad.',
        );
      }
    }

    Object.assign(municipio, dto);

    return saveOrConflict(
      () => this.repository.save(municipio),
      'Ya existe un municipio registrado para esa ciudad.',
    );
  }

  // Regla de escala territorial ("Burocracia vs. Confianza" del
  // documento de visión): una ciudad "tiene Municipio" si algún
  // municipio registrado matchea su nombre. Misma comparación
  // bidireccional que assertModeratorJurisdiction() usa en
  // needs/resources/organizations, para que "Nueva Córdoba" cuente como
  // parte de la jurisdicción de "Córdoba".
  async hasMunicipioForCiudad(ciudad: string): Promise<boolean> {
    const normalized = ciudad.trim().toLowerCase();

    if (!normalized) {
      return false;
    }

    const municipios = await this.repository.find();

    return matchesAnyLocality(
      municipios.map((m) => m.ciudad),
      normalized,
    );
  }

  // Feedback en tiempo real del selector de localidad en "Registrar una
  // organización" (ver crear-organizacion.component.ts): expone la misma
  // regla de escala territorial que ya evalúa TerritorialScaleInterceptor
  // al crear, para que el usuario la vea ANTES de enviar el formulario.
  async checkCiudad(ciudad: string): Promise<{ isCityScale: boolean }> {
    return {
      isCityScale: await this.hasMunicipioForCiudad(ciudad),
    };
  }

  async remove(id: number) {
    const municipio = await this.findOne(id);

    await this.repository.remove(municipio);

    return {
      message: 'Municipio eliminado',
    };
  }
}
