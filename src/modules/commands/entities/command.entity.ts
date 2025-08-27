import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Bot } from '../../bots/entities/bot.entity';
import { User } from '../../users/entities/user.entity';

export enum CommandType {
  TEXT = 'text',
  CALLBACK = 'callback',
  INLINE = 'inline',
  MIDDLEWARE = 'middleware',
}

export enum CommandStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  DRAFT = 'draft',
}

@Entity('commands')
export class Command {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ nullable: true })
  description?: string;

  @Column({
    type: 'enum',
    enum: CommandType,
    default: CommandType.TEXT,
  })
  type: CommandType;

  @Column({
    type: 'enum',
    enum: CommandStatus,
    default: CommandStatus.ACTIVE,
  })
  status: CommandStatus;

  @Column({ type: 'text' })
  code: string;

  @Column({ type: 'jsonb', nullable: true })
  parameters: {
    description?: string;
    required?: boolean;
    type?: string;
    default?: any;
  }[];

  @Column({ type: 'jsonb', nullable: true })
  permissions: {
    roles?: string[];
    users?: string[];
    groups?: string[];
  };

  @Column({ type: 'jsonb', nullable: true })
  metadata: {
    version?: string;
    tags?: string[];
    category?: string;
    examples?: string[];
    documentation?: string;
  };

  @Column({ type: 'jsonb', nullable: true })
  stats: {
    executions?: number;
    lastExecuted?: Date;
    averageExecutionTime?: number;
    successRate?: number;
    errorCount?: number;
  };

  @Column({ type: 'jsonb', nullable: true })
  schedule: {
    enabled?: boolean;
    cron?: string;
    timezone?: string;
    lastRun?: Date;
    nextRun?: Date;
  };

  @Column({ default: false })
  isSystem: boolean;

  @Column({ default: 0 })
  priority: number;

  @Column({ type: 'text', nullable: true })
  errorMessage?: string;

  @Column({ nullable: true })
  lastErrorAt?: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Relationships
  @ManyToOne(() => Bot, (bot) => bot.commands)
  @JoinColumn({ name: 'botId' })
  bot: Bot;

  @Column()
  botId: string;

  @ManyToOne(() => User, (user) => user.commands)
  @JoinColumn({ name: 'createdById' })
  createdBy: User;

  @Column()
  createdById: string;

  // Methods
  isActive(): boolean {
    return this.status === CommandStatus.ACTIVE;
  }

  isSystemCommand(): boolean {
    return this.isSystem;
  }

  hasSchedule(): boolean {
    return this.schedule?.enabled && this.schedule?.cron;
  }

  getFullName(): string {
    return this.type === CommandType.TEXT ? `/${this.name}` : this.name;
  }

  canExecute(user: User): boolean {
    if (this.isSystem) return true;
    
    if (!this.permissions) return true;
    
    if (this.permissions.roles && this.permissions.roles.includes(user.role)) {
      return true;
    }
    
    if (this.permissions.users && this.permissions.users.includes(user.id)) {
      return true;
    }
    
    return false;
  }

  incrementExecution(): void {
    if (!this.stats) this.stats = {};
    this.stats.executions = (this.stats.executions || 0) + 1;
    this.stats.lastExecuted = new Date();
  }

  recordError(error: string): void {
    this.errorMessage = error;
    this.lastErrorAt = new Date();
    if (!this.stats) this.stats = {};
    this.stats.errorCount = (this.stats.errorCount || 0) + 1;
  }

  recordExecutionTime(executionTime: number): void {
    if (!this.stats) this.stats = {};
    const currentAvg = this.stats.averageExecutionTime || 0;
    const currentCount = this.stats.executions || 0;
    this.stats.averageExecutionTime = (currentAvg * currentCount + executionTime) / (currentCount + 1);
  }
}