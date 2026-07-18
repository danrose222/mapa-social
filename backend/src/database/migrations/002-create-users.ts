import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableForeignKey,
} from 'typeorm';

export class CreateUsers1752891000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'users',

        columns: [
          {
            name: 'id',
            type: 'int',
            isGenerated: true,
            generationStrategy: 'increment',
            isPrimary: true,
          },

          {
            name: 'first_name',
            type: 'varchar',
            length: '100',
          },

          {
            name: 'last_name',
            type: 'varchar',
            length: '100',
          },

          {
            name: 'email',
            type: 'varchar',
            length: '150',
            isUnique: true,
          },

          {
            name: 'password',
            type: 'varchar',
            length: '255',
          },

          {
            name: 'phone',
            type: 'varchar',
            length: '30',
            isNullable: true,
          },

          {
            name: 'active',
            type: 'boolean',
            default: true,
          },

          {
            name: 'role_id',
            type: 'int',
          },

          {
            name: 'created_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },

          {
            name: 'updated_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
            onUpdate: 'CURRENT_TIMESTAMP',
          },
        ],
      }),
    );

    await queryRunner.createForeignKey(
      'users',
      new TableForeignKey({
        columnNames: ['role_id'],

        referencedTableName: 'roles',

        referencedColumnNames: ['id'],

        onDelete: 'RESTRICT',

        onUpdate: 'CASCADE',
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('users');

    if (table) {
      const foreignKey = table.foreignKeys.find((fk) =>
        fk.columnNames.includes('role_id'),
      );

      if (foreignKey) {
        await queryRunner.dropForeignKey('users', foreignKey);
      }
    }

    await queryRunner.dropTable('users');
  }
}
