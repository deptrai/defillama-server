import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';

/**
 * WebSocket Handler Types
 * Type definitions for WebSocket Lambda handlers
 */

export interface WebSocketConnectionEvent extends APIGatewayProxyEvent {
  requestContext: APIGatewayProxyEvent['requestContext'] & {
    connectionId: string;
    eventType: 'CONNECT' | 'DISCONNECT' | 'MESSAGE';
    routeKey: '$connect' | '$disconnect' | '$default' | string;
  };
}

export interface WebSocketMessageEvent extends WebSocketConnectionEvent {
  body: string;
}

export interface ConnectionHandlerResult extends APIGatewayProxyResult {
  statusCode: 200 | 401 | 403 | 500;
}

export interface MessageHandlerResult extends APIGatewayProxyResult {
  statusCode: 200 | 400 | 401 | 403 | 500;
}

export interface WebSocketMessage {
  type: 'ping' | 'subscribe' | 'unsubscribe' | 'publish';
  channel?: string;
  data?: any;
  filters?: {
    protocolIds?: string[];
    tokenIds?: string[];
    chains?: string[];
    userId?: string;
    minValue?: number;
    maxValue?: number;
  };
}

export interface SubscriptionRequest {
  type: 'subscribe';
  channel: string;
  filters?: {
    protocolIds?: string[];
    tokenIds?: string[];
    chains?: string[];
    minValue?: number;
    maxValue?: number;
  };
}

export interface UnsubscriptionRequest {
  type: 'unsubscribe';
  channel: string;
}

export interface PublishRequest {
  type: 'publish';
  channel: string;
  message: {
    type: string;
    data: any;
  };
}
