import * as bcrypt from 'bcrypt';

import datasource from '../datasource';
import { QueryRunner } from 'typeorm';

const SEED_PASSWORD = 'seed-password';
// En cualquier ambiente real hay que fijar SEED_MODERATOR_PASSWORD -- este
// valor por default es a propósito débil y público (queda en el repo), solo
// pensado para levantar el stack local con docker-compose.
const MODERATOR_PASSWORD =
  process.env.SEED_MODERATOR_PASSWORD || 'moderador123';
// Contraseña compartida para los vecinos de prueba. Es solo para datos de
// demo/desarrollo — no usar este patrón para usuarios reales.
const CITIZEN_PASSWORD = 'vecino123';

interface CitizenSeed {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  ciudad: string;
}

interface OrganizationSeed {
  id: number;
  name: string;
  description: string;
  contactInfo: string;
  address: string;
  type: string;
  ciudad: string;
  verified: boolean;
}

interface NeedSeed {
  title: string;
  description: string;
  categoryId: number;
  userId: number;
  latitude: number;
  longitude: number;
  locality: string;
  address?: string;
  contactName?: string;
  contactInfo?: string;
  organizationId?: number;
  status: 'active' | 'resolved';
  resolvedBy?: number;
}

interface ResourceSeed {
  title: string;
  description: string;
  categoryId: number;
  userId: number;
  latitude: number;
  longitude: number;
  address?: string;
  schedule?: string;
  contactName?: string;
  contactInfo?: string;
  organizationId?: number;
  status: 'available' | 'resolved';
  resolvedBy?: number;
}

const CITIZENS: CitizenSeed[] = [
  { id: 3, firstName: 'Lucía', lastName: 'Fernández', email: 'lucia.fernandez@example.com', phone: '3511234501', ciudad: 'Córdoba' },
  { id: 4, firstName: 'Martín', lastName: 'Gómez', email: 'martin.gomez@example.com', phone: '3511234502', ciudad: 'Córdoba' },
  { id: 5, firstName: 'Sofía', lastName: 'Ramírez', email: 'sofia.ramirez@example.com', phone: '3511234503', ciudad: 'Córdoba' },
  { id: 6, firstName: 'Nicolás', lastName: 'Torres', email: 'nicolas.torres@example.com', phone: '3511234504', ciudad: 'Córdoba' },
  { id: 7, firstName: 'Valentina', lastName: 'Díaz', email: 'valentina.diaz@example.com', phone: '3511234505', ciudad: 'Villa Allende' },
  { id: 8, firstName: 'Agustín', lastName: 'Molina', email: 'agustin.molina@example.com', phone: '3511234506', ciudad: 'Córdoba' },
  { id: 9, firstName: 'Camila', lastName: 'Ortiz', email: 'camila.ortiz@example.com', phone: '3511234507', ciudad: 'Alta Gracia' },
  { id: 10, firstName: 'Tomás', lastName: 'Herrera', email: 'tomas.herrera@example.com', phone: '3511234508', ciudad: 'Río Segundo' },
];

const ORGANIZATIONS: OrganizationSeed[] = [
  {
    id: 1,
    name: 'Fundación Un Abrazo Solidario',
    description: 'ONG dedicada a asistencia alimentaria y de salud en Río Segundo y alrededores.',
    contactInfo: '(3572) 123-456',
    address: 'Centro Comunitario Río Segundo',
    type: 'ong',
    ciudad: 'Río Segundo',
    verified: true,
  },
  {
    id: 2,
    name: 'Comedor Comunitario San Vicente',
    description: 'Comedor barrial, todavía pendiente de aprobación del municipio.',
    contactInfo: '(351) 555-0199',
    address: 'Barrio San Vicente, Córdoba',
    type: 'comunidad',
    ciudad: 'Córdoba',
    verified: false,
  },
];

// locality -> [lat, lng] aproximado, para desparramar los puntos en el mapa
const LOCALITIES: Record<string, [number, number]> = {
  'Nueva Córdoba': [-31.4297, -64.1888],
  Alberdi: [-31.4106, -64.2039],
  Güemes: [-31.428, -64.181],
  'San Vicente': [-31.398, -64.169],
  'Cerro de las Rosas': [-31.38, -64.227],
  Argüello: [-31.36, -64.247],
  'Villa Allende': [-31.2953, -64.2967],
  'Alta Gracia': [-31.6534, -64.4287],
  'Río Segundo': [-31.6489, -63.8991],
};

const NEEDS: NeedSeed[] = [
  { title: 'Necesita alimentos no perecederos', description: 'Familia de 4 personas, necesita arroz, fideos y aceite para pasar el mes.', categoryId: 2, userId: 3, ...loc('Nueva Córdoba'), contactName: 'Lucía', contactInfo: '3511234501', status: 'active' },
  { title: 'Necesita medicamentos para diabetes', description: 'Busca insulina y tiras reactivas, no puede costear el tratamiento este mes.', categoryId: 3, userId: 4, ...loc('Alberdi'), status: 'active' },
  { title: 'Necesita abrigo de invierno para 3 chicos', description: 'Camperas y botas talles 6, 8 y 10 para el frío que se viene.', categoryId: 4, userId: 5, ...loc('Güemes'), contactName: 'Sofía', contactInfo: 'sofia.ramirez@example.com', status: 'active' },
  { title: 'Necesita ayuda para arreglar el techo', description: 'La lluvia de la semana pasada dejó goteras en dos habitaciones.', categoryId: 5, userId: 6, ...loc('San Vicente'), status: 'active' },
  { title: 'Busca útiles escolares para primaria', description: 'Cuadernos, lápices y una mochila para arrancar las clases.', categoryId: 6, userId: 7, ...loc('Villa Allende'), contactName: 'Valentina', contactInfo: '3511234505', status: 'active' },
  { title: 'Necesita compañía y apoyo para adulto mayor', description: 'Vecino de 78 años que vive solo, busca alguien que lo visite y ayude con las compras.', categoryId: 1, userId: 8, ...loc('Argüello'), status: 'active' },
  { title: 'Familia numerosa necesita alimentos', description: '6 personas en la casa, la changa no alcanza este mes.', categoryId: 2, userId: 9, ...loc('Alta Gracia'), status: 'active' },
  { title: 'Necesita silla de ruedas prestada', description: 'Post operatorio de cadera, la necesita por 2 o 3 meses.', categoryId: 3, userId: 10, ...loc('Río Segundo'), contactName: 'Tomás', contactInfo: '3511234508', status: 'active' },
  { title: 'Busca ropa de abrigo talle grande', description: 'Camperas y buzos talle XL o XXL para el invierno.', categoryId: 4, userId: 3, ...loc('Río Segundo'), status: 'active' },
  { title: 'Necesita ayuda para una mudanza urgente', description: 'Debe dejar la vivienda actual antes de fin de mes, busca manos y una camioneta.', categoryId: 5, userId: 4, ...loc('Nueva Córdoba'), status: 'resolved', resolvedBy: 2 },
  { title: 'Busca clases de apoyo en matemática', description: 'Alumno de 2do año, le está costando mucho la materia.', categoryId: 6, userId: 5, ...loc('Alberdi'), status: 'active' },
  { title: 'Necesita pañales y leche de fórmula', description: 'Bebé de 4 meses, la changa no le está alcanzando este mes.', categoryId: 2, userId: 6, ...loc('Güemes'), contactName: 'Nicolás', contactInfo: '3511234504', status: 'active' },
  { title: 'Necesita medicación para la tensión arterial', description: 'Adulto mayor sin cobertura, tratamiento continuo de hipertensión.', categoryId: 3, userId: 7, ...loc('San Vicente'), status: 'resolved', resolvedBy: 7 },
  { title: 'Busca frazadas para el invierno', description: 'Dos frazadas de una plaza, cualquier estado sirve.', categoryId: 4, userId: 8, ...loc('Cerro de las Rosas'), status: 'active' },
  { title: 'Necesita ayuda para pintar una habitación', description: 'Se le llovió la pieza del fondo, busca pintura y una mano para arreglarla.', categoryId: 5, userId: 9, ...loc('Argüello'), status: 'active' },
  { title: 'Busca una netbook para estudiar', description: 'Cursa el secundario a distancia y no tiene con qué conectarse.', categoryId: 6, userId: 10, ...loc('Villa Allende'), status: 'active' },
  { title: 'Necesita alimento para sus mascotas', description: 'Dos perros grandes, se quedó sin trabajo el mes pasado.', categoryId: 7, userId: 3, ...loc('Alta Gracia'), status: 'active' },
  { title: 'Necesita orientación para un trámite', description: 'No sabe cómo iniciar el trámite de pensión no contributiva.', categoryId: 7, userId: 4, ...loc('Río Segundo'), status: 'resolved', resolvedBy: 2 },
];

const RESOURCES: ResourceSeed[] = [
  { title: 'Banco de alimentos', description: 'Entrega de bolsones de alimentos no perecederos, previa inscripción.', categoryId: 2, userId: 3, ...loc('Río Segundo'), organizationId: 1, schedule: 'Lun a Vie 9:00–17:00', status: 'available' },
  { title: 'Comedor comunitario', description: 'Almuerzo de lunes a sábado para toda la familia.', categoryId: 2, userId: 6, ...loc('San Vicente'), organizationId: 2, schedule: 'Lun a Sáb 12:00–14:00', status: 'available' },
  { title: 'Centro de salud barrial', description: 'Atención primaria gratuita, sin turno previo los martes y jueves.', categoryId: 3, userId: 5, ...loc('Alberdi'), schedule: 'Mar y Jue 8:00–13:00', status: 'available' },
  { title: 'Ropero comunitario', description: 'Ropa de todas las edades, donada y clasificada.', categoryId: 4, userId: 3, ...loc('Nueva Córdoba'), organizationId: 1, schedule: 'Sáb 10:00–13:00', status: 'available' },
  { title: 'Refugio nocturno', description: 'Alojamiento de emergencia para pasar la noche, cupos limitados.', categoryId: 5, userId: 6, ...loc('Güemes'), schedule: 'Todos los días, desde las 20:00', status: 'available' },
  { title: 'Apoyo escolar gratuito', description: 'Ayuda con tareas para primaria y secundaria, dos veces por semana.', categoryId: 6, userId: 3, ...loc('Cerro de las Rosas'), organizationId: 1, schedule: 'Lun y Mié 16:00–18:00', status: 'available' },
  { title: 'Distribución de medicamentos', description: 'Medicamentos de uso común donados, sujeto a disponibilidad.', categoryId: 3, userId: 7, ...loc('Villa Allende'), status: 'available' },
  { title: 'Merendero para niños', description: 'Merienda de lunes a viernes para chicos del barrio.', categoryId: 2, userId: 8, ...loc('Argüello'), schedule: 'Lun a Vie 17:00–18:30', status: 'available' },
  { title: 'Donación de ropa de invierno', description: 'Camperas, buzos y frazadas para retirar.', categoryId: 4, userId: 9, ...loc('Alta Gracia'), status: 'available' },
  { title: 'Cuadrilla de arreglos de vivienda', description: 'Grupo de voluntarios para reparaciones menores de techo y humedad.', categoryId: 5, userId: 3, ...loc('Río Segundo'), organizationId: 1, status: 'available' },
  { title: 'Biblioteca popular', description: 'Préstamo de libros y sala de estudio gratuita.', categoryId: 6, userId: 10, ...loc('San Vicente'), schedule: 'Lun a Vie 14:00–19:00', status: 'available' },
  { title: 'Consultorio psicológico gratuito', description: 'Atención psicológica a la comunidad, con turno previo.', categoryId: 3, userId: 4, ...loc('Nueva Córdoba'), status: 'available' },
  { title: 'Entrega de kits de higiene', description: 'Jabón, pasta dental y elementos básicos de higiene personal.', categoryId: 7, userId: 5, ...loc('Alberdi'), status: 'available' },
  { title: 'Guardería temporal', description: 'Cuidado de niños mientras los padres hacen trámites o changas.', categoryId: 7, userId: 6, ...loc('Güemes'), status: 'resolved', resolvedBy: 2 },
  { title: 'Feria de trueque de ropa', description: 'Intercambio de ropa en buen estado, un sábado al mes.', categoryId: 4, userId: 7, ...loc('Cerro de las Rosas'), status: 'available' },
  { title: 'Taller de oficios', description: 'Capacitación gratuita en electricidad domiciliaria y plomería básica.', categoryId: 6, userId: 8, ...loc('Argüello'), organizationId: 2, status: 'available' },
];

function loc(name: string): { latitude: number; longitude: number; locality: string } {
  const [lat, lng] = LOCALITIES[name];
  return { latitude: lat, longitude: lng, locality: name };
}

async function seedCitizens(queryRunner: QueryRunner): Promise<void> {
  const hashedCitizenPassword = await bcrypt.hash(CITIZEN_PASSWORD, 10);

  for (const citizen of CITIZENS) {
    await queryRunner.query(
      `INSERT IGNORE INTO users (id, first_name, last_name, email, password, phone, active, role_id, ciudad, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, 1, 1, ?, NOW(), NOW())`,
      [citizen.id, citizen.firstName, citizen.lastName, citizen.email, hashedCitizenPassword, citizen.phone, citizen.ciudad],
    );
  }
}

async function seedOrganizations(queryRunner: QueryRunner): Promise<void> {
  for (const org of ORGANIZATIONS) {
    await queryRunner.query(
      `INSERT IGNORE INTO organizations (id, name, description, contact_info, address, type, ciudad, verified, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
      [org.id, org.name, org.description, org.contactInfo, org.address, org.type, org.ciudad, org.verified ? 1 : 0],
    );
  }
}

async function seedNeeds(queryRunner: QueryRunner): Promise<void> {
  for (const need of NEEDS) {
    await queryRunner.query(
      `INSERT INTO needs
         (user_id, category_id, title, description, latitude, longitude, locality, address,
          contact_name, contact_info, organization_id, status, resolved_by, resolved_at,
          created_at, updated_at)
       SELECT ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW()
       FROM DUAL
       WHERE NOT EXISTS (SELECT 1 FROM needs WHERE title = ?)`,
      [
        need.userId,
        need.categoryId,
        need.title,
        need.description,
        need.latitude,
        need.longitude,
        need.locality,
        need.address ?? null,
        need.contactName ?? null,
        need.contactInfo ?? null,
        need.organizationId ?? null,
        need.status,
        need.status === 'resolved' ? need.resolvedBy ?? null : null,
        need.status === 'resolved' ? new Date() : null,
        need.title,
      ],
    );
  }
}

async function seedResources(queryRunner: QueryRunner): Promise<void> {
  for (const resource of RESOURCES) {
    await queryRunner.query(
      `INSERT INTO resources
         (user_id, category_id, title, description, latitude, longitude, address,
          schedule, contact_name, contact_info, organization_id,
          status, resolved_by, resolved_at, created_at, updated_at)
       SELECT ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW()
       FROM DUAL
       WHERE NOT EXISTS (SELECT 1 FROM resources WHERE title = ?)`,
      [
        resource.userId,
        resource.categoryId,
        resource.title,
        resource.description,
        resource.latitude,
        resource.longitude,
        resource.address ?? null,
        resource.schedule ?? null,
        resource.contactName ?? null,
        resource.contactInfo ?? null,
        resource.organizationId ?? null,
        resource.status,
        resource.status === 'resolved' ? resource.resolvedBy ?? null : null,
        resource.status === 'resolved' ? new Date() : null,
        resource.title,
      ],
    );
  }
}

async function seed(): Promise<void> {
  await datasource.initialize();

  const queryRunner = datasource.createQueryRunner();
  await queryRunner.connect();

  try {
    await queryRunner.startTransaction();

    await queryRunner.query(
      `INSERT IGNORE INTO roles (id, name, description, created_at, updated_at) VALUES (1, 'seed-role', 'Seed role', NOW(), NOW())`,
    );

    await queryRunner.query(
      `INSERT IGNORE INTO roles (id, name, description, created_at, updated_at) VALUES (2, 'moderador', 'Moderador de contenido', NOW(), NOW())`,
    );

    const hashedPassword = await bcrypt.hash(SEED_PASSWORD, 10);

    await queryRunner.query(
      `INSERT IGNORE INTO users (id, first_name, last_name, email, password, active, role_id, created_at, updated_at) VALUES (1, 'Seed', 'User', 'seed@example.com', ?, 1, 1, NOW(), NOW())`,
      [hashedPassword],
    );

    const hashedModeratorPassword = await bcrypt.hash(MODERATOR_PASSWORD, 10);

    await queryRunner.query(
      `INSERT IGNORE INTO users (id, first_name, last_name, email, password, active, role_id, created_at, updated_at) VALUES (2, 'Mod', 'Erator', 'moderador@example.com', ?, 1, 2, NOW(), NOW())`,
      [hashedModeratorPassword],
    );

    // Sin esto, el moderador de prueba no puede avalar NINGUNA
    // organización -- assertCityInModeratorScope() rechaza si no tiene
    // ninguna localidad asignada. Le damos dos, para probar el caso de
    // "un moderador con más de una ciudad a cargo".
    await queryRunner.query(
      `INSERT IGNORE INTO moderator_localities (user_id, locality, provincia, created_at) VALUES (2, 'Córdoba', 'Córdoba', NOW())`,
    );
    await queryRunner.query(
      `INSERT IGNORE INTO moderator_localities (user_id, locality, provincia, created_at) VALUES (2, 'Río Segundo', 'Córdoba', NOW())`,
    );

    await queryRunner.query(
      `INSERT IGNORE INTO categories (id, name, description, active, created_at, updated_at) VALUES (1, 'General', 'Sin categoría específica', 1, NOW(), NOW())`,
    );
    await queryRunner.query(
      `INSERT IGNORE INTO categories (id, name, description, active, created_at, updated_at) VALUES (2, 'Alimentos', 'Comida, alimentos no perecederos, comedores', 1, NOW(), NOW())`,
    );
    await queryRunner.query(
      `INSERT IGNORE INTO categories (id, name, description, active, created_at, updated_at) VALUES (3, 'Salud', 'Atención médica, medicamentos, salud mental', 1, NOW(), NOW())`,
    );
    await queryRunner.query(
      `INSERT IGNORE INTO categories (id, name, description, active, created_at, updated_at) VALUES (4, 'Ropa', 'Indumentaria y abrigo', 1, NOW(), NOW())`,
    );
    await queryRunner.query(
      `INSERT IGNORE INTO categories (id, name, description, active, created_at, updated_at) VALUES (5, 'Vivienda', 'Alojamiento, refugio, arreglos de vivienda', 1, NOW(), NOW())`,
    );
    await queryRunner.query(
      `INSERT IGNORE INTO categories (id, name, description, active, created_at, updated_at) VALUES (6, 'Educación', 'Apoyo escolar, útiles, capacitación', 1, NOW(), NOW())`,
    );
    await queryRunner.query(
      `INSERT IGNORE INTO categories (id, name, description, active, created_at, updated_at) VALUES (7, 'Otros', 'Lo que no encaja en las categorías anteriores', 1, NOW(), NOW())`,
    );

    await seedCitizens(queryRunner);
    await seedOrganizations(queryRunner);
    await seedNeeds(queryRunner);
    await seedResources(queryRunner);

    await queryRunner.commitTransaction();

    console.log('Seed ejecutado con éxito.');
  } catch (error) {
    await queryRunner.rollbackTransaction();

    console.error('Error al ejecutar seed:', error);
    process.exitCode = 1;
  } finally {
    await queryRunner.release();
    await datasource.destroy();
  }
}

seed().catch((error) => {
  console.error('Error inesperado en seed:', error);
  process.exit(1);
});
