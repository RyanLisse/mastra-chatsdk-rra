# Deployment Guide - Mastra Chat SDK

This guide provides step-by-step instructions for deploying the Mastra Chat SDK to various platforms.

## 🚀 Quick Deploy to Vercel (Recommended)

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/your-repo/mastra-chatsdk-rra&env=AUTH_SECRET,POSTGRES_URL,OPENAI_API_KEY,COHERE_API_KEY,BLOB_READ_WRITE_TOKEN&envDescription=Required%20environment%20variables&envLink=https://github.com/your-repo/mastra-chatsdk-rra/blob/main/.env.example)

## 🏗️ Vercel Deployment (Step by Step)

### Prerequisites

1. **Vercel Account**: [Sign up for Vercel](https://vercel.com/signup)
2. **GitHub Repository**: Push your code to GitHub
3. **PostgreSQL Database**: Choose one:
   - [Vercel Postgres](https://vercel.com/storage/postgres) (Recommended)
   - [Neon](https://neon.tech/) (Free tier available)
   - [PlanetScale](https://planetscale.com/)
   - [Supabase](https://supabase.com/)

### Step 1: Database Setup

#### Option A: Vercel Postgres (Recommended)
```bash
# Install Vercel CLI
npm i -g vercel

# Login to Vercel
vercel login

# Create Postgres database
vercel postgres create mastra-chat-db
```

#### Option B: Neon Database
1. Go to [Neon Console](https://console.neon.tech/)
2. Create new project
3. Copy connection string
4. Enable pgvector extension in SQL Editor:
   ```sql
   CREATE EXTENSION IF NOT EXISTS vector;
   ```

### Step 2: Environment Variables Setup

#### Required Variables
Set these in your Vercel project dashboard:

```env
AUTH_SECRET=your-32-character-secret
POSTGRES_URL=your-database-connection-string
OPENAI_API_KEY=sk-your-openai-api-key
COHERE_API_KEY=your-cohere-api-key
BLOB_READ_WRITE_TOKEN=your-vercel-blob-token
```

#### Optional Variables (for enhanced features)
```env
LANGSMITH_API_KEY=ls__your-langsmith-api-key
LANGSMITH_PROJECT=your-project-name
XAI_API_KEY=xai-your-xai-api-key
```

### Step 3: Deploy Application

#### Method 1: Vercel Dashboard
1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Click "New Project"
3. Import your GitHub repository
4. Configure environment variables
5. Deploy

#### Method 2: CLI Deployment
```bash
# Clone repository
git clone your-repository-url
cd mastra-chatsdk-rra

# Link to Vercel project
vercel link

# Set environment variables
vercel env add AUTH_SECRET
vercel env add POSTGRES_URL
vercel env add OPENAI_API_KEY
vercel env add COHERE_API_KEY
vercel env add BLOB_READ_WRITE_TOKEN

# Deploy
vercel --prod
```

### Step 4: Database Migration

After deployment, run database migrations:

```bash
# Pull environment variables
vercel env pull .env.production

# Run migrations (happens automatically during build)
# Or manually: npx tsx lib/db/migrate.ts
```

### Step 5: Verification

1. **Test Authentication**: Try logging in/registering
2. **Test Chat**: Send a message and verify response
3. **Test Voice**: Enable microphone and test voice chat
4. **Test Document Upload**: Upload a test document
5. **Check Observability**: Verify LangSmith traces (if configured)

## 🐳 Docker Deployment

### Dockerfile

```dockerfile
FROM node:18-alpine AS base

# Install dependencies only when needed
FROM base AS deps
WORKDIR /app

# Install dependencies based on the preferred package manager
COPY package.json package-lock.json* ./
RUN npm ci --only=production

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Set environment variables for build
ENV NEXT_TELEMETRY_DISABLED 1
ENV NODE_ENV production

# Build application
RUN npm run build

# Production image, copy all the files and run next
FROM base AS runner
WORKDIR /app

ENV NODE_ENV production
ENV NEXT_TELEMETRY_DISABLED 1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy built application
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

ENV PORT 3000
ENV HOSTNAME "0.0.0.0"

CMD ["node", "server.js"]
```

### Docker Compose

```yaml
version: '3.8'

services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - AUTH_SECRET=${AUTH_SECRET}
      - POSTGRES_URL=${POSTGRES_URL}
      - OPENAI_API_KEY=${OPENAI_API_KEY}
      - COHERE_API_KEY=${COHERE_API_KEY}
      - BLOB_READ_WRITE_TOKEN=${BLOB_READ_WRITE_TOKEN}
    depends_on:
      - postgres

  postgres:
    image: ankane/pgvector
    environment:
      POSTGRES_DB: mastra_chat
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: password
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

volumes:
  postgres_data:
```

### Build and Run

```bash
# Build and run with Docker Compose
docker-compose up --build

# Or build manually
docker build -t mastra-chat-sdk .
docker run -p 3000:3000 --env-file .env.production mastra-chat-sdk
```

## ☁️ Alternative Cloud Platforms

### Railway

1. **Create Railway Account**: [railway.app](https://railway.app)
2. **Deploy from GitHub**:
   ```bash
   # Install Railway CLI
   npm install -g @railway/cli
   
   # Login and deploy
   railway login
   railway link
   railway up
   ```
3. **Add Database**: Add PostgreSQL service in Railway dashboard
4. **Set Environment Variables**: Configure in Railway dashboard

### Render

1. **Create Render Account**: [render.com](https://render.com)
2. **Create Web Service**: Connect GitHub repository
3. **Configure Build Settings**:
   - Build Command: `npm run build`
   - Start Command: `npm start`
4. **Add PostgreSQL Database**: Create PostgreSQL service
5. **Set Environment Variables**: Configure in Render dashboard

### Netlify

1. **Create Netlify Account**: [netlify.com](https://netlify.com)
2. **Deploy from GitHub**: Connect repository
3. **Add Database**: Use external PostgreSQL service
4. **Configure Functions**: Set up serverless functions for API routes
5. **Set Environment Variables**: Configure in Netlify dashboard

## 🔧 Production Configuration

### Performance Optimization

#### Next.js Configuration
```typescript
// next.config.ts
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ['gray-matter'],
  },
  compress: true,
  poweredByHeader: false,
  generateEtags: false,
  httpAgentOptions: {
    keepAlive: true,
  },
}
```

#### CDN Configuration
```json
{
  "headers": [
    {
      "source": "/_next/static/(.*)",
      "headers": [
        {
          "key": "Cache-Control",
          "value": "public, max-age=31536000, immutable"
        }
      ]
    }
  ]
}
```

### Security Configuration

#### Environment Variables
```env
# Security headers
SECURE_HEADERS=true
CSP_NONCE=true

# Rate limiting
API_RATE_LIMIT=100
API_RATE_WINDOW=60

# CORS configuration
CORS_ORIGINS=https://yourdomain.com,https://www.yourdomain.com
```

#### Security Headers
Add to `middleware.ts`:
```typescript
export function middleware(request: NextRequest) {
  const response = NextResponse.next()
  
  response.headers.set('X-Frame-Options', 'DENY')
  response.headers.set('X-Content-Type-Options', 'nosniff')
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  
  return response
}
```

### Monitoring Setup

#### Error Tracking with Sentry
```bash
# Install Sentry
npm install @sentry/nextjs

# Configure sentry.client.config.ts
import * as Sentry from "@sentry/nextjs"

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  tracesSampleRate: 1.0,
})
```

#### Analytics with PostHog
```typescript
// lib/posthog.ts
import { PostHog } from 'posthog-node'

export const posthog = new PostHog(
  process.env.NEXT_PUBLIC_POSTHOG_KEY!,
  { host: process.env.NEXT_PUBLIC_POSTHOG_HOST }
)
```

## 🔄 CI/CD Pipeline

### GitHub Actions

```yaml
# .github/workflows/deploy.yml
name: Deploy to Vercel

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: 18
          cache: 'npm'
      
      - run: npm ci
      - run: npm run lint
      - run: npm run test:unit
      - run: npm run build

  deploy:
    needs: test
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    steps:
      - uses: actions/checkout@v3
      - uses: amondnet/vercel-action@v20
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.ORG_ID }}
          vercel-project-id: ${{ secrets.PROJECT_ID }}
          vercel-args: '--prod'
```

## 📊 Post-Deployment Checklist

### Functionality Tests
- [ ] User authentication works
- [ ] Chat conversations function properly  
- [ ] Voice interactions work (if enabled)
- [ ] Document uploads process successfully
- [ ] RAG system returns relevant results
- [ ] Error handling displays appropriate messages

### Performance Tests
- [ ] Page load times < 3 seconds
- [ ] API response times < 2 seconds
- [ ] Database queries optimized
- [ ] CDN serving static assets
- [ ] Compression enabled

### Security Tests
- [ ] HTTPS enforced
- [ ] Security headers present
- [ ] API rate limiting active
- [ ] Environment variables secured
- [ ] Database connections encrypted

### Monitoring Setup
- [ ] Error tracking configured
- [ ] Performance monitoring active
- [ ] Database monitoring enabled
- [ ] API usage tracking setup
- [ ] Alerting configured

## 🚨 Troubleshooting

### Common Deployment Issues

#### Build Failures
```bash
# Clear cache and retry
rm -rf .next node_modules
npm install
npm run build
```

#### Database Connection Issues
```bash
# Test database connection
npx tsx -e "
import { sql } from '@vercel/postgres';
console.log(await sql\`SELECT version();\`);
"
```

#### Environment Variable Issues
```bash
# Check environment variables
vercel env ls
vercel env pull .env.check
```

#### Memory Issues
```typescript
// Increase memory for build (if needed)
// In package.json
{
  "scripts": {
    "build": "NODE_OPTIONS='--max-old-space-size=4096' next build"
  }
}
```

### Performance Issues

#### Database Optimization
```sql
-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_messages_chat_id ON "Message_v2"("chatId");
CREATE INDEX IF NOT EXISTS idx_chat_user_id ON "Chat"("userId");
CREATE INDEX IF NOT EXISTS idx_chunks_embedding ON "DocumentChunk" USING ivfflat (embedding vector_cosine_ops);
```

#### Caching Setup
```typescript
// Add Redis caching
import { Redis } from '@upstash/redis'

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
})
```

## 📞 Support

For deployment issues:
- Check the [troubleshooting guide](README.md#troubleshooting)
- Open an [issue on GitHub](https://github.com/your-repo/issues)
- Contact support at: support@yourdomain.com

---

✅ **Deployment Complete!** Your Mastra Chat SDK is now live and ready to use.