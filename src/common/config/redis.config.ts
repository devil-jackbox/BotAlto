import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BullModuleOptions, BullOptionsFactory } from '@nestjs/bull';

@Injectable()
export class RedisConfig implements BullOptionsFactory {
  constructor(private configService: ConfigService) {}

  createBullOptions(): BullModuleOptions {
    return {
      redis: {
        host: this.configService.get('REDIS_HOST', 'localhost'),
        port: this.configService.get('REDIS_PORT', 6379),
        password: this.configService.get('REDIS_PASSWORD', undefined),
        retryDelayOnFailover: 100,
        maxRetriesPerRequest: 3,
      },
      defaultJobOptions: {
        removeOnComplete: 100,
        removeOnFail: 50,
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
      },
    };
  }
}