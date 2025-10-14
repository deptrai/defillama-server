# SSL/TLS Setup Guide for DeFiLlama

This guide explains how to set up SSL/TLS certificates for DeFiLlama using Let's Encrypt and Certbot.

## Overview

The SSL/TLS setup provides:
- **Automatic certificate management** with Let's Encrypt
- **A+ SSL Labs rating** with modern TLS configuration
- **HTTPS redirect** for all HTTP traffic
- **Auto-renewal** every 12 hours
- **Multi-domain support** (main, www, studio, grafana, prometheus)

## Prerequisites

1. **Domain name** pointing to your server
2. **DNS records** configured:
   - `A` record for `defillama.com` → your server IP
   - `A` record for `www.defillama.com` → your server IP
   - `A` record for `studio.defillama.com` → your server IP
   - `A` record for `grafana.defillama.com` → your server IP
   - `A` record for `prometheus.defillama.com` → your server IP
3. **Ports 80 and 443** open in firewall
4. **Docker and Docker Compose** installed

## Quick Start

### 1. Set Environment Variables

Create a `.env` file or export variables:

```bash
export DOMAIN=defillama.com
export CERTBOT_EMAIL=admin@defillama.com
export CERTBOT_STAGING=0  # Set to 1 for testing
```

### 2. Initialize Certificates

Run the initialization script:

```bash
./scripts/init-letsencrypt.sh
```

This script will:
1. Create necessary directories
2. Download TLS parameters
3. Create a dummy certificate
4. Start nginx
5. Request real certificates from Let's Encrypt
6. Reload nginx with real certificates

### 3. Start SSL/TLS Stack

```bash
docker-compose -f docker-compose.ssl.yml up -d
```

### 4. Verify SSL Configuration

Visit https://www.ssllabs.com/ssltest/analyze.html?d=defillama.com to check your SSL rating.

Expected result: **A+ rating**

## Configuration Files

### docker-compose.ssl.yml

Main Docker Compose file for SSL/TLS stack:
- `nginx-ssl`: Nginx reverse proxy with SSL/TLS termination
- `certbot`: Certbot for certificate management

### nginx/ssl.conf

Nginx SSL/TLS configuration:
- HTTP to HTTPS redirect
- TLS 1.2 and 1.3 support
- Modern cipher suites
- OCSP stapling
- Rate limiting
- Caching for API endpoints

### nginx/security-headers.conf

Security headers configuration:
- HSTS (HTTP Strict Transport Security)
- CSP (Content Security Policy)
- X-Frame-Options
- X-Content-Type-Options
- X-XSS-Protection
- Referrer-Policy
- Permissions-Policy

## Certificate Management

### Manual Renewal

To manually renew certificates:

```bash
docker-compose -f docker-compose.ssl.yml run --rm certbot renew
docker-compose -f docker-compose.ssl.yml exec nginx-ssl nginx -s reload
```

### Automatic Renewal

Certificates are automatically renewed every 12 hours by the Certbot container.

To check renewal status:

```bash
docker-compose -f docker-compose.ssl.yml logs certbot
```

### Renewal Script

Use the renewal script for manual or cron-based renewal:

```bash
./scripts/renew-certificates.sh
```

Add to crontab for automatic renewal:

```bash
# Renew certificates daily at 3 AM
0 3 * * * /path/to/defillama-server/scripts/renew-certificates.sh >> /var/log/certbot-renewal.log 2>&1
```

## Testing with Staging Environment

For testing, use Let's Encrypt staging environment to avoid rate limits:

```bash
export CERTBOT_STAGING=1
./scripts/init-letsencrypt.sh
```

**Note:** Staging certificates are not trusted by browsers. Switch to production after testing.

## Troubleshooting

### Certificate Request Failed

**Problem:** Certificate request fails with error

**Solutions:**
1. Check DNS records are correct and propagated
2. Verify ports 80 and 443 are open
3. Check nginx logs: `docker-compose -f docker-compose.ssl.yml logs nginx-ssl`
4. Check certbot logs: `docker-compose -f docker-compose.ssl.yml logs certbot`
5. Try staging environment first: `export CERTBOT_STAGING=1`

### Nginx Won't Start

**Problem:** Nginx fails to start

**Solutions:**
1. Check nginx configuration: `docker-compose -f docker-compose.ssl.yml exec nginx-ssl nginx -t`
2. Check certificate files exist: `ls -la certbot/conf/live/$DOMAIN/`
3. Check nginx logs: `docker-compose -f docker-compose.ssl.yml logs nginx-ssl`

### Certificate Expired

**Problem:** Certificate has expired

**Solutions:**
1. Check certbot container is running: `docker-compose -f docker-compose.ssl.yml ps certbot`
2. Check certbot logs: `docker-compose -f docker-compose.ssl.yml logs certbot`
3. Manually renew: `./scripts/renew-certificates.sh`

### Rate Limit Exceeded

**Problem:** Let's Encrypt rate limit exceeded

**Solutions:**
1. Wait for rate limit to reset (usually 1 week)
2. Use staging environment for testing
3. Check rate limits: https://letsencrypt.org/docs/rate-limits/

## Security Best Practices

### 1. Keep Certificates Secure

- Never commit certificates to version control
- Restrict access to certificate files: `chmod 600 certbot/conf/live/$DOMAIN/*.pem`
- Use Docker secrets for production

### 2. Monitor Certificate Expiration

- Set up monitoring alerts for certificate expiration
- Check expiration: `openssl x509 -enddate -noout -in certbot/conf/live/$DOMAIN/fullchain.pem`

### 3. Regular Security Audits

- Test SSL configuration regularly: https://www.ssllabs.com/ssltest/
- Update TLS parameters: `./scripts/init-letsencrypt.sh`
- Review nginx security headers

### 4. Backup Certificates

Backup certificate directory regularly:

```bash
tar -czf certbot-backup-$(date +%Y%m%d).tar.gz certbot/conf/
```

## Advanced Configuration

### Custom Cipher Suites

Edit `nginx/ssl.conf` to customize cipher suites:

```nginx
ssl_ciphers 'YOUR-CUSTOM-CIPHERS';
```

### Additional Domains

To add more domains, edit `scripts/init-letsencrypt.sh`:

```bash
docker-compose -f docker-compose.ssl.yml run --rm --entrypoint "\
  certbot certonly --webroot -w /var/www/certbot \
    -d $DOMAIN \
    -d www.$DOMAIN \
    -d studio.$DOMAIN \
    -d grafana.$DOMAIN \
    -d prometheus.$DOMAIN \
    -d your-new-domain.$DOMAIN \
    ..." certbot
```

### Wildcard Certificates

For wildcard certificates, use DNS challenge:

```bash
docker-compose -f docker-compose.ssl.yml run --rm --entrypoint "\
  certbot certonly --dns-cloudflare \
    --dns-cloudflare-credentials /path/to/cloudflare.ini \
    -d $DOMAIN \
    -d *.$DOMAIN \
    ..." certbot
```

## References

- [Let's Encrypt Documentation](https://letsencrypt.org/docs/)
- [Certbot Documentation](https://certbot.eff.org/docs/)
- [Mozilla SSL Configuration Generator](https://ssl-config.mozilla.org/)
- [OWASP Secure Headers Project](https://owasp.org/www-project-secure-headers/)
- [SSL Labs Server Test](https://www.ssllabs.com/ssltest/)

