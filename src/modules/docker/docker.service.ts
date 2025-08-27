import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as Docker from 'dockerode';
import { Bot, BotLanguage, BotFramework, BotStatus } from '../bots/entities/bot.entity';
import { BotLog, LogLevel, LogType } from '../logs/entities/bot-log.entity';

@Injectable()
export class DockerService {
  private docker: Docker;
  private readonly logger = new Logger(DockerService.name);

  constructor(private configService: ConfigService) {
    this.docker = new Docker({
      socketPath: this.configService.get('DOCKER_HOST', '/var/run/docker.sock'),
    });
  }

  async createBotContainer(bot: Bot): Promise<string> {
    try {
      const containerName = `botalto-bot-${bot.id}`;
      const imageName = this.getImageName(bot.language, bot.framework);
      
      // Create container configuration
      const containerConfig = {
        Image: imageName,
        name: containerName,
        Env: [
          `BOT_TOKEN=${bot.token}`,
          `BOT_ID=${bot.id}`,
          `BOT_NAME=${bot.name}`,
          `BOT_USERNAME=${bot.username}`,
          `BOT_MODE=${bot.mode}`,
          ...this.getEnvironmentVariables(bot),
        ],
        HostConfig: {
          Memory: this.parseMemoryLimit(bot.config?.maxMemory || '512m'),
          CpuPercent: this.parseCpuLimit(bot.config?.maxCpu || '50'),
          RestartPolicy: {
            Name: bot.config?.restartPolicy || 'unless-stopped',
            MaximumRetryCount: bot.maxRestartAttempts,
          },
          NetworkMode: this.configService.get('DOCKER_NETWORK', 'bridge'),
          ...this.getVolumeMounts(bot),
          ...this.getPortMappings(bot),
        },
        Labels: {
          'botalto.bot.id': bot.id,
          'botalto.bot.name': bot.name,
          'botalto.bot.owner': bot.ownerId,
          'botalto.managed': 'true',
        },
      };

      // Create and start container
      const container = await this.docker.createContainer(containerConfig);
      await container.start();

      this.logger.log(`Created container ${containerName} for bot ${bot.name}`);
      return container.id;
    } catch (error) {
      this.logger.error(`Failed to create container for bot ${bot.name}: ${error.message}`);
      throw error;
    }
  }

  async startBotContainer(bot: Bot): Promise<void> {
    try {
      if (!bot.containerId) {
        throw new Error('Bot container not found');
      }

      const container = this.docker.getContainer(bot.containerId);
      await container.start();
      
      this.logger.log(`Started container for bot ${bot.name}`);
    } catch (error) {
      this.logger.error(`Failed to start container for bot ${bot.name}: ${error.message}`);
      throw error;
    }
  }

  async stopBotContainer(bot: Bot): Promise<void> {
    try {
      if (!bot.containerId) {
        throw new Error('Bot container not found');
      }

      const container = this.docker.getContainer(bot.containerId);
      await container.stop({ t: 10 }); // 10 second timeout
      
      this.logger.log(`Stopped container for bot ${bot.name}`);
    } catch (error) {
      this.logger.error(`Failed to stop container for bot ${bot.name}: ${error.message}`);
      throw error;
    }
  }

  async restartBotContainer(bot: Bot): Promise<void> {
    try {
      if (!bot.containerId) {
        throw new Error('Bot container not found');
      }

      const container = this.docker.getContainer(bot.containerId);
      await container.restart({ t: 10 });
      
      this.logger.log(`Restarted container for bot ${bot.name}`);
    } catch (error) {
      this.logger.error(`Failed to restart container for bot ${bot.name}: ${error.message}`);
      throw error;
    }
  }

  async removeBotContainer(bot: Bot): Promise<void> {
    try {
      if (!bot.containerId) {
        return;
      }

      const container = this.docker.getContainer(bot.containerId);
      await container.remove({ force: true });
      
      this.logger.log(`Removed container for bot ${bot.name}`);
    } catch (error) {
      this.logger.error(`Failed to remove container for bot ${bot.name}: ${error.message}`);
      throw error;
    }
  }

  async getContainerStatus(bot: Bot): Promise<BotStatus> {
    try {
      if (!bot.containerId) {
        return BotStatus.STOPPED;
      }

      const container = this.docker.getContainer(bot.containerId);
      const info = await container.inspect();
      
      if (info.State.Running) {
        return BotStatus.RUNNING;
      } else if (info.State.ExitCode !== 0) {
        return BotStatus.ERROR;
      } else {
        return BotStatus.STOPPED;
      }
    } catch (error) {
      this.logger.error(`Failed to get container status for bot ${bot.name}: ${error.message}`);
      return BotStatus.ERROR;
    }
  }

  async getContainerLogs(bot: Bot, tail: number = 100): Promise<string[]> {
    try {
      if (!bot.containerId) {
        return [];
      }

      const container = this.docker.getContainer(bot.containerId);
      const logs = await container.logs({
        stdout: true,
        stderr: true,
        tail,
        timestamps: true,
      });

      return logs.toString().split('\n').filter(line => line.trim());
    } catch (error) {
      this.logger.error(`Failed to get container logs for bot ${bot.name}: ${error.message}`);
      return [];
    }
  }

  async getContainerStats(bot: Bot): Promise<any> {
    try {
      if (!bot.containerId) {
        return null;
      }

      const container = this.docker.getContainer(bot.containerId);
      const stats = await container.stats({ stream: false });
      
      return {
        cpu: this.calculateCpuUsage(stats),
        memory: this.calculateMemoryUsage(stats),
        network: this.calculateNetworkUsage(stats),
      };
    } catch (error) {
      this.logger.error(`Failed to get container stats for bot ${bot.name}: ${error.message}`);
      return null;
    }
  }

  async buildBotImage(bot: Bot, sourceCode: string): Promise<string> {
    try {
      const imageName = `botalto/bot:${bot.id}`;
      const dockerfile = this.generateDockerfile(bot, sourceCode);
      
      const stream = await this.docker.buildImage({
        context: Buffer.from(dockerfile),
        src: ['Dockerfile'],
      }, {
        t: imageName,
        dockerfile: 'Dockerfile',
      });

      return new Promise((resolve, reject) => {
        this.docker.modem.followProgress(stream, (err, res) => {
          if (err) reject(err);
          else resolve(imageName);
        });
      });
    } catch (error) {
      this.logger.error(`Failed to build image for bot ${bot.name}: ${error.message}`);
      throw error;
    }
  }

  private getImageName(language: BotLanguage, framework: BotFramework): string {
    const baseImages = {
      [BotLanguage.PYTHON]: 'python:3.11-slim',
      [BotLanguage.JAVASCRIPT]: 'node:18-slim',
      [BotLanguage.PHP]: 'php:8.2-cli',
      [BotLanguage.GO]: 'golang:1.21-alpine',
    };

    return baseImages[language] || 'python:3.11-slim';
  }

  private getEnvironmentVariables(bot: Bot): string[] {
    const env = [];
    
    if (bot.config?.environment) {
      Object.entries(bot.config.environment).forEach(([key, value]) => {
        env.push(`${key}=${value}`);
      });
    }

    if (bot.webhookUrl) {
      env.push(`WEBHOOK_URL=${bot.webhookUrl}`);
    }

    return env;
  }

  private getVolumeMounts(bot: Bot): any {
    if (!bot.config?.volumes) {
      return {};
    }

    const binds = bot.config.volumes.map(volume => {
      const [hostPath, containerPath] = volume.split(':');
      return `${hostPath}:${containerPath}`;
    });

    return { Binds: binds };
  }

  private getPortMappings(bot: Bot): any {
    if (!bot.config?.ports) {
      return {};
    }

    const portBindings = {};
    const exposedPorts = {};

    bot.config.ports.forEach(portMapping => {
      const [hostPort, containerPort] = portMapping.split(':');
      portBindings[`${containerPort}/tcp`] = [{ HostPort: hostPort }];
      exposedPorts[`${containerPort}/tcp`] = {};
    });

    return { PortBindings: portBindings, ExposedPorts: exposedPorts };
  }

  private parseMemoryLimit(memory: string): number {
    const units = { 'b': 1, 'k': 1024, 'm': 1024 * 1024, 'g': 1024 * 1024 * 1024 };
    const match = memory.match(/^(\d+)([bkmg])?$/i);
    
    if (!match) return 512 * 1024 * 1024; // Default 512MB
    
    const value = parseInt(match[1]);
    const unit = (match[2] || 'm').toLowerCase();
    
    return value * units[unit];
  }

  private parseCpuLimit(cpu: string): number {
    const value = parseInt(cpu);
    return isNaN(value) ? 50 : Math.min(100, Math.max(1, value));
  }

  private generateDockerfile(bot: Bot, sourceCode: string): string {
    const language = bot.language;
    const framework = bot.framework;

    switch (language) {
      case BotLanguage.PYTHON:
        return this.generatePythonDockerfile(framework, sourceCode);
      case BotLanguage.JAVASCRIPT:
        return this.generateJavaScriptDockerfile(framework, sourceCode);
      case BotLanguage.PHP:
        return this.generatePhpDockerfile(framework, sourceCode);
      case BotLanguage.GO:
        return this.generateGoDockerfile(framework, sourceCode);
      default:
        throw new Error(`Unsupported language: ${language}`);
    }
  }

  private generatePythonDockerfile(framework: BotFramework, sourceCode: string): string {
    const requirements = this.getPythonRequirements(framework);
    
    return `
FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY bot.py .

CMD ["python", "bot.py"]
    `.trim();
  }

  private generateJavaScriptDockerfile(framework: BotFramework, sourceCode: string): string {
    const packageJson = this.getJavaScriptPackageJson(framework);
    
    return `
FROM node:18-slim

WORKDIR /app

COPY package.json .
RUN npm install --production

COPY bot.js .

CMD ["node", "bot.js"]
    `.trim();
  }

  private generatePhpDockerfile(framework: BotFramework, sourceCode: string): string {
    return `
FROM php:8.2-cli

WORKDIR /app

COPY composer.json .
RUN composer install --no-dev

COPY bot.php .

CMD ["php", "bot.php"]
    `.trim();
  }

  private generateGoDockerfile(framework: BotFramework, sourceCode: string): string {
    return `
FROM golang:1.21-alpine AS builder

WORKDIR /app
COPY go.mod go.sum ./
RUN go mod download

COPY . .
RUN go build -o bot .

FROM alpine:latest
WORKDIR /app
COPY --from=builder /app/bot .

CMD ["./bot"]
    `.trim();
  }

  private getPythonRequirements(framework: BotFramework): string {
    const requirements = {
      [BotFramework.AIOGRAM]: 'aiogram>=3.0.0',
      [BotFramework.PYROGRAM]: 'pyrogram>=2.0.0',
      [BotFramework.TELEBOT]: 'python-telegram-bot>=20.0.0',
    };

    return requirements[framework] || 'aiogram>=3.0.0';
  }

  private getJavaScriptPackageJson(framework: BotFramework): string {
    const packages = {
      [BotFramework.TELEGRAF]: 'telegraf',
      [BotFramework.NODE_TELEGRAM_BOT_API]: 'node-telegram-bot-api',
    };

    const packageName = packages[framework] || 'telegraf';
    
    return JSON.stringify({
      name: 'telegram-bot',
      version: '1.0.0',
      main: 'bot.js',
      dependencies: {
        [packageName]: 'latest',
      },
    }, null, 2);
  }

  private calculateCpuUsage(stats: any): number {
    const cpuDelta = stats.cpu_stats.cpu_usage.total_usage - stats.precpu_stats.cpu_usage.total_usage;
    const systemDelta = stats.cpu_stats.system_cpu_usage - stats.precpu_stats.system_cpu_usage;
    
    if (systemDelta > 0 && cpuDelta > 0) {
      return (cpuDelta / systemDelta) * stats.cpu_stats.online_cpus * 100;
    }
    
    return 0;
  }

  private calculateMemoryUsage(stats: any): any {
    const memoryUsage = stats.memory_stats.usage - stats.memory_stats.stats.cache;
    const memoryLimit = stats.memory_stats.limit;
    
    return {
      used: memoryUsage,
      limit: memoryLimit,
      percentage: (memoryUsage / memoryLimit) * 100,
    };
  }

  private calculateNetworkUsage(stats: any): any {
    const networks = stats.networks;
    if (!networks) return { rx: 0, tx: 0 };

    let rx = 0;
    let tx = 0;

    Object.values(networks).forEach((network: any) => {
      rx += network.rx_bytes;
      tx += network.tx_bytes;
    });

    return { rx, tx };
  }
}