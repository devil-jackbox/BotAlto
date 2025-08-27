import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bull';
import { ScheduleModule } from '@nestjs/schedule';
import { MulterModule } from '@nestjs/platform-express';
import { join } from 'path';

// Core modules
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { BotsModule } from './modules/bots/bots.module';
import { CommandsModule } from './modules/commands/commands.module';
import { LogsModule } from './modules/logs/logs.module';
import { DockerModule } from './modules/docker/docker.module';
import { HealthModule } from './modules/health/health.module';
import { WebSocketModule } from './modules/websocket/websocket.module';

// Common services
import { Logger } from './common/logger/logger.service';
import { DatabaseConfig } from './common/config/database.config';
import { RedisConfig } from './common/config/redis.config';

@Module({
  imports: [
    // Configuration
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
    }),

    // Database
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useClass: DatabaseConfig,
    }),

    // Redis & Queue
    BullModule.forRootAsync({
      imports: [ConfigModule],
      useClass: RedisConfig,
    }),

    // File uploads
    MulterModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        dest: configService.get('UPLOAD_PATH', './uploads'),
        limits: {
          fileSize: configService.get('MAX_FILE_SIZE', 10 * 1024 * 1024), // 10MB
        },
      }),
      inject: [ConfigService],
    }),

    // Scheduling
    ScheduleModule.forRoot(),

    // Feature modules
    AuthModule,
    UsersModule,
    BotsModule,
    CommandsModule,
    LogsModule,
    DockerModule,
    HealthModule,
    WebSocketModule,
  ],
  providers: [Logger],
})
export class AppModule {}