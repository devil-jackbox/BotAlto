import { DataSource } from 'typeorm';
import { User, UserRole, UserStatus } from '../../modules/users/entities/user.entity';
import * as bcrypt from 'bcryptjs';

export class AdminSeeder {
  constructor(private dataSource: DataSource) {}

  async run() {
    const userRepository = this.dataSource.getRepository(User);

    // Check if admin user already exists
    const existingAdmin = await userRepository.findOne({
      where: { email: 'admin@botalto.com' }
    });

    if (existingAdmin) {
      console.log('Admin user already exists, skipping...');
      return;
    }

    // Create admin user
    const adminUser = new User();
    adminUser.email = 'admin@botalto.com';
    adminUser.firstName = 'Admin';
    adminUser.lastName = 'User';
    adminUser.password = await bcrypt.hash('admin123', 12);
    adminUser.role = UserRole.OWNER;
    adminUser.status = UserStatus.ACTIVE;
    adminUser.isEmailVerified = true;

    await userRepository.save(adminUser);
    console.log('Admin user created successfully');
  }
}