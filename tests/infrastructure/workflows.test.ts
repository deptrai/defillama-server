/**
 * GitHub Actions Workflows Integration Tests
 * 
 * These tests validate the structure and configuration of GitHub Actions workflows.
 */

import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'js-yaml';

describe('GitHub Actions Workflows', () => {
  const workflowsDir = path.join(__dirname, '../../.github/workflows');
  
  describe('Test Workflow', () => {
    const workflowPath = path.join(workflowsDir, 'test.yml');
    let workflow: any;
    
    beforeAll(() => {
      const content = fs.readFileSync(workflowPath, 'utf8');
      workflow = yaml.load(content);
    });
    
    it('should exist', () => {
      expect(fs.existsSync(workflowPath)).toBe(true);
    });
    
    it('should have correct name', () => {
      expect(workflow.name).toBe('Test');
    });
    
    it('should trigger on pull_request and push', () => {
      expect(workflow.on).toHaveProperty('pull_request');
      expect(workflow.on).toHaveProperty('push');
    });
    
    it('should have test job', () => {
      expect(workflow.jobs).toHaveProperty('test');
    });
    
    it('should have lint job', () => {
      expect(workflow.jobs).toHaveProperty('lint');
    });
    
    it('should have security job', () => {
      expect(workflow.jobs).toHaveProperty('security');
    });
    
    it('should use Node.js 20', () => {
      const testJob = workflow.jobs.test;
      const nodeSetup = testJob.steps.find((step: any) => step.uses?.includes('setup-node'));
      expect(nodeSetup?.with?.['node-version']).toBe('20');
    });
    
    it('should use pnpm', () => {
      const testJob = workflow.jobs.test;
      const pnpmSetup = testJob.steps.find((step: any) => step.uses?.includes('pnpm/action-setup'));
      expect(pnpmSetup).toBeDefined();
    });
  });
  
  describe('Deploy Staging Workflow', () => {
    const workflowPath = path.join(workflowsDir, 'deploy-staging.yml');
    let workflow: any;
    
    beforeAll(() => {
      const content = fs.readFileSync(workflowPath, 'utf8');
      workflow = yaml.load(content);
    });
    
    it('should exist', () => {
      expect(fs.existsSync(workflowPath)).toBe(true);
    });
    
    it('should have correct name', () => {
      expect(workflow.name).toBe('Deploy to Staging');
    });
    
    it('should trigger on push to main/master', () => {
      expect(workflow.on.push.branches).toContain('main');
      expect(workflow.on.push.branches).toContain('master');
    });
    
    it('should have deploy job', () => {
      expect(workflow.jobs).toHaveProperty('deploy');
    });
    
    it('should use staging environment', () => {
      const deployJob = workflow.jobs.deploy;
      expect(deployJob.environment.name).toBe('staging');
    });
    
    it('should run smoke tests', () => {
      const deployJob = workflow.jobs.deploy;
      const smokeTestStep = deployJob.steps.find((step: any) => 
        step.name?.includes('smoke') || step.run?.includes('smoke')
      );
      expect(smokeTestStep).toBeDefined();
    });
  });
  
  describe('Deploy Production Workflow', () => {
    const workflowPath = path.join(workflowsDir, 'deploy-production.yml');
    let workflow: any;
    
    beforeAll(() => {
      const content = fs.readFileSync(workflowPath, 'utf8');
      workflow = yaml.load(content);
    });
    
    it('should exist', () => {
      expect(fs.existsSync(workflowPath)).toBe(true);
    });
    
    it('should have correct name', () => {
      expect(workflow.name).toBe('Deploy to Production');
    });
    
    it('should trigger on workflow_dispatch', () => {
      expect(workflow.on).toHaveProperty('workflow_dispatch');
    });
    
    it('should require version input', () => {
      expect(workflow.on.workflow_dispatch.inputs).toHaveProperty('version');
      expect(workflow.on.workflow_dispatch.inputs.version.required).toBe(true);
    });
    
    it('should have approval job', () => {
      expect(workflow.jobs).toHaveProperty('approval');
    });
    
    it('should use production environment', () => {
      const approvalJob = workflow.jobs.approval;
      expect(approvalJob.environment.name).toBe('production-approval');
    });
    
    it('should have traffic shifting stages', () => {
      expect(workflow.jobs).toHaveProperty('traffic-shift-10');
      expect(workflow.jobs).toHaveProperty('traffic-shift-50');
      expect(workflow.jobs).toHaveProperty('traffic-shift-100');
    });
    
    it('should have monitoring between stages', () => {
      const shift10Job = workflow.jobs['traffic-shift-10'];
      const monitoringStep = shift10Job.steps.find((step: any) => 
        step.name?.includes('Monitor') || step.run?.includes('sleep')
      );
      expect(monitoringStep).toBeDefined();
    });
  });
  
  describe('Security Scan Workflow', () => {
    const workflowPath = path.join(workflowsDir, 'security-scan.yml');
    let workflow: any;
    
    beforeAll(() => {
      const content = fs.readFileSync(workflowPath, 'utf8');
      workflow = yaml.load(content);
    });
    
    it('should exist', () => {
      expect(fs.existsSync(workflowPath)).toBe(true);
    });
    
    it('should have correct name', () => {
      expect(workflow.name).toBe('Security Scan');
    });
    
    it('should trigger on pull_request', () => {
      expect(workflow.on).toHaveProperty('pull_request');
    });
    
    it('should have scheduled trigger', () => {
      expect(workflow.on).toHaveProperty('schedule');
      expect(workflow.on.schedule).toBeInstanceOf(Array);
      expect(workflow.on.schedule.length).toBeGreaterThan(0);
    });
    
    it('should have dependency scan job', () => {
      expect(workflow.jobs).toHaveProperty('dependency-scan');
    });
    
    it('should have SAST scan job', () => {
      expect(workflow.jobs).toHaveProperty('sast-scan');
    });
    
    it('should have secrets scan job', () => {
      expect(workflow.jobs).toHaveProperty('secrets-scan');
    });
    
    it('should have infrastructure scan job', () => {
      expect(workflow.jobs).toHaveProperty('infrastructure-scan');
    });
    
    it('should have security summary job', () => {
      expect(workflow.jobs).toHaveProperty('security-summary');
    });
  });
  
  describe('Workflow Dependencies', () => {
    it('should have all required workflows', () => {
      const requiredWorkflows = [
        'test.yml',
        'deploy-staging.yml',
        'deploy-production.yml',
        'security-scan.yml'
      ];
      
      requiredWorkflows.forEach(workflow => {
        const workflowPath = path.join(workflowsDir, workflow);
        expect(fs.existsSync(workflowPath)).toBe(true);
      });
    });
    
    it('should use consistent Node.js version', () => {
      const workflows = ['test.yml', 'deploy-staging.yml', 'deploy-production.yml'];
      const nodeVersions = new Set<string>();
      
      workflows.forEach(workflowFile => {
        const workflowPath = path.join(workflowsDir, workflowFile);
        const content = fs.readFileSync(workflowPath, 'utf8');
        const workflow = yaml.load(content) as any;
        
        Object.values(workflow.jobs).forEach((job: any) => {
          const nodeSetup = job.steps?.find((step: any) => step.uses?.includes('setup-node'));
          if (nodeSetup?.with?.['node-version']) {
            nodeVersions.add(nodeSetup.with['node-version']);
          }
        });
      });
      
      // All workflows should use the same Node.js version
      expect(nodeVersions.size).toBeLessThanOrEqual(1);
    });
  });
});

