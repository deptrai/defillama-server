/**
 * Discord Mock Server for E2E Testing
 * Simulates Discord Webhook API for notification testing
 */

import express, { Express, Request, Response } from 'express';
import { Server } from 'http';

export interface DiscordEmbed {
  title?: string;
  description?: string;
  color?: number;
  fields?: Array<{
    name: string;
    value: string;
    inline?: boolean;
  }>;
  timestamp?: string;
  footer?: {
    text: string;
  };
}

export interface DiscordWebhook {
  id: string;
  token: string;
  content?: string;
  embeds?: DiscordEmbed[];
  username?: string;
  avatar_url?: string;
  timestamp: string;
}

export class DiscordMockServer {
  private app: Express;
  private server: Server | null = null;
  private webhooks: DiscordWebhook[] = [];
  private port: number;

  constructor(port: number = 3101) {
    this.port = port;
    this.app = express();
    this.app.use(express.json());
    this.setupRoutes();
  }

  private setupRoutes(): void {
    // Execute webhook endpoint
    this.app.post('/api/webhooks/:id/:token', (req: Request, res: Response) => {
      const { id, token } = req.params;
      const { content, embeds, username, avatar_url } = req.body;

      if (!content && (!embeds || embeds.length === 0)) {
        return res.status(400).json({
          message: 'Cannot send an empty message',
          code: 50006,
        });
      }

      const webhook: DiscordWebhook = {
        id,
        token,
        content,
        embeds,
        username,
        avatar_url,
        timestamp: new Date().toISOString(),
      };

      this.webhooks.push(webhook);

      // Discord returns 204 No Content on success
      res.status(204).send();
    });

    // Get all webhooks (for testing)
    this.app.get('/webhooks', (req: Request, res: Response) => {
      res.json({
        webhooks: this.webhooks,
      });
    });

    // Get webhooks by ID (for testing)
    this.app.get('/webhooks/:id', (req: Request, res: Response) => {
      const id = req.params.id;
      const idWebhooks = this.webhooks.filter((w) => w.id === id);

      res.json({
        webhooks: idWebhooks,
      });
    });

    // Clear all webhooks (for testing)
    this.app.delete('/webhooks', (req: Request, res: Response) => {
      this.webhooks = [];

      res.json({
        message: 'All webhooks cleared',
      });
    });

    // Health check
    this.app.get('/health', (req: Request, res: Response) => {
      res.json({
        status: 'healthy',
        webhooksCount: this.webhooks.length,
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
          console.log(`Discord Mock Server listening on port ${this.port}`);
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
            console.log('Discord Mock Server stopped');
            resolve();
          }
        });
      } else {
        resolve();
      }
    });
  }

  /**
   * Get all webhooks
   */
  public getWebhooks(): DiscordWebhook[] {
    return this.webhooks;
  }

  /**
   * Get webhooks by ID
   */
  public getWebhooksById(id: string): DiscordWebhook[] {
    return this.webhooks.filter((w) => w.id === id);
  }

  /**
   * Clear all webhooks
   */
  public clearWebhooks(): void {
    this.webhooks = [];
  }

  /**
   * Get webhook count
   */
  public getWebhookCount(): number {
    return this.webhooks.length;
  }

  /**
   * Execute webhook programmatically (for testing)
   */
  public async executeWebhook(params: { id: string; token: string; content?: string; embeds?: any[] }): Promise<DiscordWebhook> {
    const webhook: DiscordWebhook = {
      id: params.id,
      token: params.token,
      content: params.content,
      embeds: params.embeds,
      timestamp: new Date().toISOString(),
    };
    this.webhooks.push(webhook);
    return webhook;
  }

  /**
   * Get server URL
   */
  public getUrl(): string {
    return `http://localhost:${this.port}`;
  }
}

// Export singleton instance for testing
let discordMockServerInstance: DiscordMockServer | null = null;

export function getDiscordMockServer(port: number = 3101): DiscordMockServer {
  if (!discordMockServerInstance) {
    discordMockServerInstance = new DiscordMockServer(port);
  }
  return discordMockServerInstance;
}

export function resetDiscordMockServer(): void {
  discordMockServerInstance = null;
}

// CLI usage
if (require.main === module) {
  const port = parseInt(process.env.PORT || '3101');
  const server = new DiscordMockServer(port);

  server.start().then(() => {
    console.log(`Discord Mock Server started on port ${port}`);
    console.log(`Health check: http://localhost:${port}/health`);
    console.log(`Get webhooks: http://localhost:${port}/webhooks`);
  }).catch((error) => {
    console.error('Failed to start Discord Mock Server:', error);
    process.exit(1);
  });

  // Graceful shutdown
  process.on('SIGINT', async () => {
    console.log('\nShutting down Discord Mock Server...');
    await server.stop();
    process.exit(0);
  });

  process.on('SIGTERM', async () => {
    console.log('\nShutting down Discord Mock Server...');
    await server.stop();
    process.exit(0);
  });
}

