import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

@WebSocketGateway({
  cors: {
    origin: process.env.CORS_ORIGIN || 'http://localhost:3001',
    credentials: true,
  },
  namespace: '/bot-logs',
})
export class WebSocketGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(WebSocketGateway.name);
  private connectedClients = new Map<string, { socket: Socket; userId: string; botIds: string[] }>();

  constructor(
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  async handleConnection(client: Socket) {
    try {
      const token = client.handshake.auth.token || client.handshake.headers.authorization;
      
      if (!token) {
        client.disconnect();
        return;
      }

      const payload = this.jwtService.verify(token.replace('Bearer ', ''));
      const userId = payload.sub;

      this.connectedClients.set(client.id, {
        socket: client,
        userId,
        botIds: [],
      });

      this.logger.log(`Client connected: ${client.id} (User: ${userId})`);
      
      // Send initial connection confirmation
      client.emit('connected', {
        userId,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      this.logger.error(`Authentication failed for client ${client.id}:`, error);
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    this.connectedClients.delete(client.id);
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage('subscribe_bot_logs')
  handleSubscribeBotLogs(
    @MessageBody() data: { botId: string },
    @ConnectedSocket() client: Socket,
  ) {
    const clientInfo = this.connectedClients.get(client.id);
    
    if (!clientInfo) {
      client.emit('error', { message: 'Not authenticated' });
      return;
    }

    if (!clientInfo.botIds.includes(data.botId)) {
      clientInfo.botIds.push(data.botId);
    }

    client.join(`bot-${data.botId}`);
    client.emit('subscribed', { botId: data.botId });
    
    this.logger.log(`Client ${client.id} subscribed to bot ${data.botId} logs`);
  }

  @SubscribeMessage('unsubscribe_bot_logs')
  handleUnsubscribeBotLogs(
    @MessageBody() data: { botId: string },
    @ConnectedSocket() client: Socket,
  ) {
    const clientInfo = this.connectedClients.get(client.id);
    
    if (!clientInfo) {
      client.emit('error', { message: 'Not authenticated' });
      return;
    }

    clientInfo.botIds = clientInfo.botIds.filter(id => id !== data.botId);
    client.leave(`bot-${data.botId}`);
    client.emit('unsubscribed', { botId: data.botId });
    
    this.logger.log(`Client ${client.id} unsubscribed from bot ${data.botId} logs`);
  }

  @SubscribeMessage('subscribe_bot_status')
  handleSubscribeBotStatus(
    @MessageBody() data: { botId: string },
    @ConnectedSocket() client: Socket,
  ) {
    const clientInfo = this.connectedClients.get(client.id);
    
    if (!clientInfo) {
      client.emit('error', { message: 'Not authenticated' });
      return;
    }

    client.join(`bot-status-${data.botId}`);
    client.emit('subscribed_status', { botId: data.botId });
    
    this.logger.log(`Client ${client.id} subscribed to bot ${data.botId} status`);
  }

  @SubscribeMessage('unsubscribe_bot_status')
  handleUnsubscribeBotStatus(
    @MessageBody() data: { botId: string },
    @ConnectedSocket() client: Socket,
  ) {
    const clientInfo = this.connectedClients.get(client.id);
    
    if (!clientInfo) {
      client.emit('error', { message: 'Not authenticated' });
      return;
    }

    client.leave(`bot-status-${data.botId}`);
    client.emit('unsubscribed_status', { botId: data.botId });
    
    this.logger.log(`Client ${client.id} unsubscribed from bot ${data.botId} status`);
  }

  // Methods to emit events to clients
  emitBotLog(botId: string, log: any) {
    this.server.to(`bot-${botId}`).emit('bot_log', {
      botId,
      log,
      timestamp: new Date().toISOString(),
    });
  }

  emitBotStatus(botId: string, status: any) {
    this.server.to(`bot-status-${botId}`).emit('bot_status', {
      botId,
      status,
      timestamp: new Date().toISOString(),
    });
  }

  emitBotError(botId: string, error: any) {
    this.server.to(`bot-${botId}`).emit('bot_error', {
      botId,
      error,
      timestamp: new Date().toISOString(),
    });
  }

  emitSystemMessage(userId: string, message: any) {
    const clientInfo = Array.from(this.connectedClients.values()).find(
      client => client.userId === userId,
    );

    if (clientInfo) {
      clientInfo.socket.emit('system_message', {
        message,
        timestamp: new Date().toISOString(),
      });
    }
  }

  emitGlobalMessage(message: any) {
    this.server.emit('global_message', {
      message,
      timestamp: new Date().toISOString(),
    });
  }

  // Get connected clients info for debugging
  getConnectedClients() {
    return Array.from(this.connectedClients.entries()).map(([clientId, info]) => ({
      clientId,
      userId: info.userId,
      botIds: info.botIds,
    }));
  }

  // Disconnect specific user
  disconnectUser(userId: string) {
    const clientsToDisconnect = Array.from(this.connectedClients.entries()).filter(
      ([, info]) => info.userId === userId,
    );

    clientsToDisconnect.forEach(([clientId]) => {
      const clientInfo = this.connectedClients.get(clientId);
      if (clientInfo) {
        clientInfo.socket.disconnect();
        this.connectedClients.delete(clientId);
      }
    });
  }
}