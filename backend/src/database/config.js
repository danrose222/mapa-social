require('dotenv').config();

module.exports = {
  development: {
    username: process.env.DB_USER || 'mapa_user',
    password: process.env.DB_PASS || 'mapa_password',
    database: process.env.DB_NAME || 'mapa_social',
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    dialect: 'mysql',
    logging: false,
  },
  test: {
    username: process.env.DB_USER || 'mapa_user',
    password: process.env.DB_PASS || 'mapa_password',
    database: process.env.DB_NAME || 'mapa_social',
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    dialect: 'mysql',
    logging: false,
  },
  production: {
    username: process.env.DB_USER || 'mapa_user',
    password: process.env.DB_PASS || 'mapa_password',
    database: process.env.DB_NAME || 'mapa_social',
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    dialect: 'mysql',
    logging: false,
  },
};
