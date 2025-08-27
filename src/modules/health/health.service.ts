import { Injectable, Logger } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import * as Redis from 'redis';

@Injectable()
export class HealthService {
  private readonly logger = new Logger(HealthService.name);
  private redisClient: Redis.RedisClientType;

  constructor(
    @InjectDataSource() private dataSource: DataSource,
    private configService: ConfigService,
  ) {
    this.initializeRedis();
  }

  private async initializeRedis() {
    try {
      this.redisClient = Redis.createClient({
        socket: {
          host: this.configService.get('REDIS_HOST', 'localhost'),
          port: this.configService.get('REDIS_PORT', 6379),
        },
        password: this.configService.get('REDIS_PASSWORD'),
      });

      await this.redisClient.connect();
    } catch (error) {
      this.logger.error('Failed to initialize Redis client', error);
    }
  }

  async check() {
    const checks = await Promise.allSettled([
      this.checkDatabase(),
      this.checkRedis(),
      this.checkDocker(),
    ]);

    const results = checks.map((result, index) => {
      const checkNames = ['database', 'redis', 'docker'];
      if (result.status === 'fulfilled') {
        return { [checkNames[index]]: result.value };
      } else {
        return { [checkNames[index]]: { status: 'error', error: result.reason } };
      }
    });

    const allHealthy = checks.every(result => result.status === 'fulfilled');
    
    return {
      status: allHealthy ? 'healthy' : 'unhealthy',
      timestamp: new Date().toISOString(),
      checks: Object.assign({}, ...results),
    };
  }

  async detailedCheck() {
    const startTime = Date.now();
    
    const checks = await Promise.allSettled([
      this.checkDatabase(),
      this.checkRedis(),
      this.checkDocker(),
      this.checkSystemResources(),
      this.checkBotContainers(),
    ]);

    const endTime = Date.now();
    const responseTime = endTime - startTime;

    const results = checks.map((result, index) => {
      const checkNames = ['database', 'redis', 'docker', 'system', 'containers'];
      if (result.status === 'fulfilled') {
        return { [checkNames[index]]: result.value };
      } else {
        return { [checkNames[index]]: { status: 'error', error: result.reason } };
      }
    });

    const allHealthy = checks.every(result => result.status === 'fulfilled');
    
    return {
      status: allHealthy ? 'healthy' : 'unhealthy',
      timestamp: new Date().toISOString(),
      responseTime: `${responseTime}ms`,
      version: process.env.npm_package_version || '1.0.0',
      environment: this.configService.get('NODE_ENV', 'development'),
      checks: Object.assign({}, ...results),
    };
  }

  async readinessCheck() {
    const checks = await Promise.allSettled([
      this.checkDatabase(),
      this.checkRedis(),
    ]);

    const allReady = checks.every(result => result.status === 'fulfilled');
    
    return {
      status: allReady ? 'ready' : 'not_ready',
      timestamp: new Date().toISOString(),
    };
  }

  async livenessCheck() {
    return {
      status: 'alive',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
    };
  }

  private async checkDatabase() {
    try {
      const startTime = Date.now();
      await this.dataSource.query('SELECT 1');
      const responseTime = Date.now() - startTime;

      return {
        status: 'healthy',
        responseTime: `${responseTime}ms`,
        type: this.dataSource.options.type,
        database: this.dataSource.options.database,
      };
    } catch (error) {
      this.logger.error('Database health check failed', error);
      throw error;
    }
  }

  private async checkRedis() {
    try {
      if (!this.redisClient) {
        throw new Error('Redis client not initialized');
      }

      const startTime = Date.now();
      await this.redisClient.ping();
      const responseTime = Date.now() - startTime;

      return {
        status: 'healthy',
        responseTime: `${responseTime}ms`,
        host: this.configService.get('REDIS_HOST', 'localhost'),
        port: this.configService.get('REDIS_PORT', 6379),
      };
    } catch (error) {
      this.logger.error('Redis health check failed', error);
      throw error;
    }
  }

  private async checkDocker() {
    try {
      const Docker = require('dockerode');
      const docker = new Docker({
        socketPath: this.configService.get('DOCKER_HOST', '/var/run/docker.sock'),
      });

      const startTime = Date.now();
      await docker.ping();
      const responseTime = Date.now() - startTime;

      const info = await docker.info();
      
      return {
        status: 'healthy',
        responseTime: `${responseTime}ms`,
        version: info.ServerVersion,
        containers: info.Containers,
        images: info.Images,
      };
    } catch (error) {
      this.logger.error('Docker health check failed', error);
      throw error;
    }
  }

  private async checkSystemResources() {
    const os = require('os');
    
    const totalMemory = os.totalmem();
    const freeMemory = os.freemem();
    const usedMemory = totalMemory - freeMemory;
    const memoryUsage = (usedMemory / totalMemory) * 100;

    const loadAverage = os.loadavg();
    const cpuCount = os.cpus().length;

    return {
      status: memoryUsage < 90 ? 'healthy' : 'warning',
      memory: {
        total: this.formatBytes(totalMemory),
        used: this.formatBytes(usedMemory),
        free: this.formatBytes(freeMemory),
        usage: `${memoryUsage.toFixed(2)}%`,
      },
      cpu: {
        loadAverage: loadAverage.map(load => load.toFixed(2)),
        cores: cpuCount,
        usage: `${((loadAverage[0] / cpuCount) * 100).toFixed(2)}%`,
      },
      uptime: os.uptime(),
    };
  }

  private async checkBotContainers() {
    try {
      const Docker = require('dockerode');
      const docker = new Docker({
        socketPath: this.configService.get('DOCKER_HOST', '/var/run/docker.sock'),
      });

      const containers = await docker.listContainers({
        all: true,
        filters: {
          label: ['botalto.managed=true'],
        },
      });

      const stats = {
        total: containers.length,
        running: containers.filter(c => c.State === 'running').length,
        stopped: containers.filter(c => c.State === 'exited').length,
        error: containers.filter(c => c.State === 'error').length,
      };

      return {
        status: stats.error === 0 ? 'healthy' : 'warning',
        containers: stats,
        details: containers.map(c => ({
          id: c.Id,
          name: c.Names[0],
          state: c.State,
          status: c.Status,
          image: c.Image,
        })),
      };
    } catch (error) {
      this.logger.error('Bot containers health check failed', error);
      throw error;
    }
  }

  private formatBytes(bytes: number): string {
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    if (bytes === 0) return '0 Bytes';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  }
}