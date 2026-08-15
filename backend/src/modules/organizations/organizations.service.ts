import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { Organization } from './entities/organization.entity';
import { User } from '../users/entities/user.entity';
import { Need } from '../needs/entities/need.entity';
import { Resource } from '../resources/entities/resource.entity';
import { CreateOrganizationDto } from './dto/create-organization.dto';
import { UpdateOrganizationDto } from './dto/update-organization.dto';

interface AuthUser {
  id: number;
  role: string;
}

@Injectable()
export class OrganizationsService {
  constructor(
    @InjectRepository(Organization)
    private readonly repository: Repository<Organization>,

    @InjectRepository(User)
    private readonly userRepository: Repository<User>,

    @InjectRepository(Need)
    private readonly needRepository: Repository<Need>,

    @InjectRepository(Resource)
    private readonly resourceRepository: Repository<Resource>,
  ) {}

  async create(dto: CreateOrganizationDto, currentUser: AuthUser) {
    const organization = await this.repository.save(
      this.repository.create(dto),
    );

    if (currentUser.role !== 'moderador') {
      await this.userRepository.update(currentUser.id, {
        organizationId: organization.id,
      });
    }

    return organization;
  }

  findAll() {
    return this.repository.find({
      order: {
        id: 'ASC',
      },
    });
  }

  async findOne(id: number) {
    const organization = await this.repository.findOne({
      where: { id },
    });

    if (!organization) {
      throw new NotFoundException('Organización inexistente');
    }

    return organization;
  }

  // Perfil público de organización: qué recursos ofrece. Confirmamos
  // primero que la organización exista, así el 404 es claro si el id
  // no corresponde a ninguna.
  async findResources(organizationId: number) {
    await this.findOne(organizationId);

    return this.resourceRepository.find({
      where: { organizationId },
      relations: ['category'],
      order: { id: 'ASC' },
    });
  }

  // Perfil público de organización: qué necesidades tiene.
  async findNeeds(organizationId: number) {
    await this.findOne(organizationId);

    return this.needRepository.find({
      where: { organizationId },
      relations: ['category'],
      order: { id: 'ASC' },
    });
  }

  private async assertSameCity(
    organization: Organization,
    currentUser: AuthUser,
  ): Promise<void> {
    const moderator = await this.userRepository.findOne({
      where: { id: currentUser.id },
    });

    if (!moderator?.ciudad || moderator.ciudad !== organization.ciudad) {
      throw new ForbiddenException(
        'Solo podés administrar organizaciones de tu misma ciudad',
      );
    }
  }

  async update(id: number, dto: UpdateOrganizationDto, currentUser: AuthUser) {
    const organization = await this.findOne(id);

    await this.assertSameCity(organization, currentUser);

    Object.assign(organization, dto);

    return this.repository.save(organization);
  }

  async remove(id: number, currentUser: AuthUser) {
    const organization = await this.findOne(id);

    await this.assertSameCity(organization, currentUser);

    await this.repository.remove(organization);

    return {
      message: 'Organización eliminada',
    };
  }
}
