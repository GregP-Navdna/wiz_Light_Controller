# Deployment Guide

This guide covers deploying WIZ LAN Controller in various production environments.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Standard Deployment](#standard-deployment)
- [Docker Deployment](#docker-deployment)
- [Reverse Proxy Setup](#reverse-proxy-setup)
- [Systemd Service](#systemd-service)
- [Cloud Deployment](#cloud-deployment)
- [Security Hardening](#security-hardening)
- [Monitoring](#monitoring)
- [Backup and Recovery](#backup-and-recovery)

## Prerequisites

- Node.js 20+ (for standard deployment)
- Docker and Docker Compose (for containerized deployment)
- Network access to WIZ devices (same LAN)
- Reverse proxy (nginx, Caddy) for HTTPS (recommended)

## Standard Deployment

### 1. Server Setup

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Install build essentials (for native modules)
sudo apt install -y build-essential python3
```

### 2. Application Setup

```bash
# Create application directory
sudo mkdir -p /opt/wiz-controller
sudo chown $USER:$USER /opt/wiz-controller
cd /opt/wiz-controller

# Copy application files
# (Use git, scp, or rsync to transfer files)

# Install dependencies
npm ci --production
cd frontend && npm ci --production && cd ..

# Build application
npm run build
```

### 3. Environment Configuration

```bash
# Create production environment file
cat > .env << EOF
NODE_ENV=production
PORT=3000
SUBNET=192.168.1.0/24
SCAN_CONCURRENCY=20
PROBE_TIMEOUT_MS=2000
DB_PATH=/opt/wiz-controller/data/wiz.db
API_SECRET=your-secure-random-token-here
LOG_LEVEL=info
EOF

# Create data directory
mkdir -p /opt/wiz-controller/data
```

### 4. Start Application

```bash
# Start with npm
npm start

# Or use PM2 for process management (recommended)
sudo npm install -g pm2
pm2 start npm --name wiz-controller -- start
pm2 save
pm2 startup
```

## Docker Deployment

### Using Docker Compose (Recommended)

**docker-compose.prod.yml:**

```yaml
version: '3.8'

services:
  wiz-controller:
    build: .
    container_name: wiz-controller
    restart: unless-stopped
    network_mode: host  # Required for LAN discovery on Linux
    environment:
      - NODE_ENV=production
      - PORT=3000
      - SUBNET=192.168.1.0/24
      - API_SECRET=${API_SECRET}
      - DB_PATH=/app/data/wiz.db
    volumes:
      - wiz-data:/app/data
      - /etc/localtime:/etc/localtime:ro  # Timezone sync
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/api/devices"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s

volumes:
  wiz-data:
    driver: local
```

**Deploy:**

```bash
# Create .env file with secrets
echo "API_SECRET=$(openssl rand -base64 32)" > .env

# Build and start
docker-compose -f docker-compose.prod.yml up -d

# View logs
docker-compose -f docker-compose.prod.yml logs -f

# Stop
docker-compose -f docker-compose.prod.yml down
```

### Standalone Docker

```bash
# Build image
docker build -t wiz-controller:latest .

# Run container (Linux - host networking)
docker run -d \
  --name wiz-controller \
  --network host \
  --restart unless-stopped \
  -e NODE_ENV=production \
  -e API_SECRET=$(openssl rand -base64 32) \
  -v wiz-data:/app/data \
  wiz-controller:latest

# Run container (Windows/Mac - bridge networking)
docker run -d \
  --name wiz-controller \
  -p 3000:3000 \
  --restart unless-stopped \
  -e NODE_ENV=production \
  -e API_SECRET=$(openssl rand -base64 32) \
  -v wiz-data:/app/data \
  wiz-controller:latest
```

## Reverse Proxy Setup

### Nginx

**/etc/nginx/sites-available/wiz-controller:**

```nginx
upstream wiz_backend {
    server localhost:3000;
}

server {
    listen 80;
    server_name wiz.example.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name wiz.example.com;

    ssl_certificate /etc/letsencrypt/live/wiz.example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/wiz.example.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;

    client_max_body_size 10M;

    # Frontend static files
    location / {
        proxy_pass http://wiz_backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # WebSocket support
    location /socket.io/ {
        proxy_pass http://wiz_backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_read_timeout 86400;
    }
}
```

**Enable and restart:**

```bash
sudo ln -s /etc/nginx/sites-available/wiz-controller /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

### Caddy

**Caddyfile:**

```caddy
wiz.example.com {
    reverse_proxy localhost:3000 {
        header_up X-Real-IP {remote_host}
        header_up X-Forwarded-For {remote_host}
        header_up X-Forwarded-Proto {scheme}
    }
}
```

**Restart Caddy:**

```bash
sudo systemctl restart caddy
```

## Systemd Service

**/etc/systemd/system/wiz-controller.service:**

```ini
[Unit]
Description=WIZ LAN Controller
After=network.target

[Service]
Type=simple
User=wizuser
WorkingDirectory=/opt/wiz-controller
Environment=NODE_ENV=production
EnvironmentFile=/opt/wiz-controller/.env
ExecStart=/usr/bin/npm start
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal
SyslogIdentifier=wiz-controller

[Install]
WantedBy=multi-user.target
```

**Setup and start:**

```bash
# Create dedicated user
sudo useradd -r -s /bin/false wizuser
sudo chown -R wizuser:wizuser /opt/wiz-controller

# Enable and start service
sudo systemctl daemon-reload
sudo systemctl enable wiz-controller
sudo systemctl start wiz-controller

# Check status
sudo systemctl status wiz-controller

# View logs
sudo journalctl -u wiz-controller -f
```

## Cloud Deployment

### Considerations

**Network Challenges:**
- Cloud instances are typically not on the same LAN as WIZ bulbs
- Consider using a VPN (WireGuard, OpenVPN) to connect cloud to home network
- Or deploy on local hardware (Raspberry Pi, NUC, etc.)

### Recommended: Local Hardware

**Raspberry Pi 4 (4GB+ RAM):**

```bash
# Install 64-bit Raspberry Pi OS
# Follow standard deployment steps above

# Install on Raspberry Pi
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs build-essential
cd /opt/wiz-controller
npm ci --production
npm run build
```

**Intel NUC / Mini PC:**
- Better performance for larger networks
- Run Docker or standard deployment
- Consider Ubuntu Server 22.04 LTS

## Security Hardening

### 1. API Authentication

**Always set API_SECRET in production:**

```bash
# Generate secure token
openssl rand -base64 32

# Add to .env
echo "API_SECRET=your-generated-token" >> .env
```

### 2. Firewall Configuration

```bash
# Allow only necessary ports
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow ssh
sudo ufw allow 3000/tcp  # Or 80/443 if using reverse proxy
sudo ufw enable
```

### 3. Network Isolation

- Place WIZ bulbs on isolated VLAN
- Restrict controller access with firewall rules
- Use VPN for remote access instead of exposing to internet

### 4. Regular Updates

```bash
# Update dependencies monthly
npm audit
npm update

# Update system packages
sudo apt update && sudo apt upgrade -y
```

### 5. HTTPS/TLS

- Always use HTTPS in production
- Use Let's Encrypt for free certificates
- Configure strong TLS settings

## Monitoring

### Health Checks

```bash
# Check if service is responding
curl http://localhost:3000/api/devices

# Check WebSocket
wscat -c ws://localhost:3000
```

### Logging

**With PM2:**

```bash
pm2 logs wiz-controller
pm2 monit
```

**With systemd:**

```bash
journalctl -u wiz-controller -f
```

**Docker:**

```bash
docker logs -f wiz-controller
```

### Metrics (Optional)

Consider adding:
- Prometheus for metrics collection
- Grafana for visualization
- Uptime monitoring (UptimeRobot, Pingdom)

## Backup and Recovery

### Database Backup

```bash
# Create backup script
cat > /opt/wiz-controller/backup.sh << 'EOF'
#!/bin/bash
BACKUP_DIR="/opt/wiz-controller/backups"
DB_PATH="/opt/wiz-controller/data/wiz.db"
DATE=$(date +%Y%m%d_%H%M%S)

mkdir -p $BACKUP_DIR
cp $DB_PATH "$BACKUP_DIR/wiz_$DATE.db"

# Keep only last 30 days
find $BACKUP_DIR -name "wiz_*.db" -mtime +30 -delete
EOF

chmod +x /opt/wiz-controller/backup.sh

# Add to crontab (daily at 2 AM)
(crontab -l 2>/dev/null; echo "0 2 * * * /opt/wiz-controller/backup.sh") | crontab -
```

### Restore from Backup

```bash
# Stop service
sudo systemctl stop wiz-controller

# Restore database
cp /opt/wiz-controller/backups/wiz_YYYYMMDD_HHMMSS.db \
   /opt/wiz-controller/data/wiz.db

# Start service
sudo systemctl start wiz-controller
```

### Configuration Backup

```bash
# Backup .env and configs
tar -czf wiz-config-$(date +%Y%m%d).tar.gz \
  .env docker-compose.yml package.json
```

## Troubleshooting

### Service Won't Start

```bash
# Check logs
sudo journalctl -u wiz-controller -n 50

# Check permissions
sudo chown -R wizuser:wizuser /opt/wiz-controller

# Check port availability
sudo netstat -tulpn | grep 3000
```

### Database Issues

```bash
# Check database integrity
sqlite3 /opt/wiz-controller/data/wiz.db "PRAGMA integrity_check;"

# Restore from backup if corrupted
```

### Network Discovery Not Working

```bash
# Check network interface
ip addr show

# Test UDP connectivity
sudo tcpdump -i any udp port 38899

# Verify subnet configuration
ping 192.168.1.1
```

## Performance Tuning

### Node.js Optimization

```bash
# Increase max old space size for large networks
NODE_OPTIONS="--max-old-space-size=2048" npm start
```

### Database Optimization

```sql
-- Run in SQLite CLI
PRAGMA journal_mode=WAL;
PRAGMA synchronous=NORMAL;
PRAGMA cache_size=10000;
VACUUM;
```

### Nginx Caching

```nginx
# Add to nginx config for static assets
location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
    expires 1y;
    add_header Cache-Control "public, immutable";
}
```

## Scaling

For large installations (100+ devices):
- Increase `SCAN_CONCURRENCY` gradually
- Consider multiple controller instances for different subnets
- Use load balancer if serving many clients
- Implement Redis for WebSocket scaling across instances

---

For additional support, see [README.md](../README.md) and [TROUBLESHOOTING.md](./TROUBLESHOOTING.md).
