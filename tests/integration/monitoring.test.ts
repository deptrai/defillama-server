/**
 * Monitoring Stack Integration Tests
 * 
 * Description: Tests for Prometheus, Grafana, Loki monitoring stack
 * Author: Augment Agent (Claude Sonnet 4)
 * Version: 1.0
 * Date: 2025-10-14
 */

import axios from 'axios';

const PROMETHEUS_URL = process.env.PROMETHEUS_URL || 'http://localhost:9090';
const GRAFANA_URL = process.env.GRAFANA_URL || 'http://localhost:3002';

describe('Monitoring Stack Integration Tests', () => {
  test('Prometheus is accessible', async () => {
    const response = await axios.get(`${PROMETHEUS_URL}/-/healthy`);
    expect(response.status).toBe(200);
  });

  test('Prometheus has targets', async () => {
    const response = await axios.get(`${PROMETHEUS_URL}/api/v1/targets`);
    expect(response.status).toBe(200);
    expect(response.data.status).toBe('success');
    expect(response.data.data.activeTargets.length).toBeGreaterThan(0);
  });

  test('Grafana is accessible', async () => {
    const response = await axios.get(`${GRAFANA_URL}/api/health`);
    expect(response.status).toBe(200);
    expect(response.data.database).toBe('ok');
  });

  test('Grafana has datasources', async () => {
    const response = await axios.get(`${GRAFANA_URL}/api/datasources`, {
      auth: {
        username: 'admin',
        password: 'admin'
      }
    });
    expect(response.status).toBe(200);
    expect(response.data.length).toBeGreaterThan(0);
  });
});

