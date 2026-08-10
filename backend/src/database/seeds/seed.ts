import * as bcrypt from 'bcrypt';

import datasource from '../datasource';

const SEED_PASSWORD = 'seed-password';
const MODERATOR_PASSWORD = 'moderador123';
const ORGANIZATION_PASSWORD = 'organizacion123';

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

    await queryRunner.query(
      `INSERT IGNORE INTO roles (id, name, description, created_at, updated_at) VALUES (3, 'organizacion', 'Organizacion que ofrece recursos', NOW(), NOW())`,
    );

    // Reemplaza al rol generico 'organizacion': se distingue entre comunidad
    // (comedor/club, consume recursos de ONGs y ayuda a personas cercanas)
    // y ong (fundacion que dona/distribuye recursos a comunidades y personas).
    await queryRunner.query(
      `INSERT IGNORE INTO roles (id, name, description, created_at, updated_at) VALUES (4, 'comunidad', 'Comedor, club o centro comunitario', NOW(), NOW())`,
    );
    await queryRunner.query(
      `INSERT IGNORE INTO roles (id, name, description, created_at, updated_at) VALUES (5, 'ong', 'ONG o fundacion que dona recursos', NOW(), NOW())`,
    );

    const hashedPassword = await bcrypt.hash(SEED_PASSWORD, 10);

    await queryRunner.query(
      `INSERT IGNORE INTO users (id, first_name, last_name, email, password, active, approved, role_id, created_at, updated_at) VALUES (1, 'Seed', 'User', 'seed@example.com', ?, 1, 1, 1, NOW(), NOW())`,
      [hashedPassword],
    );

    const hashedModeratorPassword = await bcrypt.hash(MODERATOR_PASSWORD, 10);

    await queryRunner.query(
      `INSERT IGNORE INTO users (id, first_name, last_name, email, password, active, approved, role_id, organization_name, ciudad, latitude, longitude, created_at, updated_at) VALUES (2, 'Mod', 'Erator', 'moderador@example.com', ?, 1, 1, 2, 'Municipalidad de Alta Gracia', 'Alta Gracia', -31.6539, -64.4283, NOW(), NOW())`,
      [hashedModeratorPassword],
    );

    // Un moderador por jurisdiccion: cada municipio administra (aprueba,
    // ve el panel de) las comunidades/ongs de su propia ciudad, y sus
    // recursos solo se ofrecen a esas comunidades, no a otras jurisdicciones.
    const jurisdicciones: Array<{
      id: number;
      ciudad: string;
      email: string;
      lat: number;
      lng: number;
    }> = [
      {
        id: 100,
        ciudad: 'Córdoba Capital',
        email: 'municipio.cordobacapital@example.com',
        lat: -31.4201,
        lng: -64.1888,
      },
      {
        id: 101,
        ciudad: 'La Falda',
        email: 'municipio.lafalda@example.com',
        lat: -31.0903,
        lng: -64.4869,
      },
      {
        id: 102,
        ciudad: 'Villa Carlos Paz',
        email: 'municipio.carlospaz@example.com',
        lat: -31.4241,
        lng: -64.4978,
      },
      {
        id: 103,
        ciudad: 'Río Cuarto',
        email: 'municipio.riocuarto@example.com',
        lat: -33.1232,
        lng: -64.3494,
      },
      {
        id: 104,
        ciudad: 'Villa María',
        email: 'municipio.villamaria@example.com',
        lat: -32.4076,
        lng: -63.2304,
      },
      {
        id: 105,
        ciudad: 'San Francisco',
        email: 'municipio.sanfrancisco@example.com',
        lat: -31.4287,
        lng: -62.0827,
      },
      {
        id: 106,
        ciudad: 'Jesús María',
        email: 'municipio.jesusmaria@example.com',
        lat: -30.9819,
        lng: -64.0954,
      },
      {
        id: 107,
        ciudad: 'Cosquín',
        email: 'municipio.cosquin@example.com',
        lat: -31.2467,
        lng: -64.4656,
      },
    ];

    for (const jurisdiccion of jurisdicciones) {
      await queryRunner.query(
        `INSERT IGNORE INTO users (id, first_name, last_name, email, password, active, approved, role_id, organization_name, ciudad, latitude, longitude, created_at, updated_at) VALUES (?, 'Municipalidad', ?, ?, ?, 1, 1, 2, ?, ?, ?, ?, NOW(), NOW())`,
        [
          jurisdiccion.id,
          jurisdiccion.ciudad,
          jurisdiccion.email,
          hashedModeratorPassword,
          `Municipalidad de ${jurisdiccion.ciudad}`,
          jurisdiccion.ciudad,
          jurisdiccion.lat,
          jurisdiccion.lng,
        ],
      );
    }

    const hashedOrganizationPassword = await bcrypt.hash(
      ORGANIZATION_PASSWORD,
      10,
    );

    await queryRunner.query(
      `INSERT IGNORE INTO users (id, first_name, last_name, email, password, active, approved, role_id, ciudad, created_at, updated_at) VALUES (3, 'Comedor', 'Los Pinos', 'organizacion@example.com', ?, 1, 1, 4, 'Córdoba Capital', NOW(), NOW())`,
      [hashedOrganizationPassword],
    );

    await queryRunner.query(
      `INSERT IGNORE INTO users (id, first_name, last_name, email, password, active, approved, role_id, ciudad, created_at, updated_at) VALUES (4, 'Fundacion', 'Nueva Esperanza', 'pendiente@example.com', ?, 1, 0, 5, 'Córdoba Capital', NOW(), NOW())`,
      [hashedOrganizationPassword],
    );

    await queryRunner.query(
      `INSERT IGNORE INTO users (id, first_name, last_name, email, password, active, approved, role_id, ciudad, created_at, updated_at) VALUES (5, 'Fundacion', 'Semillita', 'fundacion.semillita@example.com', ?, 1, 1, 5, 'Córdoba Capital', NOW(), NOW())`,
      [hashedOrganizationPassword],
    );

    await queryRunner.query(
      `INSERT IGNORE INTO users (id, first_name, last_name, email, password, active, approved, role_id, ciudad, created_at, updated_at) VALUES (6, 'Comedor', 'Manitos Unidas', 'comedor.manitosunidas@example.com', ?, 1, 1, 4, 'Córdoba Capital', NOW(), NOW())`,
      [hashedOrganizationPassword],
    );

    await queryRunner.query(
      `INSERT IGNORE INTO users (id, first_name, last_name, email, password, active, approved, role_id, created_at, updated_at) VALUES (7, 'Carlos', 'Gomez', 'carlos.gomez@example.com', ?, 1, 1, 1, NOW(), NOW())`,
      [hashedPassword],
    );

    // Datos de prueba a lo largo de la provincia de Cordoba (no solo
    // capital): cada comunidad y cada ONG tiene su propio login, para poder
    // demostrar cada rol por separado sin reutilizar una misma cuenta.
    await queryRunner.query(
      `INSERT IGNORE INTO users (id, first_name, last_name, email, password, active, approved, role_id, ciudad, created_at, updated_at) VALUES (8, 'Comedor', 'Manos de La Falda', 'comedor.lafalda@example.com', ?, 1, 1, 4, 'La Falda', NOW(), NOW())`,
      [hashedOrganizationPassword],
    );
    await queryRunner.query(
      `INSERT IGNORE INTO users (id, first_name, last_name, email, password, active, approved, role_id, ciudad, created_at, updated_at) VALUES (9, 'Fundacion', 'Sierras Solidarias', 'ong.carlospaz@example.com', ?, 1, 1, 5, 'Villa Carlos Paz', NOW(), NOW())`,
      [hashedOrganizationPassword],
    );
    await queryRunner.query(
      `INSERT IGNORE INTO users (id, first_name, last_name, email, password, active, approved, role_id, ciudad, created_at, updated_at) VALUES (10, 'Club', 'Amigos de Alta Gracia', 'club.altagracia@example.com', ?, 1, 1, 4, 'Alta Gracia', NOW(), NOW())`,
      [hashedOrganizationPassword],
    );
    await queryRunner.query(
      `INSERT IGNORE INTO users (id, first_name, last_name, email, password, active, approved, role_id, ciudad, created_at, updated_at) VALUES (11, 'Fundacion', 'Sur Solidario', 'ong.riocuarto@example.com', ?, 1, 1, 5, 'Río Cuarto', NOW(), NOW())`,
      [hashedOrganizationPassword],
    );
    // Este comedor queda en estado critico a proposito, para ver el foco
    // rojo en el panel del municipio.
    await queryRunner.query(
      `INSERT IGNORE INTO users (id, first_name, last_name, email, password, active, approved, estado_ayuda, role_id, ciudad, created_at, updated_at) VALUES (12, 'Comedor', 'Corazon Villamariense', 'comedor.villamaria@example.com', ?, 1, 1, 'critico', 4, 'Villa María', NOW(), NOW())`,
      [hashedOrganizationPassword],
    );
    await queryRunner.query(
      `INSERT IGNORE INTO users (id, first_name, last_name, email, password, active, approved, role_id, ciudad, created_at, updated_at) VALUES (13, 'Fundacion', 'Nueva Vida San Francisco', 'ong.sanfrancisco@example.com', ?, 1, 1, 5, 'San Francisco', NOW(), NOW())`,
      [hashedOrganizationPassword],
    );
    await queryRunner.query(
      `INSERT IGNORE INTO users (id, first_name, last_name, email, password, active, approved, role_id, ciudad, created_at, updated_at) VALUES (14, 'Centro Comunitario', 'Jesus Maria Solidaria', 'centro.jesusmaria@example.com', ?, 1, 1, 4, 'Jesús María', NOW(), NOW())`,
      [hashedOrganizationPassword],
    );
    await queryRunner.query(
      `INSERT IGNORE INTO users (id, first_name, last_name, email, password, active, approved, role_id, ciudad, created_at, updated_at) VALUES (15, 'Fundacion', 'Valle Solidario', 'ong.cosquin@example.com', ?, 1, 1, 5, 'Cosquín', NOW(), NOW())`,
      [hashedOrganizationPassword],
    );

    // Ciudadanos con necesidades en otras localidades de la provincia.
    await queryRunner.query(
      `INSERT IGNORE INTO users (id, first_name, last_name, email, password, active, approved, role_id, created_at, updated_at) VALUES (16, 'Rosa', 'Aguirre', 'rosa.aguirre@example.com', ?, 1, 1, 1, NOW(), NOW())`,
      [hashedPassword],
    );
    await queryRunner.query(
      `INSERT IGNORE INTO users (id, first_name, last_name, email, password, active, approved, role_id, created_at, updated_at) VALUES (17, 'Julian', 'Peralta', 'julian.peralta@example.com', ?, 1, 1, 1, NOW(), NOW())`,
      [hashedPassword],
    );
    await queryRunner.query(
      `INSERT IGNORE INTO users (id, first_name, last_name, email, password, active, approved, role_id, created_at, updated_at) VALUES (18, 'Nora', 'Ibanez', 'nora.ibanez@example.com', ?, 1, 1, 1, NOW(), NOW())`,
      [hashedPassword],
    );

    // Las categorias tienen que coincidir con las que ya estan hardcodeadas
    // en los formularios del frontend (necesidad-form / recurso-form).
    await queryRunner.query(
      `INSERT IGNORE INTO categories (id, name, description, active, created_at, updated_at) VALUES (1, 'Salud', 'Atencion medica y salud', 1, NOW(), NOW())`,
    );
    await queryRunner.query(
      `INSERT IGNORE INTO categories (id, name, description, active, created_at, updated_at) VALUES (2, 'Educacion', 'Apoyo escolar y educativo', 1, NOW(), NOW())`,
    );
    await queryRunner.query(
      `INSERT IGNORE INTO categories (id, name, description, active, created_at, updated_at) VALUES (3, 'Alimentos', 'Alimentos y comedores', 1, NOW(), NOW())`,
    );
    await queryRunner.query(
      `INSERT IGNORE INTO categories (id, name, description, active, created_at, updated_at) VALUES (4, 'Empleo', 'Empleo y capacitacion laboral', 1, NOW(), NOW())`,
    );
    await queryRunner.query(
      `INSERT IGNORE INTO categories (id, name, description, active, created_at, updated_at) VALUES (5, 'Vivienda', 'Vivienda y habitacional', 1, NOW(), NOW())`,
    );
    await queryRunner.query(
      `INSERT IGNORE INTO categories (id, name, description, active, created_at, updated_at) VALUES (6, 'Asistencia comunitaria', 'Ropa, abrigo y asistencia general', 1, NOW(), NOW())`,
    );

    await queryRunner.query(
      `INSERT INTO needs (user_id, category_id, title, description, latitude, longitude, status, created_at, updated_at)
       SELECT 1, 6, 'Necesidad muestra', 'Necesitamos voluntarios en la comunidad', -31.4201, -64.1888, 'active', NOW(), NOW()
       FROM DUAL
       WHERE NOT EXISTS (SELECT 1 FROM needs WHERE title = 'Necesidad muestra')`,
    );

    await queryRunner.query(
      `INSERT INTO resources (user_id, category_id, title, description, latitude, longitude, status, created_at, updated_at)
       SELECT 3, 3, 'Recurso muestra', 'Banco de alimentos disponible', -31.417, -64.185, 'available', NOW(), NOW()
       FROM DUAL
       WHERE NOT EXISTS (SELECT 1 FROM resources WHERE title = 'Recurso muestra')`,
    );

    // Fundacion Semillita (organizacion aprobada) ofrece recursos variados.
    await queryRunner.query(
      `INSERT INTO resources (user_id, category_id, title, description, latitude, longitude, address, organization_name, schedule, contact_info, status, created_at, updated_at)
       SELECT 5, 3, 'Alimentos no perecederos', 'Entregamos bolsones de alimentos no perecederos a familias de la zona.', -31.4135, -64.1811, 'Bv. San Juan 450', 'Fundacion Semillita', 'Lunes a viernes de 9 a 13', 'contacto@semillita.org', 'available', NOW(), NOW()
       FROM DUAL
       WHERE NOT EXISTS (SELECT 1 FROM resources WHERE title = 'Alimentos no perecederos')`,
    );

    await queryRunner.query(
      `INSERT INTO resources (user_id, category_id, title, description, latitude, longitude, address, organization_name, schedule, contact_info, status, created_at, updated_at)
       SELECT 5, 6, 'Ropa de abrigo', 'Donacion de ropa de abrigo en buen estado para adultos y ninos.', -31.4135, -64.1811, 'Bv. San Juan 450', 'Fundacion Semillita', 'Lunes a viernes de 9 a 13', 'contacto@semillita.org', 'available', NOW(), NOW()
       FROM DUAL
       WHERE NOT EXISTS (SELECT 1 FROM resources WHERE title = 'Ropa de abrigo')`,
    );

    // Comedor Manitos Unidas (organizacion aprobada) tambien puede reportar
    // una necesidad propia, no solo ofrecer recursos.
    await queryRunner.query(
      `INSERT INTO needs (user_id, category_id, title, description, latitude, longitude, address, contact_name, contact_info, status, created_at, updated_at)
       SELECT 6, 3, 'Necesitamos alimentos para el comedor', 'El comedor Manitos Unidas necesita donaciones de alimentos para seguir cubriendo las meriendas diarias.', -31.4298, -64.1946, 'Barrio Alto Alberdi', 'Comedor Manitos Unidas', 'comedor.manitosunidas@example.com', 'active', NOW(), NOW()
       FROM DUAL
       WHERE NOT EXISTS (SELECT 1 FROM needs WHERE title = 'Necesitamos alimentos para el comedor')`,
    );

    // Carlos Gomez (ciudadano en situacion de calle) reporta sus necesidades.
    await queryRunner.query(
      `INSERT INTO needs (user_id, category_id, title, description, latitude, longitude, contact_name, contact_info, status, created_at, updated_at)
       SELECT 7, 5, 'Necesito ayuda habitacional urgente', 'Estoy en situacion de calle y necesito un lugar donde alojarme, especialmente de noche. Se me puede encontrar en la plaza San Martin.', -31.4241, -64.1888, 'Carlos Gomez', '351-6547890', 'active', NOW(), NOW()
       FROM DUAL
       WHERE NOT EXISTS (SELECT 1 FROM needs WHERE title = 'Necesito ayuda habitacional urgente')`,
    );

    await queryRunner.query(
      `INSERT INTO needs (user_id, category_id, title, description, latitude, longitude, contact_name, contact_info, status, created_at, updated_at)
       SELECT 7, 1, 'Necesito atencion medica', 'Necesito atencion de salud, tengo una herida en la pierna que no cicatriza bien. Se me puede encontrar en la plaza San Martin.', -31.4241, -64.1888, 'Carlos Gomez', '351-6547890', 'active', NOW(), NOW()
       FROM DUAL
       WHERE NOT EXISTS (SELECT 1 FROM needs WHERE title = 'Necesito atencion medica')`,
    );

    // --- Recursos y necesidades a lo largo de la provincia de Cordoba ---

    // La Falda (comunidad)
    await queryRunner.query(
      `INSERT INTO resources (user_id, category_id, title, description, latitude, longitude, address, organization_name, schedule, contact_info, status, created_at, updated_at)
       SELECT 8, 3, 'Viandas calientes La Falda', 'Entregamos viandas calientes de lunes a sabado para familias de la zona.', -31.0903, -64.4869, 'Av. Edén 200, La Falda', 'Comedor Manos de La Falda', 'Lunes a sabado de 12 a 14', 'comedor.lafalda@example.com', 'available', NOW(), NOW()
       FROM DUAL
       WHERE NOT EXISTS (SELECT 1 FROM resources WHERE title = 'Viandas calientes La Falda')`,
    );

    // Villa Carlos Paz (ONG)
    await queryRunner.query(
      `INSERT INTO resources (user_id, category_id, title, description, latitude, longitude, address, organization_name, schedule, contact_info, status, created_at, updated_at)
       SELECT 9, 5, 'Refugio temporal Carlos Paz', 'Alojamiento transitorio para personas en situacion de calle durante el invierno.', -31.4241, -64.4978, 'San Martin 800, Villa Carlos Paz', 'Fundacion Sierras Solidarias', 'Todos los dias, 24hs', 'ong.carlospaz@example.com', 'available', NOW(), NOW()
       FROM DUAL
       WHERE NOT EXISTS (SELECT 1 FROM resources WHERE title = 'Refugio temporal Carlos Paz')`,
    );
    await queryRunner.query(
      `INSERT INTO resources (user_id, category_id, title, description, latitude, longitude, address, organization_name, schedule, contact_info, status, created_at, updated_at)
       SELECT 9, 1, 'Control de salud gratuito', 'Controles medicos basicos y derivacion a centros de salud.', -31.4255, -64.5005, 'San Martin 800, Villa Carlos Paz', 'Fundacion Sierras Solidarias', 'Martes y jueves de 9 a 12', 'ong.carlospaz@example.com', 'available', NOW(), NOW()
       FROM DUAL
       WHERE NOT EXISTS (SELECT 1 FROM resources WHERE title = 'Control de salud gratuito')`,
    );

    // Alta Gracia (comunidad): ofrece ropa, pero tambien necesita alimentos
    // (para mostrar que una comunidad tambien le puede pedir a una ONG).
    await queryRunner.query(
      `INSERT INTO resources (user_id, category_id, title, description, latitude, longitude, address, organization_name, schedule, contact_info, status, created_at, updated_at)
       SELECT 10, 6, 'Ropa de invierno Alta Gracia', 'Campera, mantas y calzado de abrigo en buen estado.', -31.6539, -64.4283, 'Av. Belgrano 150, Alta Gracia', 'Club Amigos de Alta Gracia', 'Sabados de 10 a 13', 'club.altagracia@example.com', 'available', NOW(), NOW()
       FROM DUAL
       WHERE NOT EXISTS (SELECT 1 FROM resources WHERE title = 'Ropa de invierno Alta Gracia')`,
    );
    await queryRunner.query(
      `INSERT INTO needs (user_id, category_id, title, description, latitude, longitude, address, contact_name, contact_info, status, created_at, updated_at)
       SELECT 10, 3, 'Necesitamos alimentos para el club', 'El club recibe cada vez mas familias y se nos acaban los alimentos no perecederos.', -31.6539, -64.4283, 'Av. Belgrano 150, Alta Gracia', 'Club Amigos de Alta Gracia', 'club.altagracia@example.com', 'active', NOW(), NOW()
       FROM DUAL
       WHERE NOT EXISTS (SELECT 1 FROM needs WHERE title = 'Necesitamos alimentos para el club')`,
    );

    // Rio Cuarto (ONG)
    await queryRunner.query(
      `INSERT INTO resources (user_id, category_id, title, description, latitude, longitude, address, organization_name, schedule, contact_info, status, created_at, updated_at)
       SELECT 11, 4, 'Capacitacion laboral gratuita', 'Cursos cortos de oficios con salida laboral y bolsa de trabajo.', -33.1232, -64.3494, 'Constitucion 950, Rio Cuarto', 'Fundacion Sur Solidario', 'Lunes a viernes de 8 a 12', 'ong.riocuarto@example.com', 'available', NOW(), NOW()
       FROM DUAL
       WHERE NOT EXISTS (SELECT 1 FROM resources WHERE title = 'Capacitacion laboral gratuita')`,
    );
    await queryRunner.query(
      `INSERT INTO resources (user_id, category_id, title, description, latitude, longitude, address, organization_name, schedule, contact_info, status, created_at, updated_at)
       SELECT 11, 2, 'Apoyo escolar Rio Cuarto', 'Acompañamiento escolar para chicos de primaria y secundaria.', -33.121, -64.352, 'Constitucion 950, Rio Cuarto', 'Fundacion Sur Solidario', 'Lunes a viernes de 14 a 17', 'ong.riocuarto@example.com', 'available', NOW(), NOW()
       FROM DUAL
       WHERE NOT EXISTS (SELECT 1 FROM resources WHERE title = 'Apoyo escolar Rio Cuarto')`,
    );

    // Villa Maria (comunidad en estado critico): mas necesidad que oferta.
    await queryRunner.query(
      `INSERT INTO needs (user_id, category_id, title, description, latitude, longitude, address, contact_name, contact_info, status, created_at, updated_at)
       SELECT 12, 3, 'Necesitamos alimentos con urgencia', 'Se nos acabaron las donaciones y tenemos mas de 80 familias anotadas para esta semana.', -32.4076, -63.2304, 'Bv. Sarmiento 300, Villa Maria', 'Comedor Corazon Villamariense', 'comedor.villamaria@example.com', 'active', NOW(), NOW()
       FROM DUAL
       WHERE NOT EXISTS (SELECT 1 FROM needs WHERE title = 'Necesitamos alimentos con urgencia')`,
    );

    // San Francisco (ONG)
    await queryRunner.query(
      `INSERT INTO resources (user_id, category_id, title, description, latitude, longitude, address, organization_name, schedule, contact_info, status, created_at, updated_at)
       SELECT 13, 1, 'Atencion medica comunitaria', 'Consultas medicas gratuitas y entrega de medicamentos basicos.', -31.4287, -62.0827, 'Iturraspe 400, San Francisco', 'Fundacion Nueva Vida San Francisco', 'Miercoles de 9 a 13', 'ong.sanfrancisco@example.com', 'available', NOW(), NOW()
       FROM DUAL
       WHERE NOT EXISTS (SELECT 1 FROM resources WHERE title = 'Atencion medica comunitaria')`,
    );

    // Jesus Maria (comunidad)
    await queryRunner.query(
      `INSERT INTO resources (user_id, category_id, title, description, latitude, longitude, address, organization_name, schedule, contact_info, status, created_at, updated_at)
       SELECT 14, 2, 'Apoyo escolar para chicos', 'Espacio de tareas y lectura para chicos del barrio.', -30.9819, -64.0954, 'Colon 250, Jesus Maria', 'Centro Comunitario Jesus Maria Solidaria', 'Lunes a viernes de 15 a 18', 'centro.jesusmaria@example.com', 'available', NOW(), NOW()
       FROM DUAL
       WHERE NOT EXISTS (SELECT 1 FROM resources WHERE title = 'Apoyo escolar para chicos')`,
    );

    // Cosquin (ONG)
    await queryRunner.query(
      `INSERT INTO resources (user_id, category_id, title, description, latitude, longitude, address, organization_name, schedule, contact_info, status, created_at, updated_at)
       SELECT 15, 3, 'Bolsones de alimentos Valle de Punilla', 'Distribucion mensual de bolsones de alimentos para familias del valle.', -31.2467, -64.4656, 'San Martin 600, Cosquin', 'Fundacion Valle Solidario', 'Primer sabado de cada mes', 'ong.cosquin@example.com', 'available', NOW(), NOW()
       FROM DUAL
       WHERE NOT EXISTS (SELECT 1 FROM resources WHERE title = 'Bolsones de alimentos Valle de Punilla')`,
    );
    await queryRunner.query(
      `INSERT INTO resources (user_id, category_id, title, description, latitude, longitude, address, organization_name, schedule, contact_info, status, created_at, updated_at)
       SELECT 15, 6, 'Ropa y abrigo Valle de Punilla', 'Ropa de abrigo para toda la familia, donada y en buen estado.', -31.248, -64.463, 'San Martin 600, Cosquin', 'Fundacion Valle Solidario', 'Primer sabado de cada mes', 'ong.cosquin@example.com', 'available', NOW(), NOW()
       FROM DUAL
       WHERE NOT EXISTS (SELECT 1 FROM resources WHERE title = 'Ropa y abrigo Valle de Punilla')`,
    );

    // Ciudadanos con necesidades en distintas localidades de la provincia.
    await queryRunner.query(
      `INSERT INTO needs (user_id, category_id, title, description, latitude, longitude, contact_name, contact_info, status, created_at, updated_at)
       SELECT 16, 5, 'Necesito ayuda con la vivienda', 'Se me vencio el alquiler y no consigo un lugar accesible en La Falda.', -31.0925, -64.4845, 'Rosa Aguirre', 'rosa.aguirre@example.com', 'active', NOW(), NOW()
       FROM DUAL
       WHERE NOT EXISTS (SELECT 1 FROM needs WHERE title = 'Necesito ayuda con la vivienda')`,
    );
    await queryRunner.query(
      `INSERT INTO needs (user_id, category_id, title, description, latitude, longitude, contact_name, contact_info, status, created_at, updated_at)
       SELECT 17, 1, 'Necesito atencion medica en Villa Maria', 'Necesito un control porque no tengo obra social ni cobertura.', -32.41, -63.228, 'Julian Peralta', 'julian.peralta@example.com', 'active', NOW(), NOW()
       FROM DUAL
       WHERE NOT EXISTS (SELECT 1 FROM needs WHERE title = 'Necesito atencion medica en Villa Maria')`,
    );
    await queryRunner.query(
      `INSERT INTO needs (user_id, category_id, title, description, latitude, longitude, contact_name, contact_info, status, created_at, updated_at)
       SELECT 18, 4, 'Busco trabajo o capacitacion', 'Estoy sin trabajo hace tres meses y quiero capacitarme en algun oficio.', -33.125, -64.347, 'Nora Ibanez', 'nora.ibanez@example.com', 'active', NOW(), NOW()
       FROM DUAL
       WHERE NOT EXISTS (SELECT 1 FROM needs WHERE title = 'Busco trabajo o capacitacion')`,
    );

    // Comedor Manitos Unidas tambien ofrece, no solo necesita (ademas de la
    // necesidad ya cargada mas arriba): sirve viandas con lo que sí tiene.
    await queryRunner.query(
      `INSERT INTO resources (user_id, category_id, title, description, latitude, longitude, address, organization_name, schedule, contact_info, status, created_at, updated_at)
       SELECT 6, 3, 'Viandas y meriendas Manitos Unidas', 'Servimos viandas calientes y meriendas a familias del barrio con lo que tenemos disponible.', -31.4298, -64.1946, 'Barrio Alto Alberdi', 'Comedor Manitos Unidas', 'Lunes a viernes de 12 a 15', 'comedor.manitosunidas@example.com', 'available', NOW(), NOW()
       FROM DUAL
       WHERE NOT EXISTS (SELECT 1 FROM resources WHERE title = 'Viandas y meriendas Manitos Unidas')`,
    );

    await queryRunner.commitTransaction();

    // eslint-disable-next-line no-console
    console.log('Seed ejecutado con éxito.');
  } catch (error) {
    await queryRunner.rollbackTransaction();
    // eslint-disable-next-line no-console
    console.error('Error al ejecutar seed:', error);
    process.exitCode = 1;
  } finally {
    await queryRunner.release();
    await datasource.destroy();
  }
}

seed().catch((error) => {
  // eslint-disable-next-line no-console
  console.error('Error inesperado en seed:', error);
  process.exit(1);
});
