import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { randomUUID } from 'crypto';
import { basename, extname, join } from 'path';
import { existsSync, mkdirSync, unlinkSync } from 'fs';

import { ApiBearerAuth, ApiConsumes, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { DeleteImageDto } from './dto/delete-image.dto';

// Directorio de almacenamiento local. Para un volumen mayor de uso real
// convendría moverlo a un storage externo (S3 o similar); para el alcance
// actual del proyecto, disco local + servido estático alcanza.
export const UPLOADS_DIR = join(process.cwd(), 'uploads');

if (!existsSync(UPLOADS_DIR)) {
  mkdirSync(UPLOADS_DIR, { recursive: true });
}

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5MB

@ApiTags('Uploads')
@Controller('uploads')
export class UploadsController {
  @Post('image')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    summary:
      'Sube una imagen y devuelve su URL. Esa URL se usa luego en el campo imageUrl al crear/editar una necesidad o recurso.',
  })
  @ApiResponse({ status: 201, description: 'Imagen subida' })
  @ApiResponse({ status: 400, description: 'Archivo inválido (tipo o tamaño)' })
  @ApiResponse({ status: 401, description: 'No autenticado' })
  @UseInterceptors(
    FileInterceptor('image', {
      storage: diskStorage({
        destination: UPLOADS_DIR,
        filename: (_req, file, callback) => {
          const uniqueName = `${randomUUID()}${extname(file.originalname).toLowerCase()}`;
          callback(null, uniqueName);
        },
      }),
      limits: { fileSize: MAX_FILE_SIZE_BYTES },
      fileFilter: (_req, file, callback) => {
        if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
          callback(
            new BadRequestException(
              'Formato de imagen no soportado. Usá JPG, PNG, WEBP o GIF.',
            ),
            false,
          );
          return;
        }
        callback(null, true);
      },
    }),
  )
  uploadImage(@UploadedFile() file?: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('No se recibió ningún archivo');
    }

    return { url: `/api/uploads/${file.filename}` };
  }

  @Delete('image')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary:
      'Borra una imagen subida que no se llegó a usar (ej: se subió pero la publicación falló). Idempotente: si el archivo ya no existe, no falla.',
  })
  @ApiResponse({ status: 200, description: 'Borrada (o ya no existía)' })
  @ApiResponse({ status: 400, description: 'URL inválida' })
  @ApiResponse({ status: 401, description: 'No autenticado' })
  deleteImage(@Body() dto: DeleteImageDto) {
    // basename() descarta cualquier segmento de carpeta ('../', '/etc/...'),
    // así que aunque nos manden una URL manipulada, solo puede apuntar a
    // un archivo dentro de UPLOADS_DIR -- nunca fuera de esa carpeta.
    const filename = basename(dto.url);
    const filePath = join(UPLOADS_DIR, filename);

    if (existsSync(filePath)) {
      unlinkSync(filePath);
    }

    return { deleted: true };
  }
}
