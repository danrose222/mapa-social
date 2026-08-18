import { ForbiddenException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { basename, join } from 'path';
import { existsSync, mkdirSync, unlinkSync } from 'fs';

import { Need } from '../needs/entities/need.entity';
import { Resource } from '../resources/entities/resource.entity';
import { DeleteImageDto } from './dto/delete-image.dto';

interface AuthUser {
  id: number;
  role: string;
}

// Directorio de almacenamiento local. Para un volumen mayor de uso real
// convendría moverlo a un storage externo (S3 o similar); para el alcance
// actual del proyecto, disco local + servido estático alcanza.
export const UPLOADS_DIR = join(process.cwd(), 'uploads');

if (!existsSync(UPLOADS_DIR)) {
  mkdirSync(UPLOADS_DIR, { recursive: true });
}

@Injectable()
export class UploadsService {
  constructor(
    @InjectRepository(Need)
    private readonly needRepository: Repository<Need>,

    @InjectRepository(Resource)
    private readonly resourceRepository: Repository<Resource>,
  ) {}

  async deleteImage(dto: DeleteImageDto, currentUser: AuthUser) {
    // basename() descarta cualquier segmento de carpeta ('../', '/etc/...'),
    // así que aunque nos manden una URL manipulada, solo puede apuntar a
    // un archivo dentro de UPLOADS_DIR -- nunca fuera de esa carpeta.
    const filename = basename(dto.url);
    const canonicalUrl = `/api/uploads/${filename}`;
    const filePath = join(UPLOADS_DIR, filename);

    await this.assertCanDelete(canonicalUrl, currentUser);

    if (existsSync(filePath)) {
      unlinkSync(filePath);
    }

    return { deleted: true };
  }

  // Esta imagen puede estar asociada a una necesidad o recurso ya
  // publicado -- en ese caso, solo su dueño o un moderador/admin puede
  // borrarla. Si no está asociada a ninguna publicación (huérfana: se
  // subió pero la publicación nunca se llegó a crear -- el caso de uso
  // real que describe el propio endpoint), cualquier usuario autenticado
  // puede borrarla: no hay forma de rastrear un dueño para algo que nunca
  // se asoció a nada.
  private async assertCanDelete(canonicalUrl: string, currentUser: AuthUser) {
    const isModerator =
      currentUser.role === 'moderador' || currentUser.role === 'admin';

    if (isModerator) {
      return;
    }

    const [need, resource] = await Promise.all([
      this.needRepository.findOne({ where: { imageUrl: canonicalUrl } }),
      this.resourceRepository.findOne({ where: { imageUrl: canonicalUrl } }),
    ]);

    const owner = need ?? resource;

    if (owner && owner.userId !== currentUser.id) {
      throw new ForbiddenException(
        'Esta imagen pertenece a una publicación de otro usuario.',
      );
    }
  }
}
