import { MigrationInterface, QueryRunner, Table, TableIndex, TableUnique } from 'typeorm';

export class CreateJobsTable1700000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'jobs',
        columns: [
          {
            name: 'id',
            type: 'integer',
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'increment',
          },
          {
            name: 'title',
            type: 'varchar',
          },
          {
            name: 'company',
            type: 'varchar',
          },
          {
            name: 'location',
            type: 'varchar',
            isNullable: true,
          },
          {
            name: 'salary',
            type: 'varchar',
            isNullable: true,
            default: "'Not mentioned'",
          },
          {
            name: 'url',
            type: 'varchar',
          },
          {
            name: 'source',
            type: 'varchar',
          },
          {
            name: 'tags',
            type: 'varchar',
            isNullable: true,
          },
          {
            name: 'postedAt',
            type: 'varchar',
            isNullable: true,
          },
          {
            name: 'easyApply',
            type: 'boolean',
            default: false,
          },
          {
            name: 'ycBatch',
            type: 'varchar',
            isNullable: true,
          },
          {
            name: 'status',
            type: 'varchar',
            default: "'new'",
          },
          {
            name: 'alerted',
            type: 'boolean',
            default: false,
          },
          {
            name: 'appliedAt',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'createdAt',
            type: 'timestamp',
            default: 'now()',
          },
        ],
      }),
      true,
    );

    await queryRunner.createIndex(
      'jobs',
      new TableIndex({
        name: 'IDX_JOBS_COMPANY',
        columnNames: ['company'],
      }),
    );

    await queryRunner.createUniqueConstraint(
      'jobs',
      new TableUnique({
        name: 'UQ_JOBS_COMPANY_TITLE_SOURCE',
        columnNames: ['company', 'title', 'source'],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('jobs');
  }
}
