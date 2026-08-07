import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { InjectRepository } from '@nestjs/typeorm';

import { In, Repository } from 'typeorm';

import { Solicitud } from './entities/solicitud.entity';
import { Resource } from '../resources/entities/resource.entity';
import { User } from '../users/entities/user.entity';
import { Category } from '../categories/entities/category.entity';

import { CreateSolicitudDto } from './dto/create-solicitud.dto';
import { CreateSolicitudDirectaDto } from './dto/create-solicitud-directa.dto';
import { DerivarSolicitudDto } from './dto/derivar-solicitud.dto';
import { UpdateSolicitudDto } from './dto/update-solicitud.dto';

interface AuthUser {
  id: number;
  role: string;
}

const ROLES_QUE_PIDEN_SOLICITUD_DIRECTA = ['comunidad', 'ong'];
const ROLES_QUE_RECIBEN_SOLICITUD_DIRECTA = ['moderador', 'ong'];
const ROLES_QUE_RECIBEN_DERIVACION = ['comunidad', 'ong'];

@Injectable()
export class SolicitudesService {
  constructor(
    @InjectRepository(Solicitud)
    private readonly repository: Repository<Solicitud>,

    @InjectRepository(Resource)
    private readonly resourceRepository: Repository<Resource>,

    @InjectRepository(User)
    private readonly userRepository: Repository<User>,

    @InjectRepository(Category)
    private readonly categoryRepository: Repository<Category>,
  ) {}

  async create(userId: number, dto: CreateSolicitudDto) {
    // Quien pide ayuda tiene que dejar alguna forma de que lo contacten: un
    // telefono/email propio, o al menos una direccion para poder visitarlo
    // (por ejemplo, si pidio ayuda desde el celular de otra persona y no
    // tiene un contacto propio y seguro).
    if (!dto.contactInfo?.trim() && !dto.address?.trim()) {
      throw new BadRequestException(
        'Dejanos un teléfono/email de contacto, o al menos una dirección para poder ayudarte',
      );
    }

    const resourceIds = [...new Set(dto.resourceIds)];

    const resources = await this.resourceRepository.find({
      where: { id: In(resourceIds) },
    });

    if (resources.length !== resourceIds.length) {
      throw new NotFoundException('Uno o más recursos no existen');
    }

    if (resources.some((resource) => resource.userId === userId)) {
      throw new ForbiddenException('No podés solicitar tu propio recurso');
    }

    const solicitudes = resources.map((resource) =>
      this.repository.create({
        userId,
        resourceId: resource.id,
        contactName: dto.contactName,
        contactInfo: dto.contactInfo,
        address: dto.address,
        status: 'pendiente',
      }),
    );

    return this.repository.save(solicitudes);
  }

  // Solicitud directa: cubre tres casos.
  // 1) Una comunidad le pide ayuda a un municipio (moderador) u ONG puntual.
  // 2) Una ONG le pide ayuda a otra ONG (si se quedo sin recursos).
  // 3) Un moderador deriva a un tercero que se acerco en persona a la
  //    municipalidad hacia una comunidad u ONG que si tenga el recurso.
  // En los casos 1 y 2 los datos de contacto salen del perfil ya
  // registrado del solicitante, nunca de lo que mande en el body: solo en
  // el caso 3 (moderador derivando a un tercero sin cuenta propia) se usan
  // los datos de contacto que manda el body.
  async createDirecta(userId: number, dto: CreateSolicitudDirectaDto) {
    const requester = await this.userRepository.findOne({
      where: { id: userId },
      relations: ['role'],
    });

    if (!requester) {
      throw new NotFoundException('Usuario inexistente');
    }

    const esModerador = requester.role.name === 'moderador';

    if (!esModerador && !ROLES_QUE_PIDEN_SOLICITUD_DIRECTA.includes(requester.role.name)) {
      throw new ForbiddenException(
        'Solo una comunidad, una ONG o un moderador puede pedir/derivar ayuda directamente',
      );
    }

    // Misma regla que rige needs/resources: una comunidad/ong recien
    // registrada no puede operar (ni siquiera pedir ayuda) hasta que el
    // municipio la apruebe. No aplica al moderador.
    if (!esModerador && !requester.approved) {
      throw new ForbiddenException(
        'Tu organización todavía no fue aprobada por un moderador',
      );
    }

    const target = await this.userRepository.findOne({
      where: { id: dto.targetUserId },
      relations: ['role'],
    });

    if (!target) {
      throw new NotFoundException('El destinatario no existe');
    }

    if (target.id === requester.id) {
      throw new ForbiddenException('No podés pedirte ayuda a vos mismo');
    }

    if (esModerador) {
      // El moderador deriva a un tercero presencial hacia una comunidad u
      // ONG aprobada de su propia jurisdiccion (la que el mismo avalo), no
      // a cualquier organizacion del pais ni a otro municipio.
      if (
        !ROLES_QUE_RECIBEN_DERIVACION.includes(target.role.name) ||
        !target.approved ||
        target.ciudad !== requester.ciudad
      ) {
        throw new NotFoundException(
          'El destino debe ser una comunidad u ONG aprobada de tu jurisdicción',
        );
      }

      if (!dto.contactName?.trim()) {
        throw new BadRequestException(
          'Ingresá el nombre de la persona a la que estás derivando',
        );
      }

      if (!dto.contactInfo?.trim() && !dto.address?.trim()) {
        throw new BadRequestException(
          'Dejá un contacto o una dirección para esa persona',
        );
      }
    } else if (requester.role.name === 'ong') {
      // Una ONG solo le pide ayuda a otra ONG (por ejemplo, si se quedo sin
      // recursos): nunca al municipio, que unicamente la aprueba pero no le
      // brinda ayuda directa.
      if (target.role.name !== 'ong') {
        throw new ForbiddenException(
          'Una ONG solo puede pedirle ayuda directamente a otra ONG',
        );
      }
    } else if (!ROLES_QUE_RECIBEN_SOLICITUD_DIRECTA.includes(target.role.name)) {
      throw new NotFoundException('El destinatario debe ser un municipio o una ONG');
    } else if (
      target.role.name === 'moderador' &&
      target.ciudad !== requester.ciudad
    ) {
      throw new ForbiddenException(
        'Solo le podés pedir ayuda al municipio de tu propia jurisdicción',
      );
    }

    const category = await this.categoryRepository.findOne({
      where: { id: dto.categoryId },
    });

    if (!category) {
      throw new NotFoundException('Categoría inexistente');
    }

    const solicitud = this.repository.create({
      userId,
      targetUserId: target.id,
      categoryId: category.id,
      contactName: esModerador
        ? dto.contactName
        : requester.organizationName ??
          `${requester.firstName} ${requester.lastName}`,
      contactInfo: esModerador ? dto.contactInfo : requester.phone ?? requester.email,
      address: esModerador ? dto.address : undefined,
      status: 'pendiente',
    });

    return this.repository.save(solicitud);
  }

  findMine(userId: number) {
    return this.repository.find({
      where: { userId },
      relations: ['resource', 'target', 'category'],
      order: { id: 'DESC' },
    });
  }

  findReceived(userId: number) {
    return this.repository
      .createQueryBuilder('entity')
      .leftJoinAndSelect('entity.resource', 'resource')
      .leftJoinAndSelect('entity.user', 'user')
      .leftJoinAndSelect('entity.category', 'category')
      .where('resource.userId = :userId', { userId })
      .orWhere('entity.targetUserId = :userId', { userId })
      .orderBy('entity.id', 'DESC')
      .getMany();
  }

  async update(id: number, dto: UpdateSolicitudDto, currentUser: AuthUser) {
    const solicitud = await this.repository.findOne({
      where: { id },
      relations: ['resource'],
    });

    if (!solicitud) {
      throw new NotFoundException('Solicitud inexistente');
    }

    const esDuenioDelRecurso = solicitud.resource?.userId === currentUser.id;
    const esDestinatarioDirecto = solicitud.targetUserId === currentUser.id;
    const isModerator = currentUser.role === 'moderador';

    // Quien ofrece el recurso, o a quien se le pidio ayuda directamente,
    // puede atender/rechazar lo que le piden, sin necesidad de ser
    // moderador: es una moderacion acotada a lo suyo.
    if (!esDuenioDelRecurso && !esDestinatarioDirecto && !isModerator) {
      throw new ForbiddenException(
        'Solo el destinatario de la solicitud o un moderador puede actualizarla',
      );
    }

    solicitud.status = dto.status;

    return this.repository.save(solicitud);
  }

  // Derivar: quien recibio la solicitud (dueño del recurso, o destinatario
  // de un pedido directo) no la puede cubrir, y la redirige a otra
  // comunidad u ong que si podria tener el recurso disponible. Se crea una
  // solicitud nueva a nombre de quien pidio originalmente (mismos datos de
  // contacto), y la original queda marcada como 'derivada'.
  async derivar(id: number, dto: DerivarSolicitudDto, currentUser: AuthUser) {
    const solicitud = await this.repository.findOne({
      where: { id },
      relations: ['resource'],
    });

    if (!solicitud) {
      throw new NotFoundException('Solicitud inexistente');
    }

    const esDuenioDelRecurso = solicitud.resource?.userId === currentUser.id;
    const esDestinatarioDirecto = solicitud.targetUserId === currentUser.id;
    const isModerator = currentUser.role === 'moderador';

    if (!esDuenioDelRecurso && !esDestinatarioDirecto && !isModerator) {
      throw new ForbiddenException(
        'Solo el destinatario de la solicitud o un moderador puede derivarla',
      );
    }

    if (solicitud.status !== 'pendiente') {
      throw new ForbiddenException('Solo se puede derivar una solicitud pendiente');
    }

    let categoryId = solicitud.categoryId;

    if (!categoryId && solicitud.resourceId) {
      const resource = await this.resourceRepository.findOne({
        where: { id: solicitud.resourceId },
      });
      categoryId = resource?.categoryId;
    }

    if (!categoryId) {
      throw new BadRequestException(
        'No se pudo determinar el tipo de ayuda para derivar',
      );
    }

    const nuevoDestino = await this.userRepository.findOne({
      where: { id: dto.targetUserId },
      relations: ['role'],
    });

    if (
      !nuevoDestino ||
      !ROLES_QUE_RECIBEN_DERIVACION.includes(nuevoDestino.role.name) ||
      !nuevoDestino.approved
    ) {
      throw new NotFoundException(
        'El destino debe ser una comunidad u ONG aprobada',
      );
    }

    if (nuevoDestino.id === currentUser.id) {
      throw new ForbiddenException('No te podés derivar una solicitud a vos mismo');
    }

    const nuevaSolicitud = this.repository.create({
      userId: solicitud.userId,
      targetUserId: nuevoDestino.id,
      categoryId,
      contactName: solicitud.contactName,
      contactInfo: solicitud.contactInfo,
      address: solicitud.address,
      status: 'pendiente',
    });

    solicitud.status = 'derivada';
    await this.repository.save(solicitud);

    return this.repository.save(nuevaSolicitud);
  }
}
