import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { Role } from './entities/role.entity';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';

@Injectable()
export class RolesService {
  constructor(
    @InjectRepository(Role)
    private readonly repository: Repository<Role>,
  ) {}

  create(dto: CreateRoleDto) {
    const role = this.repository.create(dto);

    return this.repository.save(role);
  }

  findAll() {
    return this.repository.find({
      order: {
        id: 'ASC',
      },
    });
  }

  async findOne(id: number) {
    const role = await this.repository.findOne({
      where: { id },
    });

    if (!role) {
      throw new NotFoundException(`Role ${id} no existe`);
    }

    return role;
  }

  async update(id: number, dto: UpdateRoleDto) {
    const role = await this.findOne(id);

    Object.assign(role, dto);

    return this.repository.save(role);
  }

  async remove(id: number) {
    const role = await this.findOne(id);

    await this.repository.remove(role);

    return {
      message: 'Role eliminado correctamente',
    };
  }
}
