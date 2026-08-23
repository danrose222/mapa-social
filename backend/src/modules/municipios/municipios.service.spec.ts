import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';

import { MunicipiosService } from './municipios.service';
import { Municipio } from './entities/municipio.entity';

describe('MunicipiosService.hasMunicipioForCiudad', () => {
  let service: MunicipiosService;
  let find: jest.Mock;

  beforeEach(async () => {
    find = jest.fn();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MunicipiosService,
        {
          provide: getRepositoryToken(Municipio),
          useValue: { find },
        },
      ],
    }).compile();

    service = module.get(MunicipiosService);
  });

  it('da true cuando la ciudad matchea un municipio registrado', async () => {
    find.mockResolvedValue([{ ciudad: 'Córdoba' } as Municipio]);

    await expect(service.hasMunicipioForCiudad('Córdoba')).resolves.toBe(true);
  });

  it('usa comparación bidireccional (barrio dentro de la ciudad del municipio)', async () => {
    find.mockResolvedValue([{ ciudad: 'Córdoba' } as Municipio]);

    await expect(service.hasMunicipioForCiudad('Nueva Córdoba')).resolves.toBe(true);
  });

  it('da false para un pueblo sin municipio registrado', async () => {
    find.mockResolvedValue([{ ciudad: 'Córdoba' } as Municipio]);

    await expect(service.hasMunicipioForCiudad('La Falda')).resolves.toBe(false);
  });

  it('da false con la tabla de municipios vacía', async () => {
    find.mockResolvedValue([]);

    await expect(service.hasMunicipioForCiudad('Córdoba')).resolves.toBe(false);
  });

  it('da false para una ciudad vacía sin consultar el repositorio', async () => {
    await expect(service.hasMunicipioForCiudad('   ')).resolves.toBe(false);
    expect(find).not.toHaveBeenCalled();
  });
});
