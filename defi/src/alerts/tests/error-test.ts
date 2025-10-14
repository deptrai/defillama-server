/**
 * Test error handling for non-existent rules
 */

import * as dotenv from 'dotenv';
dotenv.config();

import { handler as getRuleHandler } from '../handlers/get-rule';
import { handler as updateHandler } from '../handlers/update-rule';
import { handler as deleteHandler } from '../handlers/delete-rule';
import { APIGatewayProxyEvent, Context } from 'aws-lambda';

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

const TEST_USER_ID = 'test-user-123';

function createMockEvent(
  method: string,
  path: string,
  body?: any,
  pathParameters?: any
): APIGatewayProxyEvent {
  return {
    body: body ? JSON.stringify(body) : null,
    headers: {},
    multiValueHeaders: {},
    httpMethod: method,
    isBase64Encoded: false,
    path,
    pathParameters: pathParameters || null,
    queryStringParameters: null,
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

async function testGetInvalidUUID() {
  console.log('\n=== Testing GET with invalid UUID ===');
  const event = createMockEvent('GET', '/alerts/non-existent-id', null, {
    id: 'non-existent-id',
  });

  try {
    const result = await getRuleHandler(event, mockContext, () => {}) as any;
    console.log('Status Code:', result?.statusCode);
    console.log('Body:', result?.body);
  } catch (error) {
    console.error('Error:', error);
  }
}

async function testGetNonExistent() {
  console.log('\n=== Testing GET non-existent rule (valid UUID) ===');
  const event = createMockEvent('GET', '/alerts/00000000-0000-0000-0000-000000000000', null, {
    id: '00000000-0000-0000-0000-000000000000',
  });

  try {
    const result = await getRuleHandler(event, mockContext, () => {}) as any;
    console.log('Status Code:', result?.statusCode);
    console.log('Body:', result?.body);
  } catch (error) {
    console.error('Error:', error);
  }
}

async function testUpdateNonExistent() {
  console.log('\n=== Testing UPDATE non-existent rule (valid UUID) ===');
  const event = createMockEvent('PUT', '/alerts/00000000-0000-0000-0000-000000000000', { name: 'Updated' }, {
    id: '00000000-0000-0000-0000-000000000000',
  });

  try {
    const result = await updateHandler(event, mockContext, () => {}) as any;
    console.log('Status Code:', result?.statusCode);
    console.log('Body:', result?.body);
  } catch (error) {
    console.error('Error:', error);
  }
}

async function testDeleteNonExistent() {
  console.log('\n=== Testing DELETE non-existent rule (valid UUID) ===');
  const event = createMockEvent('DELETE', '/alerts/00000000-0000-0000-0000-000000000000', null, {
    id: '00000000-0000-0000-0000-000000000000',
  });

  try {
    const result = await deleteHandler(event, mockContext, () => {}) as any;
    console.log('Status Code:', result?.statusCode);
    console.log('Body:', result?.body);
  } catch (error) {
    console.error('Error:', error);
  }
}

async function runTests() {
  await testGetInvalidUUID();
  await testGetNonExistent();
  await testUpdateNonExistent();
  await testDeleteNonExistent();
}

runTests();

