/**
 * Debug script to test price alert creation
 * Run with: npx ts-node test-debug.ts
 */

import { createPriceAlert, getPriceAlerts } from './src/alerts/controllers/price-alert.controller';
import { APIGatewayProxyEvent } from 'aws-lambda';

// Set environment variables
process.env.PREMIUM_DB = 'postgresql://postgres:postgres123@localhost:3080/defillama';
process.env.ALERTS_DB = 'postgresql://postgres:postgres123@localhost:3080/defillama';

async function testCreatePriceAlert() {
  console.log('=== Testing Create Price Alert ===\n');
  
  const createData = {
    name: 'Debug Test Alert',
    description: 'Debug test for price movements',
    type: 'price',
    conditions: {
      token: 'ETH',
      chain: 'ethereum',
      alert_type: 'above',
      threshold: 3000,
      auto_disable: false,
    },
    actions: {
      channels: ['email', 'telegram'],
      telegram_chat_id: '123456789',
    },
    enabled: true,
    throttle_minutes: 5,
  };
  
  const event: Partial<APIGatewayProxyEvent> = {
    headers: { Authorization: 'Bearer test-token' },
    httpMethod: 'POST',
    body: JSON.stringify(createData),
    requestContext: {
      authorizer: {
        claims: {
          sub: 'test-user-123',
        },
      },
    } as any,
    resource: '/v2/premium/alerts/price',
    path: '/v2/premium/alerts/price',
    isBase64Encoded: false,
    pathParameters: null,
    queryStringParameters: null,
    multiValueQueryStringParameters: null,
    stageVariables: null,
  };
  
  try {
    const response = await createPriceAlert(event as APIGatewayProxyEvent);
    console.log('Status Code:', response.statusCode);
    console.log('Response Body:', JSON.parse(response.body));
    
    if (response.statusCode !== 201) {
      console.error('\n❌ CREATE FAILED!');
      console.error('Expected: 201');
      console.error('Received:', response.statusCode);
    } else {
      console.log('\n✅ CREATE SUCCESS!');
    }
  } catch (error) {
    console.error('\n❌ ERROR:', error);
  }
}

async function testGetPriceAlerts() {
  console.log('\n\n=== Testing Get Price Alerts ===\n');
  
  const event: Partial<APIGatewayProxyEvent> = {
    headers: { Authorization: 'Bearer test-token' },
    httpMethod: 'GET',
    queryStringParameters: {
      page: '1',
      per_page: '10',
    },
    requestContext: {
      authorizer: {
        claims: {
          sub: 'test-user-123',
        },
      },
    } as any,
    resource: '/v2/premium/alerts/price',
    path: '/v2/premium/alerts/price',
    isBase64Encoded: false,
    body: null,
    pathParameters: null,
    multiValueQueryStringParameters: null,
    stageVariables: null,
  };
  
  try {
    const response = await getPriceAlerts(event as APIGatewayProxyEvent);
    console.log('Status Code:', response.statusCode);
    console.log('Response Body:', JSON.parse(response.body));
    
    if (response.statusCode !== 200) {
      console.error('\n❌ GET FAILED!');
      console.error('Expected: 200');
      console.error('Received:', response.statusCode);
    } else {
      console.log('\n✅ GET SUCCESS!');
    }
  } catch (error) {
    console.error('\n❌ ERROR:', error);
  }
}

async function main() {
  await testCreatePriceAlert();
  await testGetPriceAlerts();
  process.exit(0);
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});

