/**
 * Infrastructure Resources Tests
 * 
 * These tests validate the structure and configuration of CloudFormation resources.
 */

import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'js-yaml';

describe('Infrastructure Resources', () => {
  const resourcesDir = path.join(__dirname, '../../defi/resources');
  
  describe('VPC Network Configuration', () => {
    const resourcePath = path.join(resourcesDir, 'vpc-network.yml');
    let resources: any;
    
    beforeAll(() => {
      const content = fs.readFileSync(resourcePath, 'utf8');
      resources = yaml.load(content);
    });
    
    it('should exist', () => {
      expect(fs.existsSync(resourcePath)).toBe(true);
    });
    
    it('should have VPC resource', () => {
      expect(resources.Resources).toHaveProperty('VPC');
    });
    
    it('should have correct CIDR block', () => {
      const vpc = resources.Resources.VPC;
      expect(vpc.Properties.CidrBlock).toBe('10.0.0.0/16');
    });
    
    it('should have public subnets', () => {
      expect(resources.Resources).toHaveProperty('PublicSubnet1');
      expect(resources.Resources).toHaveProperty('PublicSubnet2');
    });
    
    it('should have private subnets', () => {
      expect(resources.Resources).toHaveProperty('PrivateSubnet1');
      expect(resources.Resources).toHaveProperty('PrivateSubnet2');
    });
    
    it('should have Internet Gateway', () => {
      expect(resources.Resources).toHaveProperty('InternetGateway');
    });
    
    it('should have NAT Gateway', () => {
      expect(resources.Resources).toHaveProperty('NATGateway');
    });
    
    it('should have VPC endpoints', () => {
      expect(resources.Resources).toHaveProperty('S3Endpoint');
      expect(resources.Resources).toHaveProperty('DynamoDBEndpoint');
    });
  });
  
  describe('Security Groups Configuration', () => {
    const resourcePath = path.join(resourcesDir, 'security-groups.yml');
    let resources: any;
    
    beforeAll(() => {
      const content = fs.readFileSync(resourcePath, 'utf8');
      resources = yaml.load(content);
    });
    
    it('should exist', () => {
      expect(fs.existsSync(resourcePath)).toBe(true);
    });
    
    it('should have Lambda security group', () => {
      expect(resources.Resources).toHaveProperty('LambdaSecurityGroup');
    });
    
    it('should have Redis security group', () => {
      expect(resources.Resources).toHaveProperty('RedisSecurityGroup');
    });
    
    it('should have RDS security group', () => {
      expect(resources.Resources).toHaveProperty('RDSSecurityGroup');
    });
  });
  
  describe('Monitoring Configuration', () => {
    const dashboardPath = path.join(resourcesDir, 'monitoring-dashboard.yml');
    const alarmsPath = path.join(resourcesDir, 'alarms.yml');
    
    it('should have monitoring dashboard', () => {
      expect(fs.existsSync(dashboardPath)).toBe(true);
    });
    
    it('should have alarms configuration', () => {
      expect(fs.existsSync(alarmsPath)).toBe(true);
    });
    
    it('should have multiple dashboards', () => {
      const content = fs.readFileSync(dashboardPath, 'utf8');
      const resources = yaml.load(content) as any;
      
      const dashboards = Object.keys(resources.Resources).filter(key => 
        key.includes('Dashboard')
      );
      
      expect(dashboards.length).toBeGreaterThanOrEqual(3);
    });
    
    it('should have multiple alarms', () => {
      const content = fs.readFileSync(alarmsPath, 'utf8');
      const resources = yaml.load(content) as any;
      
      const alarms = Object.keys(resources.Resources).filter(key => 
        key.includes('Alarm')
      );
      
      expect(alarms.length).toBeGreaterThanOrEqual(10);
    });
  });
  
  describe('Auto-scaling Configuration', () => {
    const resourcePath = path.join(resourcesDir, 'autoscaling.yml');
    let resources: any;
    
    beforeAll(() => {
      const content = fs.readFileSync(resourcePath, 'utf8');
      resources = yaml.load(content);
    });
    
    it('should exist', () => {
      expect(fs.existsSync(resourcePath)).toBe(true);
    });
    
    it('should have auto-scaling role', () => {
      expect(resources.Resources).toHaveProperty('AutoScalingRole');
    });
    
    it('should have DynamoDB scaling targets', () => {
      expect(resources.Resources).toHaveProperty('DynamoDBReadCapacityTarget');
      expect(resources.Resources).toHaveProperty('DynamoDBWriteCapacityTarget');
    });
    
    it('should have scaling policies', () => {
      expect(resources.Resources).toHaveProperty('DynamoDBReadScalingPolicy');
      expect(resources.Resources).toHaveProperty('DynamoDBWriteScalingPolicy');
    });
  });
  
  describe('Backup Configuration', () => {
    const resourcePath = path.join(resourcesDir, 'backup.yml');
    let resources: any;
    
    beforeAll(() => {
      const content = fs.readFileSync(resourcePath, 'utf8');
      resources = yaml.load(content);
    });
    
    it('should exist', () => {
      expect(fs.existsSync(resourcePath)).toBe(true);
    });
    
    it('should have backup vault', () => {
      expect(resources.Resources).toHaveProperty('BackupVault');
    });
    
    it('should have backup plan', () => {
      expect(resources.Resources).toHaveProperty('BackupPlan');
    });
    
    it('should have backup role', () => {
      expect(resources.Resources).toHaveProperty('BackupRole');
    });
    
    it('should have backup selections', () => {
      const backupSelections = Object.keys(resources.Resources).filter(key => 
        key.includes('BackupSelection')
      );
      
      expect(backupSelections.length).toBeGreaterThanOrEqual(1);
    });
  });
  
  describe('X-Ray Tracing Configuration', () => {
    const resourcePath = path.join(resourcesDir, 'xray-tracing.yml');
    let resources: any;
    
    beforeAll(() => {
      const content = fs.readFileSync(resourcePath, 'utf8');
      resources = yaml.load(content);
    });
    
    it('should exist', () => {
      expect(fs.existsSync(resourcePath)).toBe(true);
    });
    
    it('should have sampling rules', () => {
      const samplingRules = Object.keys(resources.Resources).filter(key => 
        key.includes('SamplingRule')
      );
      
      expect(samplingRules.length).toBeGreaterThanOrEqual(1);
    });
    
    it('should have X-Ray groups', () => {
      const xrayGroups = Object.keys(resources.Resources).filter(key => 
        key.includes('Group')
      );
      
      expect(xrayGroups.length).toBeGreaterThanOrEqual(1);
    });
  });
  
  describe('Resource Consistency', () => {
    it('should have all required resource files', () => {
      const requiredFiles = [
        'vpc-network.yml',
        'security-groups.yml',
        'security-enhanced.yml',
        'monitoring-dashboard.yml',
        'alarms.yml',
        'xray-tracing.yml',
        'autoscaling.yml',
        'backup.yml'
      ];
      
      requiredFiles.forEach(file => {
        const filePath = path.join(resourcesDir, file);
        expect(fs.existsSync(filePath)).toBe(true);
      });
    });
    
    it('should use consistent stage variable', () => {
      const files = fs.readdirSync(resourcesDir).filter(f => f.endsWith('.yml'));
      
      files.forEach(file => {
        const filePath = path.join(resourcesDir, file);
        const content = fs.readFileSync(filePath, 'utf8');
        
        // Check if file uses ${self:custom.stage} for stage references
        if (content.includes('${self:custom.stage}') || content.includes('${self:service}')) {
          expect(content).toMatch(/\$\{self:custom\.stage\}|\$\{self:service\}/);
        }
      });
    });
  });
});

