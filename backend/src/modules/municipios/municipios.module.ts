import { Module } from '@nestjs/common';

import { TypeOrmModule } from '@nestjs/typeorm';

import { Municipio } from './entities/municipio.entity';

import { MunicipiosController } from './municipios.controller';
import { MunicipiosService } from './municipios.service';

@Module({
  imports: [TypeOrmModule.forFeature([Municipio])],
  controllers: [MunicipiosController],
  providers: [MunicipiosService],
})
export class MunicipiosModule {}
