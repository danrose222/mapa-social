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

    return this.repository.save(municipio);
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

    if (dto.ciudad && dto.ciudad !== municipio.ciudad) {
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

    return this.repository.save(municipio);
  }

  async remove(id: number) {
    const municipio = await this.findOne(id);

    await this.repository.remove(municipio);

    return {
      message: 'Municipio eliminado',
    };
  }
}
