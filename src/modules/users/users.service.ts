import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User, UserRole, UserStatus } from './entities/user.entity';
import { RegisterDto } from '../auth/dto/auth.dto';
import * as crypto from 'crypto';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
  ) {}

  async create(createUserDto: RegisterDto): Promise<User> {
    const user = this.usersRepository.create({
      ...createUserDto,
      role: createUserDto.role || UserRole.DEVELOPER,
      status: UserStatus.ACTIVE,
    });

    return this.usersRepository.save(user);
  }

  async findAll(): Promise<User[]> {
    return this.usersRepository.find({
      select: ['id', 'email', 'firstName', 'lastName', 'role', 'status', 'createdAt'],
    });
  }

  async findById(id: string): Promise<User> {
    const user = await this.usersRepository.findOne({ where: { id } });
    
    if (!user) {
      throw new NotFoundException('User not found');
    }
    
    return user;
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.usersRepository.findOne({ where: { email } });
  }

  async findByPasswordResetToken(token: string): Promise<User | null> {
    return this.usersRepository.findOne({ where: { passwordResetToken: token } });
  }

  async update(id: string, updateUserDto: Partial<User>): Promise<User> {
    const user = await this.findById(id);
    
    // Prevent updating sensitive fields
    delete updateUserDto.password;
    delete updateUserDto.emailVerificationToken;
    delete updateUserDto.passwordResetToken;
    delete updateUserDto.passwordResetExpires;
    
    Object.assign(user, updateUserDto);
    return this.usersRepository.save(user);
  }

  async updatePassword(id: string, newPassword: string): Promise<void> {
    const user = await this.findById(id);
    user.password = newPassword;
    await this.usersRepository.save(user);
  }

  async updateLastLogin(id: string): Promise<void> {
    await this.usersRepository.update(id, { lastLoginAt: new Date() });
  }

  async updatePasswordResetToken(
    id: string,
    token: string,
    expires: Date,
  ): Promise<void> {
    await this.usersRepository.update(id, {
      passwordResetToken: token,
      passwordResetExpires: expires,
    });
  }

  async clearPasswordResetToken(id: string): Promise<void> {
    await this.usersRepository.update(id, {
      passwordResetToken: null,
      passwordResetExpires: null,
    });
  }

  async updateEmailVerificationToken(id: string, token: string): Promise<void> {
    await this.usersRepository.update(id, { emailVerificationToken: token });
  }

  async verifyEmail(token: string): Promise<void> {
    const user = await this.usersRepository.findOne({
      where: { emailVerificationToken: token },
    });

    if (!user) {
      throw new BadRequestException('Invalid verification token');
    }

    await this.usersRepository.update(user.id, {
      isEmailVerified: true,
      emailVerificationToken: null,
    });
  }

  async changeStatus(id: string, status: UserStatus): Promise<User> {
    const user = await this.findById(id);
    user.status = status;
    return this.usersRepository.save(user);
  }

  async changeRole(id: string, role: UserRole): Promise<User> {
    const user = await this.findById(id);
    user.role = role;
    return this.usersRepository.save(user);
  }

  async delete(id: string): Promise<void> {
    const user = await this.findById(id);
    await this.usersRepository.remove(user);
  }

  async count(): Promise<number> {
    return this.usersRepository.count();
  }

  async findActiveUsers(): Promise<User[]> {
    return this.usersRepository.find({
      where: { status: UserStatus.ACTIVE },
      select: ['id', 'email', 'firstName', 'lastName', 'role', 'lastLoginAt'],
    });
  }

  async findUsersByRole(role: UserRole): Promise<User[]> {
    return this.usersRepository.find({
      where: { role },
      select: ['id', 'email', 'firstName', 'lastName', 'status', 'createdAt'],
    });
  }

  async generateEmailVerificationToken(email: string): Promise<string> {
    const user = await this.findByEmail(email);
    
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const token = crypto.randomBytes(32).toString('hex');
    await this.updateEmailVerificationToken(user.id, token);
    
    return token;
  }

  async getStats(): Promise<{
    total: number;
    active: number;
    suspended: number;
    pending: number;
    byRole: Record<UserRole, number>;
  }> {
    const [total, active, suspended, pending] = await Promise.all([
      this.count(),
      this.usersRepository.count({ where: { status: UserStatus.ACTIVE } }),
      this.usersRepository.count({ where: { status: UserStatus.SUSPENDED } }),
      this.usersRepository.count({ where: { status: UserStatus.PENDING } }),
    ]);

    const byRole = {
      [UserRole.OWNER]: await this.usersRepository.count({ where: { role: UserRole.OWNER } }),
      [UserRole.DEVELOPER]: await this.usersRepository.count({ where: { role: UserRole.DEVELOPER } }),
      [UserRole.VIEWER]: await this.usersRepository.count({ where: { role: UserRole.VIEWER } }),
    };

    return { total, active, suspended, pending, byRole };
  }
}