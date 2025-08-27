import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { Exclude } from 'class-transformer';
import { User } from '../../users/entities/user.entity';
import { Command } from '../../commands/entities/command.entity';
import { BotLog } from '../../logs/entities/bot-log.entity';

export enum BotLanguage {
  PYTHON = 'python',
  JAVASCRIPT = 'javascript',
  PHP = 'php',
  GO = 'go',
}

export enum BotFramework {
  // Python frameworks
  AIOGRAM = 'aiogram',
  PYROGRAM = 'pyrogram',
  TELEBOT = 'telebot',
  
  // JavaScript frameworks
  TELEGRAF = 'telegraf',
  NODE_TELEGRAM_BOT_API = 'node-telegram-bot-api',
  
  // PHP frameworks
  MADELINE_PROTO = 'madeline-proto',
  TELEGRAM_BOT_SDK = 'telegram-bot-sdk',
  
  // Go frameworks
  TELEBOT = 'telebot',
  TGBOTAPI = 'tgbotapi',
}

export enum BotStatus {
  STOPPED = 'stopped',
  RUNNING = 'running',
  STARTING = 'starting',
  STOPPING = 'stopping',
  ERROR = 'error',
  CRASHED = 'crashed',
}

export enum BotMode {
  POLLING = 'polling',
  WEBHOOK = 'webhook',
}

@Entity('bots')
export class Bot {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ unique: true })
  username: string;

  @Column({ select: false })
  @Exclude()
  token: string;

  @Column({
    type: 'enum',
    enum: BotLanguage,
  })
  language: BotLanguage;

  @Column({
    type: 'enum',
    enum: BotFramework,
  })
  framework: BotFramework;

  @Column({
    type: 'enum',
    enum: BotStatus,
    default: BotStatus.STOPPED,
  })
  status: BotStatus;

  @Column({
    type: 'enum',
    enum: BotMode,
    default: BotMode.POLLING,
  })
  mode: BotMode;

  @Column({ nullable: true })
  webhookUrl?: string;

  @Column({ nullable: true })
  containerId?: string;

  @Column({ nullable: true })
  containerName?: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ type: 'jsonb', nullable: true })
  config: {
    maxMemory?: string;
    maxCpu?: string;
    restartPolicy?: string;
    environment?: Record<string, string>;
    volumes?: string[];
    ports?: string[];
  };

  @Column({ type: 'jsonb', nullable: true })
  metadata: {
    version?: string;
    dependencies?: Record<string, string>;
    entryPoint?: string;
    buildArgs?: Record<string, string>;
  };

  @Column({ type: 'text', nullable: true })
  sourceCode?: string;

  @Column({ nullable: true })
  sourceUrl?: string;

  @Column({ nullable: true })
  sourceType?: 'zip' | 'github' | 'editor';

  @Column({ type: 'jsonb', nullable: true })
  stats: {
    messagesProcessed?: number;
    commandsExecuted?: number;
    errorsCount?: number;
    uptime?: number;
    lastActivity?: Date;
  };

  @Column({ type: 'jsonb', nullable: true })
  health: {
    lastCheck?: Date;
    isHealthy?: boolean;
    responseTime?: number;
    errorMessage?: string;
  };

  @Column({ nullable: true })
  lastStartedAt?: Date;

  @Column({ nullable: true })
  lastStoppedAt?: Date;

  @Column({ nullable: true })
  lastErrorAt?: Date;

  @Column({ type: 'text', nullable: true })
  lastErrorMessage?: string;

  @Column({ default: true })
  autoRestart: boolean;

  @Column({ default: 3 })
  maxRestartAttempts: number;

  @Column({ default: 0 })
  restartCount: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Relationships
  @ManyToOne(() => User, (user) => user.bots)
  @JoinColumn({ name: 'ownerId' })
  owner: User;

  @Column()
  ownerId: string;

  @OneToMany(() => Command, (command) => command.bot)
  commands: Command[];

  @OneToMany(() => BotLog, (log) => log.bot)
  logs: BotLog[];

  // Methods
  isRunning(): boolean {
    return this.status === BotStatus.RUNNING;
  }

  isStopped(): boolean {
    return this.status === BotStatus.STOPPED;
  }

  hasError(): boolean {
    return this.status === BotStatus.ERROR || this.status === BotStatus.CRASHED;
  }

  canStart(): boolean {
    return this.status === BotStatus.STOPPED || this.status === BotStatus.ERROR;
  }

  canStop(): boolean {
    return this.status === BotStatus.RUNNING || this.status === BotStatus.STARTING;
  }

  getDisplayName(): string {
    return `${this.name} (@${this.username})`;
  }

  getLanguageDisplayName(): string {
    const languageNames = {
      [BotLanguage.PYTHON]: 'Python',
      [BotLanguage.JAVASCRIPT]: 'JavaScript',
      [BotLanguage.PHP]: 'PHP',
      [BotLanguage.GO]: 'Go',
    };
    return languageNames[this.language] || this.language;
  }

  getFrameworkDisplayName(): string {
    const frameworkNames = {
      [BotFramework.AIOGRAM]: 'aiogram',
      [BotFramework.PYROGRAM]: 'Pyrogram',
      [BotFramework.TELEBOT]: 'python-telegram-bot',
      [BotFramework.TELEGRAF]: 'Telegraf.js',
      [BotFramework.NODE_TELEGRAM_BOT_API]: 'node-telegram-bot-api',
      [BotFramework.MADELINE_PROTO]: 'MadelineProto',
      [BotFramework.TELEGRAM_BOT_SDK]: 'Telegram Bot SDK',
      [BotFramework.TELEBOT]: 'telebot',
      [BotFramework.TGBOTAPI]: 'tgbotapi',
    };
    return frameworkNames[this.framework] || this.framework;
  }
}