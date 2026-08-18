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
import { extname } from 'path';

import { ApiBearerAuth, ApiConsumes, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { DeleteImageDto } from './dto/delete-image.dto';
import { UploadsService, UPLOADS_DIR } from './uploads.service';

interface AuthUser {
  id: number;
  role: string;
}

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5MB

@ApiTags('Uploads')
@Controller('uploads')
export class UploadsController {
  constructor(private readonly service: UploadsService) {}

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
      'Borra una imagen subida. Si está asociada a una necesidad/recurso, solo su dueño o un moderador/admin puede borrarla; si quedó huérfana (subida pero nunca usada), cualquier usuario autenticado puede. Idempotente: si el archivo ya no existe, no falla.',
  })
  @ApiResponse({ status: 200, description: 'Borrada (o ya no existía)' })
  @ApiResponse({ status: 400, description: 'URL inválida' })
  @ApiResponse({ status: 401, description: 'No autenticado' })
  @ApiResponse({
    status: 403,
    description: 'La imagen pertenece a una publicación de otro usuario',
  })
  deleteImage(@Body() dto: DeleteImageDto, @CurrentUser() user: AuthUser) {
    return this.service.deleteImage(dto, user);
  }
}
