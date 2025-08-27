import { DataSource } from 'typeorm';
import { AdminSeeder } from './seeds/admin.seed';
import { DatabaseConfig } from '../common/config/database.config';
import { ConfigService } from '@nestjs/config';

async function seed() {
  const configService = new ConfigService();
  const databaseConfig = new DatabaseConfig(configService);
  
  const dataSource = new DataSource(await databaseConfig.createTypeOrmOptions());

  try {
    await dataSource.initialize();
    console.log('Database connection established');

    // Run seeders
    const adminSeeder = new AdminSeeder(dataSource);
    await adminSeeder.run();

    console.log('Database seeding completed');
  } catch (error) {
    console.error('Error during seeding:', error);
    process.exit(1);
  } finally {
    await dataSource.destroy();
  }
}

seed();