# GitHub Secrets Setup Guide

This document provides instructions for configuring GitHub Secrets required for CI/CD workflows.

---

## Table of Contents

1. [Required Secrets](#required-secrets)
2. [Optional Secrets](#optional-secrets)
3. [Setup Instructions](#setup-instructions)
4. [Secret Generation](#secret-generation)
5. [Verification](#verification)

---

## Required Secrets

### Staging Environment

| Secret Name | Description | Example Value |
|-------------|-------------|---------------|
| `STAGING_HOST` | Staging server hostname or IP | `staging.defillama.com` or `192.168.1.100` |
| `STAGING_USER` | SSH username for staging server | `deploy` or `ubuntu` |
| `STAGING_SSH_KEY` | SSH private key for staging server | `-----BEGIN OPENSSH PRIVATE KEY-----...` |

### Production Environment

| Secret Name | Description | Example Value |
|-------------|-------------|---------------|
| `PRODUCTION_HOST` | Production server hostname or IP | `defillama.com` or `10.0.1.100` |
| `PRODUCTION_USER` | SSH username for production server | `deploy` or `ubuntu` |
| `PRODUCTION_SSH_KEY` | SSH private key for production server | `-----BEGIN OPENSSH PRIVATE KEY-----...` |

---

## Optional Secrets

### Docker Registry

| Secret Name | Description | Required For |
|-------------|-------------|--------------|
| `DOCKERHUB_USERNAME` | Docker Hub username | Pushing to Docker Hub |
| `DOCKERHUB_TOKEN` | Docker Hub access token | Pushing to Docker Hub |

### Security Scanning

| Secret Name | Description | Required For |
|-------------|-------------|--------------|
| `SNYK_TOKEN` | Snyk API token | Security vulnerability scanning |

### Notifications

| Secret Name | Description | Required For |
|-------------|-------------|--------------|
| `SLACK_WEBHOOK_URL` | Slack webhook URL | Deployment notifications |

---

## Setup Instructions

### Step 1: Navigate to Repository Settings

1. Go to your GitHub repository
2. Click on **Settings** tab
3. In the left sidebar, click **Secrets and variables** → **Actions**

### Step 2: Add Secrets

For each secret:

1. Click **New repository secret**
2. Enter the **Name** (e.g., `STAGING_HOST`)
3. Enter the **Value**
4. Click **Add secret**

---

## Secret Generation

### SSH Key Generation

Generate SSH key pair for deployment:

```bash
# Generate SSH key pair
ssh-keygen -t ed25519 -C "github-actions-deploy" -f ~/.ssh/github_deploy_key

# Display private key (copy this to GitHub Secret)
cat ~/.ssh/github_deploy_key

# Display public key (add this to server's authorized_keys)
cat ~/.ssh/github_deploy_key.pub
```

**Add public key to server:**

```bash
# On the deployment server
mkdir -p ~/.ssh
chmod 700 ~/.ssh

# Add public key to authorized_keys
echo "ssh-ed25519 AAAA... github-actions-deploy" >> ~/.ssh/authorized_keys
chmod 600 ~/.ssh/authorized_keys
```

### Docker Hub Token Generation

1. Log in to [Docker Hub](https://hub.docker.com/)
2. Go to **Account Settings** → **Security**
3. Click **New Access Token**
4. Enter description: `GitHub Actions CI/CD`
5. Select permissions: **Read, Write, Delete**
6. Click **Generate**
7. Copy the token (you won't see it again)

### Snyk Token Generation

1. Log in to [Snyk](https://snyk.io/)
2. Go to **Account Settings**
3. Click **General** → **Auth Token**
4. Click **Show** to reveal token
5. Copy the token

### Slack Webhook URL

1. Go to your Slack workspace
2. Navigate to **Apps** → **Incoming Webhooks**
3. Click **Add to Slack**
4. Select channel for notifications
5. Click **Add Incoming WebHooks integration**
6. Copy the **Webhook URL**

---

## Verification

### Test SSH Connection

Test SSH connection from local machine:

```bash
# Test staging connection
ssh -i ~/.ssh/github_deploy_key deploy@staging.defillama.com

# Test production connection
ssh -i ~/.ssh/github_deploy_key deploy@defillama.com
```

### Test Docker Hub Authentication

```bash
# Login to Docker Hub
echo $DOCKERHUB_TOKEN | docker login -u $DOCKERHUB_USERNAME --password-stdin

# Verify login
docker info | grep Username
```

### Test Snyk Token

```bash
# Install Snyk CLI
npm install -g snyk

# Authenticate
snyk auth $SNYK_TOKEN

# Test scan
snyk test
```

### Test Slack Webhook

```bash
# Send test message
curl -X POST -H 'Content-type: application/json' \
  --data '{"text":"Test message from GitHub Actions"}' \
  $SLACK_WEBHOOK_URL
```

---

## Security Best Practices

### SSH Keys

- ✅ Use Ed25519 keys (more secure than RSA)
- ✅ Use separate keys for staging and production
- ✅ Rotate keys every 90 days
- ✅ Never commit private keys to repository
- ✅ Use passphrase-protected keys when possible

### Access Tokens

- ✅ Use tokens with minimum required permissions
- ✅ Rotate tokens regularly (every 90 days)
- ✅ Revoke unused tokens immediately
- ✅ Monitor token usage in audit logs

### Secrets Management

- ✅ Never log secrets in workflow outputs
- ✅ Use GitHub's secret masking feature
- ✅ Limit secret access to specific workflows
- ✅ Review secret access regularly

---

## Troubleshooting

### SSH Connection Failed

**Problem:** `Permission denied (publickey)`

**Solution:**
1. Verify public key is in server's `~/.ssh/authorized_keys`
2. Check file permissions: `chmod 600 ~/.ssh/authorized_keys`
3. Verify SSH key format in GitHub Secret (include header/footer)

### Docker Push Failed

**Problem:** `unauthorized: authentication required`

**Solution:**
1. Verify `DOCKERHUB_USERNAME` is correct
2. Regenerate `DOCKERHUB_TOKEN`
3. Check token permissions (Read, Write, Delete)

### Snyk Scan Failed

**Problem:** `Unauthorized`

**Solution:**
1. Verify `SNYK_TOKEN` is valid
2. Check token hasn't expired
3. Regenerate token if necessary

### Slack Notification Failed

**Problem:** `invalid_payload`

**Solution:**
1. Verify `SLACK_WEBHOOK_URL` is correct
2. Check webhook is still active in Slack
3. Test webhook with curl command

---

## Secret Rotation Schedule

| Secret Type | Rotation Frequency | Next Rotation |
|-------------|-------------------|---------------|
| SSH Keys | Every 90 days | Track in calendar |
| Docker Hub Tokens | Every 90 days | Track in calendar |
| Snyk Tokens | Every 90 days | Track in calendar |
| Slack Webhooks | As needed | When channel changes |

---

## Checklist

Before deploying:

- [ ] All required secrets configured
- [ ] SSH keys tested and working
- [ ] Docker Hub authentication tested
- [ ] Snyk token validated
- [ ] Slack webhook tested
- [ ] Secrets documented in team password manager
- [ ] Rotation schedule set up
- [ ] Team members notified of secret locations

---

## Support

For issues with secret configuration:

1. Check [GitHub Actions documentation](https://docs.github.com/en/actions/security-guides/encrypted-secrets)
2. Review workflow logs for specific error messages
3. Contact DevOps team for assistance

---

**Document Version:** 1.0  
**Last Updated:** 2025-10-14  
**Author:** Augment Agent (Claude Sonnet 4)

