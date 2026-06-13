# Shosha V2 — Backend Deployment Guide

## Overview
FastAPI backend, PostgreSQL 16 database, Docker containerized.
Target: AWS EC2 + RDS + S3.

## Infrastructure Required

| Service | Spec | Purpose |
|---------|------|---------|
| EC2 | t3.small, Ubuntu 22.04 | Run Docker container |
| RDS | PostgreSQL 16, db.t3.micro | Production database |
| S3 | Existing bucket | Media uploads |
| Domain | api.noshosha.com (or similar) | API endpoint |

## Security Groups
- EC2: inbound port 22 (SSH), port 8000 (API) or 80/443 with Nginx
- RDS: inbound port 5432 from EC2 security group only (no public access)

## Environment Variables

| Variable | Required | Where to get it |
|----------|----------|-----------------|
| DATABASE_URL | Yes | RDS endpoint after creation. Format: postgresql+asyncpg://user:pass@host:5432/shosha_v2 |
| FIREBASE_PROJECT_ID | Yes | Firebase console → Project settings |
| FIREBASE_SERVICE_ACCOUNT_JSON | Yes | Firebase console → Project settings → Service accounts → Generate key |
| SECRET_KEY | Yes | Generate random string: python -c "import secrets; print(secrets.token_hex(32))" |
| ENVIRONMENT | Yes | Set to: production |
| ALLOWED_ORIGINS | Yes | Frontend URL e.g. https://noshosha.com,https://www.noshosha.com |
| GEMINI_API_KEY | Yes | Google AI Studio |
| GEMINI_MODEL | No | Default: gemini-1.5-pro-latest |
| GEMINI_DISCOVERY_MODEL | No | Default: gemini-3-pro-preview |
| AWS_ACCESS_KEY_ID | Yes | IAM user credentials |
| AWS_SECRET_ACCESS_KEY | Yes | IAM user credentials |
| AWS_S3_BUCKET | Yes | S3 bucket name |
| AWS_REGION | No | Default: ap-south-1 |
| UPSTASH_REDIS_REST_URL | No | Upstash console (enables rate limiting) |
| UPSTASH_REDIS_REST_TOKEN | No | Upstash console |
| CRON_TOKEN | No | Shared secret for `POST/GET /api/v1/cron/weekly-momentum`; required in production for scheduled jobs |

## S3 Bucket Requirements
Before deployment, ensure the S3 bucket has:
1. Block public access: OFF
2. Object Ownership: ACLs enabled
3. IAM user permissions (attach this policy to the IAM user):

{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": ["s3:PutObject", "s3:PutObjectAcl"],
      "Resource": "arn:aws:s3:::YOUR_BUCKET_NAME/uploads/*"
    }
  ]
}

## Deployment Steps

### Step 1 — EC2 Setup
SSH into the EC2 instance and install Docker:

sudo apt update && sudo apt install -y docker.io
sudo systemctl start docker
sudo systemctl enable docker
sudo usermod -aG docker ubuntu

### Step 2 — Clone Repository
git clone <repo-url>
cd shosha/backend

### Step 3 — Configure Environment
cp .env.example .env
nano .env

Fill in all required variables. DATABASE_URL should point to RDS endpoint.

### Step 4 — Build Docker Image
docker build -t shosha-backend .

### Step 5 — Run Container
docker run -d \
  -p 8000:8000 \
  --env-file .env \
  --name shosha-api \
  --restart unless-stopped \
  shosha-backend

### Step 6 — Run Database Migrations
docker exec shosha-api alembic upgrade head

Expected output: INFO [alembic.runtime.migration] Running upgrade ...

### Step 7 — Verify Deployment
curl http://YOUR_EC2_IP:8000/health

Expected response:
{"ok":true,"data":{"status":"healthy"}}

### Step 8 — Nginx Reverse Proxy (Recommended)
Install Nginx for SSL termination:

sudo apt install -y nginx

Create /etc/nginx/sites-available/shosha:

server {
    listen 80;
    server_name api.noshosha.com;

    location / {
        proxy_pass http://localhost:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}

sudo ln -s /etc/nginx/sites-available/shosha /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx

Then add SSL with Certbot:
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d api.noshosha.com

## Troubleshooting

| Issue | Check |
|-------|-------|
| Container won't start | docker logs shosha-api |
| Database connection failed | Verify DATABASE_URL and RDS security group |
| 401 on all requests | Check FIREBASE_SERVICE_ACCOUNT_JSON is valid JSON on one line |
| S3 upload failing | Check IAM permissions and bucket ACL settings |
| Rate limiting not working | Check UPSTASH_REDIS_REST_URL and TOKEN are set |

## Useful Commands

# View logs
docker logs -f shosha-api

# Restart container
docker restart shosha-api

# Check running containers
docker ps

# Run migrations manually
docker exec shosha-api alembic upgrade head

# Check current migration
docker exec shosha-api alembic current

## Health Check
GET /health returns:
{"ok":true,"data":{"status":"healthy"}}

Use this as the load balancer health check endpoint.

## Scheduled Jobs — Weekly Momentum

The weekly-momentum job rolls ledger deltas into each account's `w1_delta`, `w2_delta`, and `w3_delta` fields (exposed as `weekly_delta` on account API responses). V2 does **not** run this on a timer inside the API process — you must trigger it from an external scheduler (cron, GitHub Actions, AWS EventBridge, etc.).

### Configuration

Set a non-empty shared secret in the backend environment:

| Variable | Required | Purpose |
|----------|----------|---------|
| CRON_TOKEN | Yes (production) | Bearer token for `POST/GET /api/v1/cron/weekly-momentum` |

Auth accepts either `Authorization: Bearer <CRON_TOKEN>` **or** a Firebase JWT for an active `ADMIN` / `SUPER_ADMIN` user.

### Run the job (production)

```bash
curl -X POST "${API_URL}/api/v1/cron/weekly-momentum" \
  -H "Authorization: Bearer ${CRON_TOKEN}"
```

Expected success envelope:

```json
{"ok":true,"data":{"accounts_updated":42,"run_at":"2026-06-13T12:00:00+00:00"}}
```

### Status check

```bash
curl -X GET "${API_URL}/api/v1/cron/weekly-momentum" \
  -H "Authorization: Bearer ${CRON_TOKEN}"
```

Returns `last_run_at`, `accounts_with_momentum`, and `engine`.

### Local verification

1. Add `CRON_TOKEN=<your-local-secret>` to the project root `.env` (see [`PROJECT_SETUP.md`](./PROJECT_SETUP.md)).
2. Restart the backend so settings reload.
3. Run the POST curl against `http://127.0.0.1:8000`.
4. Confirm `GET /api/v1/accounts/{id}` returns a populated `weekly_delta` for a seeded account with ledger entries.

Recommended schedule: once per day (V1 used a daily cron). Adjust to your ops needs.
