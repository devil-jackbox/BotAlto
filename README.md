# BotAlto - Multi-Language Telegram Bot Hosting Platform

![BotAlto Logo](https://raw.githubusercontent.com/DevAryanPro/BotAlto-Telegram-Bot-Builder/refs/heads/main/Images/photo_2025-08-02_15-55-27.jpg)

BotAlto is a comprehensive, enterprise-grade platform for hosting and managing Telegram bots with support for multiple programming languages. It provides a complete solution for bot development, deployment, monitoring, and management with real-time capabilities.

## 🚀 Features

### Multi-Language Bot Support
- **Python**: aiogram, pyrogram, python-telegram-bot
- **JavaScript/Node.js**: Telegraf.js, node-telegram-bot-api
- **PHP**: MadelineProto, telegram-bot-sdk
- **Go**: telebot, tgbotapi

### Core Platform Features
- 🐳 **Docker Containerization**: Each bot runs in isolated containers
- 🔐 **JWT Authentication**: Secure user authentication and authorization
- 📊 **Real-time Monitoring**: Live logs, metrics, and status updates
- 🔄 **Auto-restart**: Automatic recovery from crashes
- 📈 **Resource Management**: CPU and memory limits per bot
- 🌐 **Webhook & Polling**: Support for both modes
- 📝 **Built-in Code Editor**: Monaco editor with syntax highlighting
- ⚡ **Hot Reload**: Instant code updates without restart
- 🔧 **Command Management**: Visual command creation and editing
- 📋 **Task Scheduler**: Cron-based automated tasks
- 🛡️ **Security**: Encrypted tokens, CSRF protection, rate limiting

### Advanced Features
- 🎯 **Role-based Access**: Owner, Developer, Viewer roles
- 📱 **Real-time Notifications**: WebSocket-based live updates
- 📊 **Analytics Dashboard**: Bot performance and usage metrics
- 🔌 **Plugin Marketplace**: Reusable bot functions and extensions
- 🚀 **CI/CD Integration**: GitHub Actions support
- 📦 **Multi-source Deployment**: ZIP, GitHub, direct code upload
- 🔍 **Health Monitoring**: Comprehensive system health checks
- 📈 **Scaling**: Kubernetes manifests for production deployment

## 🏗️ Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │   Backend       │    │   Database      │
│   (React)       │◄──►│   (Nest.js)     │◄──►│   (PostgreSQL)  │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   NGINX         │    │   Redis         │    │   Docker        │
│   (Reverse      │    │   (Cache/Queue) │    │   (Bot          │
│    Proxy)       │    │                 │    │    Containers)  │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## 📋 Prerequisites

- Docker & Docker Compose
- Node.js 18+ (for development)
- PostgreSQL 15+
- Redis 7+
- Git

## 🚀 Quick Start

### 1. Clone the Repository
```bash
git clone https://github.com/your-username/botalto-platform.git
cd botalto-platform
```

### 2. Environment Setup
```bash
# Copy environment template
cp .env.example .env

# Edit environment variables
nano .env
```

### 3. Start the Platform
```bash
# Start all services
docker-compose up -d

# Check service status
docker-compose ps

# View logs
docker-compose logs -f backend
```

### 4. Access the Platform
- **Frontend**: http://localhost:3001
- **Backend API**: http://localhost:3000/api/v1
- **Health Check**: http://localhost:3000/api/v1/health
- **Grafana**: http://localhost:3002 (admin/admin123)

## 🔧 Development Setup

### Backend Development
```bash
# Install dependencies
npm install

# Start development server
npm run start:dev

# Run tests
npm run test

# Build for production
npm run build
```

### Frontend Development
```bash
cd frontend
npm install
npm start
```

### Database Migrations
```bash
# Generate migration
npm run db:generate -- src/database/migrations/CreateInitialTables

# Run migrations
npm run db:migrate

# Revert migration
npm run db:revert
```

## 📚 API Documentation

### Authentication Endpoints
```http
POST /api/v1/auth/login
POST /api/v1/auth/register
POST /api/v1/auth/refresh
POST /api/v1/auth/logout
```

### Bot Management Endpoints
```http
GET    /api/v1/bots
POST   /api/v1/bots
GET    /api/v1/bots/:id
PUT    /api/v1/bots/:id
DELETE /api/v1/bots/:id
POST   /api/v1/bots/:id/start
POST   /api/v1/bots/:id/stop
POST   /api/v1/bots/:id/restart
GET    /api/v1/bots/:id/logs
GET    /api/v1/bots/:id/stats
```

### Command Management Endpoints
```http
GET    /api/v1/bots/:botId/commands
POST   /api/v1/bots/:botId/commands
PUT    /api/v1/bots/:botId/commands/:id
DELETE /api/v1/bots/:botId/commands/:id
```

## 🐳 Docker Deployment

### Production Deployment
```bash
# Build and start production services
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d

# Scale backend services
docker-compose up -d --scale backend=3
```

### Kubernetes Deployment
```bash
# Apply Kubernetes manifests
kubectl apply -f k8s/

# Check deployment status
kubectl get pods -n botalto
```

## 🔒 Security Features

- **JWT Authentication**: Secure token-based authentication
- **Password Hashing**: bcrypt with configurable rounds
- **Rate Limiting**: API rate limiting with NGINX
- **CORS Protection**: Configurable cross-origin policies
- **Input Validation**: Comprehensive request validation
- **SQL Injection Protection**: TypeORM with parameterized queries
- **XSS Protection**: Security headers and input sanitization
- **CSRF Protection**: Built-in CSRF token validation

## 📊 Monitoring & Logging

### Health Checks
- **Application Health**: `/api/v1/health`
- **Readiness Check**: `/api/v1/health/ready`
- **Liveness Check**: `/api/v1/health/live`

### Metrics
- **Prometheus**: http://localhost:9090
- **Grafana**: http://localhost:3002
- **Custom Metrics**: Bot performance, resource usage

### Logging
- **Structured Logging**: Winston with JSON format
- **Log Rotation**: Daily rotation with compression
- **Log Levels**: DEBUG, INFO, WARN, ERROR, FATAL

## 🔧 Configuration

### Environment Variables
```env
# Application
NODE_ENV=production
PORT=3000
API_PREFIX=api/v1

# Database
DB_HOST=postgres
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=password
DB_DATABASE=botalto

# Redis
REDIS_HOST=redis
REDIS_PORT=6379
REDIS_PASSWORD=redis123

# JWT
JWT_SECRET=your-super-secret-jwt-key
JWT_EXPIRES_IN=7d

# Docker
DOCKER_HOST=unix:///var/run/docker.sock
DOCKER_NETWORK=botalto-network

# Security
BCRYPT_ROUNDS=12
CORS_ORIGIN=https://your-domain.com
```

## 🚀 Bot Development Examples

### Python Bot (aiogram)
```python
import asyncio
from aiogram import Bot, Dispatcher, types
from aiogram.filters import Command
import os

bot = Bot(token=os.getenv('BOT_TOKEN'))
dp = Dispatcher()

@dp.message(Command("start"))
async def start_command(message: types.Message):
    await message.answer("Hello from BotAlto!")

@dp.message(Command("help"))
async def help_command(message: types.Message):
    await message.answer("This is a help message.")

async def main():
    await dp.start_polling(bot)

if __name__ == "__main__":
    asyncio.run(main())
```

### JavaScript Bot (Telegraf)
```javascript
const { Telegraf } = require('telegraf');
const bot = new Telegraf(process.env.BOT_TOKEN);

bot.command('start', (ctx) => {
    ctx.reply('Hello from BotAlto!');
});

bot.command('help', (ctx) => {
    ctx.reply('This is a help message.');
});

bot.launch();
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Guidelines
- Follow TypeScript best practices
- Write comprehensive tests
- Update documentation
- Follow conventional commits
- Ensure code quality with ESLint and Prettier

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

- **Documentation**: [Wiki](https://github.com/your-username/botalto-platform/wiki)
- **Issues**: [GitHub Issues](https://github.com/your-username/botalto-platform/issues)
- **Discussions**: [GitHub Discussions](https://github.com/your-username/botalto-platform/discussions)
- **Email**: support@botalto.com

## 🙏 Acknowledgments

- [Nest.js](https://nestjs.com/) - Progressive Node.js framework
- [TypeORM](https://typeorm.io/) - ORM for TypeScript and JavaScript
- [Docker](https://www.docker.com/) - Containerization platform
- [Telegram Bot API](https://core.telegram.org/bots/api) - Official Telegram Bot API

---

**BotAlto** - Enterprise-grade Telegram Bot Hosting Platform  
Built with ❤️ by the BotAlto Team
