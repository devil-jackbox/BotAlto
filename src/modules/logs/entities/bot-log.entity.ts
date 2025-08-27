import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Bot } from '../../bots/entities/bot.entity';

export enum LogLevel {
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error',
  FATAL = 'fatal',
}

export enum LogType {
  BOT_START = 'bot_start',
  BOT_STOP = 'bot_stop',
  COMMAND_EXECUTION = 'command_execution',
  ERROR = 'error',
  WEBHOOK = 'webhook',
  HEALTH_CHECK = 'health_check',
  SYSTEM = 'system',
}

@Entity('bot_logs')
@Index(['botId', 'createdAt'])
@Index(['level', 'createdAt'])
@Index(['type', 'createdAt'])
export class BotLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({
    type: 'enum',
    enum: LogLevel,
    default: LogLevel.INFO,
  })
  level: LogLevel;

  @Column({
    type: 'enum',
    enum: LogType,
    default: LogType.SYSTEM,
  })
  type: LogType;

  @Column()
  message: string;

  @Column({ type: 'jsonb', nullable: true })
  data: Record<string, any>;

  @Column({ type: 'text', nullable: true })
  stackTrace?: string;

  @Column({ nullable: true })
  commandName?: string;

  @Column({ nullable: true })
  userId?: string;

  @Column({ nullable: true })
  chatId?: string;

  @Column({ nullable: true })
  messageId?: string;

  @Column({ type: 'jsonb', nullable: true })
  context: {
    userAgent?: string;
    ip?: string;
    requestId?: string;
    sessionId?: string;
    executionTime?: number;
  };

  @Column({ type: 'jsonb', nullable: true })
  metadata: {
    version?: string;
    environment?: string;
    component?: string;
    tags?: string[];
  };

  @CreateDateColumn()
  createdAt: Date;

  // Relationships
  @ManyToOne(() => Bot, (bot) => bot.logs)
  @JoinColumn({ name: 'botId' })
  bot: Bot;

  @Column()
  botId: string;

  // Methods
  isError(): boolean {
    return this.level === LogLevel.ERROR || this.level === LogLevel.FATAL;
  }

  isWarning(): boolean {
    return this.level === LogLevel.WARN;
  }

  isInfo(): boolean {
    return this.level === LogLevel.INFO;
  }

  isDebug(): boolean {
    return this.level === LogLevel.DEBUG;
  }

  getFormattedMessage(): string {
    const timestamp = this.createdAt.toISOString();
    const prefix = `[${timestamp}] [${this.level.toUpperCase()}] [${this.type}]`;
    
    if (this.commandName) {
      return `${prefix} [${this.commandName}] ${this.message}`;
    }
    
    return `${prefix} ${this.message}`;
  }

  getShortMessage(): string {
    if (this.message.length <= 100) {
      return this.message;
    }
    return this.message.substring(0, 97) + '...';
  }

  hasContext(): boolean {
    return this.context && Object.keys(this.context).length > 0;
  }

  hasData(): boolean {
    return this.data && Object.keys(this.data).length > 0;
  }
}