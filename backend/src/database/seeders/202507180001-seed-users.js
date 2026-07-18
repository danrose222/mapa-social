const bcrypt = require('bcryptjs');

module.exports = {
  async up(queryInterface) {
    const passwordHash = await bcrypt.hash('Test123!', 10);

    await queryInterface.bulkInsert('users', [
      {
        email: 'test1@test.com',
        password_hash: passwordHash,
        created_at: new Date(),
        updated_at: new Date(),
      },
    ], {});
  },

  async down(queryInterface) {
    await queryInterface.bulkDelete('users', { email: 'test1@test.com' }, {});
  },
};
