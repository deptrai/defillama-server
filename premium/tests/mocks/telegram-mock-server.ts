/**
 * Telegram Mock Server for E2E Testing
 * Simulates Telegram Bot API for notification testing
 */

import express, { Express, Request, Response } from 'express';
import { Server } from 'http';

export interface TelegramMessage {
  message_id: number;
  chat_id: string;
  text: string;
  parse_mode?: string;
  timestamp: string;
}

export class TelegramMockServer {
  private app: Express;
  private server: Server | null = null;
  private messages: TelegramMessage[] = [];
  private messageIdCounter = 1;
  private port: number;

  constructor(port: number = 3100) {
    this.port = port;
    this.app = express();
    this.app.use(express.json());
    this.setupRoutes();
  }

  private setupRoutes(): void {
    // Send message endpoint
    this.app.post('/bot:token/sendMessage', (req: Request, res: Response) => {
      const { chat_id, text, parse_mode } = req.body;

      if (!chat_id || !text) {
        return res.status(400).json({
          ok: false,
          error_code: 400,
          description: 'Bad Request: chat_id and text are required',
        });
      }

      const message: TelegramMessage = {
        message_id: this.messageIdCounter++,
        chat_id: chat_id.toString(),
        text,
        parse_mode,
        timestamp: new Date().toISOString(),
      };

      this.messages.push(message);

      res.json({
        ok: true,
        result: {
          message_id: message.message_id,
          chat: {
            id: parseInt(chat_id),
            type: 'private',
          },
          date: Math.floor(new Date(message.timestamp).getTime() / 1000),
          text: message.text,
        },
      });
    });

    // Get all messages (for testing)
    this.app.get('/messages', (req: Request, res: Response) => {
      res.json({
        ok: true,
        messages: this.messages,
      });
    });

    // Get messages by chat_id (for testing)
    this.app.get('/messages/:chatId', (req: Request, res: Response) => {
      const chatId = req.params.chatId;
      const chatMessages = this.messages.filter((m) => m.chat_id === chatId);

      res.json({
        ok: true,
        messages: chatMessages,
      });
    });

    // Clear all messages (for testing)
    this.app.delete('/messages', (req: Request, res: Response) => {
      this.messages = [];
      this.messageIdCounter = 1;

      res.json({
        ok: true,
        message: 'All messages cleared',
      });
    });

    // Health check
    this.app.get('/health', (req: Request, res: Response) => {
      res.json({
        ok: true,
        status: 'healthy',
        messagesCount: this.messages.length,
      });
    });
  }

  /**
   * Start the mock server
   */
  public async start(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.server = this.app.listen(this.port, () => {
          console.log(`Telegram Mock Server listening on port ${this.port}`);
          resolve();
        });

        if (this.server) {
          this.server.on('error', (error) => {
            reject(error);
          });
        }
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Stop the mock server
   */
  public async stop(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.server) {
        this.server.close((error) => {
          if (error) {
            reject(error);
          } else {
            console.log('Telegram Mock Server stopped');
            resolve();
          }
        });
      } else {
        resolve();
      }
    });
  }

  /**
   * Get all messages
   */
  public getMessages(): TelegramMessage[] {
    return this.messages;
  }

  /**
   * Get messages by chat ID
   */
  public getMessagesByChatId(chatId: string): TelegramMessage[] {
    return this.messages.filter((m) => m.chat_id === chatId);
  }

  /**
   * Clear all messages
   */
  public clearMessages(): void {
    this.messages = [];
    this.messageIdCounter = 1;
  }

  /**
   * Get message count
   */
  public getMessageCount(): number {
    return this.messages.length;
  }

  /**
   * Send message programmatically (for testing)
   */
  public async sendMessage(params: { chat_id: string; text: string; parse_mode?: string }): Promise<TelegramMessage> {
    const message: TelegramMessage = {
      message_id: this.messageIdCounter++,
      chat_id: params.chat_id,
      text: params.text,
      parse_mode: params.parse_mode,
      timestamp: new Date().toISOString(),
    };
    this.messages.push(message);
    return message;
  }

  /**
   * Get server URL
   */
  public getUrl(): string {
    return `http://localhost:${this.port}`;
  }
}

// Export singleton instance for testing
let telegramMockServerInstance: TelegramMockServer | null = null;

export function getTelegramMockServer(port: number = 3100): TelegramMockServer {
  if (!telegramMockServerInstance) {
    telegramMockServerInstance = new TelegramMockServer(port);
  }
  return telegramMockServerInstance;
}

export function resetTelegramMockServer(): void {
  telegramMockServerInstance = null;
}

// CLI usage
if (require.main === module) {
  const port = parseInt(process.env.PORT || '3100');
  const server = new TelegramMockServer(port);

  server.start().then(() => {
    console.log(`Telegram Mock Server started on port ${port}`);
    console.log(`Health check: http://localhost:${port}/health`);
    console.log(`Get messages: http://localhost:${port}/messages`);
  }).catch((error) => {
    console.error('Failed to start Telegram Mock Server:', error);
    process.exit(1);
  });

  // Graceful shutdown
  process.on('SIGINT', async () => {
    console.log('\nShutting down Telegram Mock Server...');
    await server.stop();
    process.exit(0);
  });

  process.on('SIGTERM', async () => {
    console.log('\nShutting down Telegram Mock Server...');
    await server.stop();
    process.exit(0);
  });
}

