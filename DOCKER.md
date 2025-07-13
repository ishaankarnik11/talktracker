# Docker Deployment Guide

This guide explains how to run Talk Tracker using Docker containers.

## Quick Start

### Basic Deployment (Development)
```bash
# Build and start the application
docker-compose up -d

# Access the application
open http://localhost:3000
```

### Production Deployment with Nginx
```bash
# Start with Nginx reverse proxy
docker-compose --profile production up -d

# Access via Nginx
open http://localhost
```

## Container Architecture

### Services
- **talk-tracker**: Main Node.js application
- **nginx**: Reverse proxy with rate limiting and caching (optional)

### Volumes
- **talk_tracker_data**: Persistent SQLite database storage

### Networks
- **talk_tracker_network**: Internal bridge network

## Environment Configuration

### Required Environment Variables
```env
# Session security
SESSION_SECRET=your-super-secure-session-secret-change-this

# Email configuration (optional)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
```

### Setting Environment Variables

#### Option 1: Create .env file
```bash
# Create .env file in project root
cat > .env << EOF
SESSION_SECRET=your-super-secure-session-secret-change-this
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
EOF
```

#### Option 2: Edit docker-compose.yml
Update the environment section in `docker-compose.yml`:
```yaml
environment:
  - NODE_ENV=production
  - PORT=3000
  - SESSION_SECRET=your-super-secure-session-secret-change-this
  - SMTP_HOST=smtp.gmail.com
  - SMTP_PORT=587
  - SMTP_USER=your-email@gmail.com
  - SMTP_PASS=your-app-password
```

## Deployment Options

### 1. Development Deployment
```bash
# Build and start
docker-compose up -d

# View logs
docker-compose logs -f

# Stop
docker-compose down
```

### 2. Production Deployment with Nginx
```bash
# Start with Nginx
docker-compose --profile production up -d

# Check status
docker-compose ps

# View application logs
docker-compose logs talk-tracker

# View nginx logs
docker-compose logs nginx
```

### 3. Custom Port
```bash
# Run on different port
PORT=8080 docker-compose up -d
```

## Management Commands

### Container Management
```bash
# Start services
docker-compose up -d

# Stop services
docker-compose down

# Restart services
docker-compose restart

# View logs
docker-compose logs -f [service-name]

# Check status
docker-compose ps
```

### Data Management
```bash
# Backup database
docker-compose exec talk-tracker cp /app/data/interactions.db /tmp/backup.db
docker cp talk-tracker-app:/tmp/backup.db ./backup-$(date +%Y%m%d).db

# Restore database
docker cp ./backup.db talk-tracker-app:/tmp/restore.db
docker-compose exec talk-tracker cp /tmp/restore.db /app/data/interactions.db
docker-compose restart talk-tracker
```

### Development Tools
```bash
# Access container shell
docker-compose exec talk-tracker sh

# Run database queries
docker-compose exec talk-tracker node -e "
const sqlite3 = require('sqlite3');
const db = new sqlite3.Database('./data/interactions.db');
db.all('SELECT * FROM users', (err, rows) => {
  console.log(rows);
  process.exit(0);
});
"

# Check application health
docker-compose exec talk-tracker wget -q --spider http://localhost:3000/api/auth/status
```

## Security Configuration

### Production Security Checklist
- [ ] Change default SESSION_SECRET
- [ ] Configure HTTPS with SSL certificates
- [ ] Enable Nginx security headers
- [ ] Set up firewall rules
- [ ] Configure log rotation
- [ ] Enable monitoring

### SSL/HTTPS Setup
1. Obtain SSL certificates
2. Place certificates in `./ssl/` directory
3. Uncomment HTTPS configuration in `nginx.conf`
4. Update docker-compose.yml to mount SSL certificates

```yaml
volumes:
  - ./ssl:/etc/nginx/ssl:ro
```

## Monitoring and Maintenance

### Health Checks
The application includes built-in health checks:
```bash
# Check application health
curl http://localhost:3000/api/auth/status

# Check via Docker
docker-compose exec talk-tracker wget -q --spider http://localhost:3000/api/auth/status
```

### Resource Limits
Current limits per container:
- Memory: 512MB limit, 256MB reservation
- CPU: 0.5 cores limit, 0.25 cores reservation

### Log Management
```bash
# View recent logs
docker-compose logs --tail=100 -f

# Rotate logs (if needed)
docker-compose logs --no-log-prefix talk-tracker > app.log
docker-compose restart talk-tracker
```

## Troubleshooting

### Common Issues

#### Port Already in Use
```bash
# Check what's using the port
netstat -tulpn | grep :3000

# Use different port
PORT=8080 docker-compose up -d
```

#### Database Permission Issues
```bash
# Fix data directory permissions
docker-compose exec talk-tracker chown -R talktracker:nodejs /app/data
```

#### Email Not Working
```bash
# Test email configuration
docker-compose exec talk-tracker node test-email.js your-email@example.com
```

#### Container Won't Start
```bash
# Check container logs
docker-compose logs talk-tracker

# Rebuild container
docker-compose build --no-cache
docker-compose up -d
```

### Performance Tuning

#### Increase Resource Limits
Edit `docker-compose.yml`:
```yaml
deploy:
  resources:
    limits:
      memory: 1G
      cpus: '1.0'
```

#### Enable Nginx Caching
Uncomment caching directives in `nginx.conf`.

## Updates and Maintenance

### Updating the Application
```bash
# Pull latest changes
git pull

# Rebuild and restart
docker-compose build --no-cache
docker-compose up -d

# Clean up old images
docker image prune -f
```

### Backup Strategy
```bash
#!/bin/bash
# backup.sh
DATE=$(date +%Y%m%d_%H%M%S)
docker-compose exec talk-tracker cp /app/data/interactions.db /tmp/backup.db
docker cp talk-tracker-app:/tmp/backup.db ./backups/interactions_$DATE.db
echo "Backup created: ./backups/interactions_$DATE.db"
```

## Production Deployment Checklist

Before deploying to production:

1. **Security**
   - [ ] Change SESSION_SECRET
   - [ ] Configure HTTPS
   - [ ] Set up firewall
   - [ ] Review Nginx security headers

2. **Configuration**
   - [ ] Set NODE_ENV=production
   - [ ] Configure email settings
   - [ ] Set resource limits
   - [ ] Configure log rotation

3. **Monitoring**
   - [ ] Set up health check monitoring
   - [ ] Configure alerting
   - [ ] Set up backup automation
   - [ ] Test disaster recovery

4. **Testing**
   - [ ] Test all functionality
   - [ ] Verify email sending
   - [ ] Test backup/restore
   - [ ] Load testing

## Support

For issues with containerization:
1. Check container logs: `docker-compose logs`
2. Verify environment variables
3. Check Docker and docker-compose versions
4. Review the main README.md for application-specific issues