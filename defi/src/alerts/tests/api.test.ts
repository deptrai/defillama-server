/**
 * Alert Rules API Integration Tests
 */

import * as dotenv from 'dotenv';
dotenv.config();

import { handler as createHandler } from '../handlers/create-rule';
import { handler as getRulesHandler } from '../handlers/get-rules';
import { handler as getRuleHandler } from '../handlers/get-rule';
import { handler as updateHandler } from '../handlers/update-rule';
import { handler as deleteHandler } from '../handlers/delete-rule';
import { APIGatewayProxyEvent, Context } from 'aws-lambda';
import { closeAlertsDBConnection } from '../db';

// Mock context
const mockContext: Context = {
  callbackWaitsForEmptyEventLoop: false,
  functionName: 'test',
  functionVersion: '1',
  invokedFunctionArn: 'arn:aws:lambda:us-east-1:123456789012:function:test',
  memoryLimitInMB: '512',
  awsRequestId: 'test-request-id',
  logGroupName: '/aws/lambda/test',
  logStreamName: '2024/01/01/[$LATEST]test',
  getRemainingTimeInMillis: () => 30000,
  done: () => {},
  fail: () => {},
  succeed: () => {},
};

// Test user ID
const TEST_USER_ID = 'test-user-123';

// Helper to create mock event
function createMockEvent(
  method: string,
  path: string,
  body?: any,
  pathParameters?: any,
  queryStringParameters?: any
): APIGatewayProxyEvent {
  return {
    body: body ? JSON.stringify(body) : null,
    headers: {},
    multiValueHeaders: {},
    httpMethod: method,
    isBase64Encoded: false,
    path,
    pathParameters: pathParameters || null,
    queryStringParameters: queryStringParameters || null,
    multiValueQueryStringParameters: null,
    stageVariables: null,
    requestContext: {
      accountId: '123456789012',
      apiId: 'test-api',
      authorizer: {
        userId: TEST_USER_ID,
      },
      protocol: 'HTTP/1.1',
      httpMethod: method,
      path,
      stage: 'test',
      requestId: 'test-request-id',
      requestTimeEpoch: Date.now(),
      resourceId: 'test-resource',
      resourcePath: path,
      identity: {
        accessKey: null,
        accountId: null,
        apiKey: null,
        apiKeyId: null,
        caller: null,
        clientCert: null,
        cognitoAuthenticationProvider: null,
        cognitoAuthenticationType: null,
        cognitoIdentityId: null,
        cognitoIdentityPoolId: null,
        principalOrgId: null,
        sourceIp: '127.0.0.1',
        user: null,
        userAgent: 'test-agent',
        userArn: null,
      },
    },
    resource: path,
  } as any;
}

describe('Alert Rules API', () => {
  let createdRuleId: string;

  afterAll(async () => {
    // Clean up database connection
    await closeAlertsDBConnection();
  });

  describe('POST /alerts - Create Alert Rule', () => {
    it('should create a new alert rule', async () => {
      const requestBody = {
        name: 'Test Alert',
        description: 'Test alert description',
        alert_type: 'tvl_change',
        protocol_id: 'uniswap',
        condition: {
          operator: '>',
          threshold: 1000000000,
          metric: 'tvl',
        },
        channels: ['email'],
        throttle_minutes: 5,
        enabled: true,
      };

      const event = createMockEvent('POST', '/alerts', requestBody);
      const result = await createHandler(event, mockContext, () => {});

      expect(result.statusCode).toBe(201);
      const body = JSON.parse(result.body);
      expect(body.rule).toBeDefined();
      expect(body.rule.name).toBe('Test Alert');
      expect(body.rule.user_id).toBe(TEST_USER_ID);
      expect(body.message).toBe('Alert rule created successfully');

      // Save rule ID for later tests
      createdRuleId = body.rule.id;
    });

    it('should reject invalid alert type', async () => {
      const requestBody = {
        name: 'Invalid Alert',
        alert_type: 'invalid_type',
        protocol_id: 'uniswap',
        condition: {
          operator: '>',
          threshold: 1000000000,
          metric: 'tvl',
        },
        channels: ['email'],
      };

      const event = createMockEvent('POST', '/alerts', requestBody);
      const result = await createHandler(event, mockContext, () => {});

      expect(result.statusCode).toBe(400);
      const body = JSON.parse(result.body);
      expect(body.error).toBe('Validation Error');
      expect(body.errors).toBeDefined();
    });

    it('should reject missing target', async () => {
      const requestBody = {
        name: 'No Target Alert',
        alert_type: 'tvl_change',
        condition: {
          operator: '>',
          threshold: 1000000000,
          metric: 'tvl',
        },
        channels: ['email'],
      };

      const event = createMockEvent('POST', '/alerts', requestBody);
      const result = await createHandler(event, mockContext, () => {});

      expect(result.statusCode).toBe(400);
      const body = JSON.parse(result.body);
      expect(body.error).toBe('Validation Error');
    });

    it('should reject complex condition with insufficient sub-conditions', async () => {
      const requestBody = {
        name: 'Complex Alert',
        alert_type: 'tvl_change',
        protocol_id: 'uniswap',
        condition: {
          type: 'and',
          conditions: [
            {
              operator: '>',
              threshold: 1000000000,
              metric: 'tvl',
            },
          ],
        },
        channels: ['email'],
      };

      const event = createMockEvent('POST', '/alerts', requestBody);
      const result = await createHandler(event, mockContext, () => {});

      expect(result.statusCode).toBe(400);
      const body = JSON.parse(result.body);
      expect(body.error).toBe('Validation Error');
    });
  });

  describe('GET /alerts - Get Alert Rules', () => {
    it('should get all alert rules for user', async () => {
      const event = createMockEvent('GET', '/alerts');
      const result = await getRulesHandler(event, mockContext, () => {});

      expect(result.statusCode).toBe(200);
      const body = JSON.parse(result.body);
      expect(body.rules).toBeDefined();
      expect(Array.isArray(body.rules)).toBe(true);
      expect(body.total).toBeGreaterThan(0);
      expect(body.limit).toBe(50);
      expect(body.offset).toBe(0);
    });

    it('should filter by alert type', async () => {
      const event = createMockEvent('GET', '/alerts', null, null, {
        alert_type: 'tvl_change',
      });
      const result = await getRulesHandler(event, mockContext, () => {});

      expect(result.statusCode).toBe(200);
      const body = JSON.parse(result.body);
      expect(body.rules).toBeDefined();
      body.rules.forEach((rule: any) => {
        expect(rule.alert_type).toBe('tvl_change');
      });
    });

    it('should support pagination', async () => {
      const event = createMockEvent('GET', '/alerts', null, null, {
        limit: '10',
        offset: '0',
      });
      const result = await getRulesHandler(event, mockContext, () => {});

      expect(result.statusCode).toBe(200);
      const body = JSON.parse(result.body);
      expect(body.limit).toBe(10);
      expect(body.offset).toBe(0);
    });
  });

  describe('GET /alerts/:id - Get Single Alert Rule', () => {
    it('should get a single alert rule', async () => {
      const event = createMockEvent('GET', `/alerts/${createdRuleId}`, null, {
        id: createdRuleId,
      });
      const result = await getRuleHandler(event, mockContext, () => {});

      expect(result.statusCode).toBe(200);
      const body = JSON.parse(result.body);
      expect(body.id).toBe(createdRuleId);
      expect(body.name).toBe('Test Alert');
    });

    it('should return 404 for non-existent rule', async () => {
      const event = createMockEvent('GET', '/alerts/00000000-0000-0000-0000-000000000000', null, {
        id: '00000000-0000-0000-0000-000000000000',
      });
      const result = await getRuleHandler(event, mockContext, () => {});

      expect(result.statusCode).toBe(404);
      const body = JSON.parse(result.body);
      expect(body.error).toBe('Not Found');
    });
  });

  describe('PUT /alerts/:id - Update Alert Rule', () => {
    it('should update an alert rule', async () => {
      const requestBody = {
        name: 'Updated Test Alert',
        enabled: false,
      };

      const event = createMockEvent('PUT', `/alerts/${createdRuleId}`, requestBody, {
        id: createdRuleId,
      });
      const result = await updateHandler(event, mockContext, () => {});

      expect(result.statusCode).toBe(200);
      const body = JSON.parse(result.body);
      expect(body.rule.name).toBe('Updated Test Alert');
      expect(body.rule.enabled).toBe(false);
      expect(body.message).toBe('Alert rule updated successfully');
    });

    it('should return 404 for non-existent rule', async () => {
      const requestBody = {
        name: 'Updated Name',
      };

      const event = createMockEvent('PUT', '/alerts/00000000-0000-0000-0000-000000000000', requestBody, {
        id: '00000000-0000-0000-0000-000000000000',
      });
      const result = await updateHandler(event, mockContext, () => {});

      expect(result.statusCode).toBe(404);
      const body = JSON.parse(result.body);
      expect(body.error).toBe('Not Found');
    });
  });

  describe('DELETE /alerts/:id - Delete Alert Rule', () => {
    it('should delete an alert rule', async () => {
      const event = createMockEvent('DELETE', `/alerts/${createdRuleId}`, null, {
        id: createdRuleId,
      });
      const result = await deleteHandler(event, mockContext, () => {});

      expect(result.statusCode).toBe(200);
      const body = JSON.parse(result.body);
      expect(body.message).toBe('Alert rule deleted successfully');
      expect(body.deleted_rule_id).toBe(createdRuleId);
    });

    it('should return 404 for non-existent rule', async () => {
      const event = createMockEvent('DELETE', '/alerts/00000000-0000-0000-0000-000000000000', null, {
        id: '00000000-0000-0000-0000-000000000000',
      });
      const result = await deleteHandler(event, mockContext, () => {});

      expect(result.statusCode).toBe(404);
      const body = JSON.parse(result.body);
      expect(body.error).toBe('Not Found');
    });
  });
});

