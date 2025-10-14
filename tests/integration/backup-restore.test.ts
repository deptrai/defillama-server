/**
 * Backup & Restore Integration Tests
 * 
 * Description: Tests for backup and restore scripts
 * Author: Augment Agent (Claude Sonnet 4)
 * Version: 1.0
 * Date: 2025-10-14
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs';
import * as path from 'path';

const execAsync = promisify(exec);

describe('Backup & Restore Integration Tests', () => {
  const backupDir = path.join(__dirname, '../../backups');

  test('backup-postgres.sh creates backup', async () => {
    const { stdout, stderr } = await execAsync('./scripts/backup-postgres.sh');
    
    expect(stderr).not.toContain('ERROR');
    expect(stdout).toContain('Backup created successfully');
    
    // Check backup file exists
    const files = fs.readdirSync(path.join(backupDir, 'postgres'));
    expect(files.length).toBeGreaterThan(0);
  }, 60000);

  test('backup-redis.sh creates backup', async () => {
    const { stdout, stderr } = await execAsync('./scripts/backup-redis.sh');
    
    expect(stderr).not.toContain('ERROR');
    expect(stdout).toContain('Backup created successfully');
    
    // Check backup file exists
    const files = fs.readdirSync(path.join(backupDir, 'redis'));
    expect(files.length).toBeGreaterThan(0);
  }, 60000);

  test('restore-postgres.sh restores from backup', async () => {
    // Get latest backup
    const files = fs.readdirSync(path.join(backupDir, 'postgres'));
    const latestBackup = files.sort().reverse()[0];
    
    const { stdout, stderr } = await execAsync(`./scripts/restore-postgres.sh ${latestBackup}`);
    
    expect(stderr).not.toContain('ERROR');
    expect(stdout).toContain('Restore completed successfully');
  }, 120000);

  test('backup-all.sh creates all backups', async () => {
    const { stdout, stderr } = await execAsync('./scripts/backup-all.sh');
    
    expect(stderr).not.toContain('ERROR');
    expect(stdout).toContain('All backups completed successfully');
  }, 180000);
});

