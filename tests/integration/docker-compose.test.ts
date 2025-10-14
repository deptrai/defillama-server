/**
 * Docker Compose Integration Tests
 * 
 * Description: Tests for Docker Compose stack deployment
 * Author: Augment Agent (Claude Sonnet 4)
 * Version: 1.0
 * Date: 2025-10-14
 */

import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

describe('Docker Compose Integration Tests', () => {
  test('docker-compose.yml is valid', async () => {
    const { stdout, stderr } = await execAsync('docker-compose config');
    expect(stderr).toBe('');
    expect(stdout).toContain('services:');
  });

  test('all services are defined', async () => {
    const { stdout } = await execAsync('docker-compose config --services');
    const services = stdout.trim().split('\n');
    
    expect(services).toContain('postgres');
    expect(services).toContain('redis');
  });

  test('all services can start', async () => {
    await execAsync('docker-compose up -d');
    const { stdout } = await execAsync('docker-compose ps');
    
    expect(stdout).toContain('postgres');
    expect(stdout).toContain('redis');
  }, 60000);

  test('all services are healthy', async () => {
    // Wait for services to be healthy
    await new Promise(resolve => setTimeout(resolve, 10000));
    
    const { stdout } = await execAsync('docker-compose ps');
    expect(stdout).not.toContain('unhealthy');
  }, 30000);

  afterAll(async () => {
    // Cleanup
    await execAsync('docker-compose down');
  });
});

