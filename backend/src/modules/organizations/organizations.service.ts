import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { Organization } from './entities/organization.entity';
import { User } from '../users/entities/user.entity';
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
  ) {}

  create(dto: CreateOrganizationDto) {
    return this.repository.save(this.repository.create(dto));
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

  async update(id: number, dto: UpdateOrganizationDto, currentUser: AuthUser) {
    const organization = await this.findOne(id);

    if (dto.verified !== undefined) {
      const moderator = await this.userRepository.findOne({
        where: { id: currentUser.id },
      });

      if (!moderator?.ciudad || moderator.ciudad !== organization.ciudad) {
        throw new ForbiddenException(
          'Solo podés avalar organizaciones de tu misma ciudad',
        );
      }
    }

    Object.assign(organization, dto);

    return this.repository.save(organization);
  }

  async remove(id: number) {
    const organization = await this.findOne(id);

    await this.repository.remove(organization);

    return {
      message: 'Organización eliminada',
    };
  }
}
