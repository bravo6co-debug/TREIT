# TreitMaster 배포 가이드

## 개요

TreitMaster 프로젝트의 로컬, 스테이징, 프로덕션 환경 배포 방법을 설명합니다.

## 아키텍처 개요

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   treit-app     │    │ treit-advertiser│    │   treit-admin   │
│   (Port 9000)   │    │   (Port 9001)   │    │   (Port 9002)   │
│   사용자 앱      │    │    광고주 앱     │    │    관리자 앱     │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         └───────────────────────┼───────────────────────┘
                                 │
                    ┌─────────────────┐
                    │   Supabase      │
                    │   - Database    │
                    │   - Auth        │
                    │   - Functions   │
                    │   - Storage     │
                    └─────────────────┘
```

## 환경 설정

### 환경별 구성

1. **Development (로컬 개발)**
   - Supabase Local Development
   - Vite Dev Server
   - Hot Module Replacement

2. **Staging (스테이징)**
   - Supabase Staging Project
   - Preview Deployments
   - 프로덕션과 동일한 설정

3. **Production (프로덕션)**
   - Supabase Production Project
   - CDN 및 최적화
   - 모니터링 및 로깅

### 환경 변수

각 환경별로 설정해야 할 환경 변수들:

#### 공통 환경 변수

```env
# Supabase 설정
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key

# 앱 환경 설정
VITE_APP_ENV=development|staging|production
VITE_APP_VERSION=1.0.0

# API 설정
VITE_API_BASE_URL=https://your-project.supabase.co

# 외부 서비스
VITE_PAYMENT_GATEWAY_URL=https://api.payment-provider.com
VITE_ANALYTICS_ID=your_analytics_id

# 로깅
VITE_LOG_LEVEL=info|debug|error
VITE_ENABLE_LOGGING=true|false
```

#### 개발 환경 (.env.local)

```env
VITE_APP_ENV=development
VITE_SUPABASE_URL=http://localhost:54321
VITE_SUPABASE_ANON_KEY=your_local_anon_key
VITE_LOG_LEVEL=debug
VITE_ENABLE_LOGGING=true
```

#### 스테이징 환경 (.env.staging)

```env
VITE_APP_ENV=staging
VITE_SUPABASE_URL=https://staging-project.supabase.co
VITE_SUPABASE_ANON_KEY=staging_anon_key
VITE_LOG_LEVEL=info
VITE_ENABLE_LOGGING=true
```

#### 프로덕션 환경 (.env.production)

```env
VITE_APP_ENV=production
VITE_SUPABASE_URL=https://production-project.supabase.co
VITE_SUPABASE_ANON_KEY=production_anon_key
VITE_LOG_LEVEL=error
VITE_ENABLE_LOGGING=false
```

## 로컬 배포

### 1. 저장소 클론 및 설정

```bash
# 저장소 클론
git clone https://github.com/your-username/treitmaster.git
cd treitmaster

# 의존성 설치
npm run install:all
```

### 2. Supabase 로컬 환경 설정

```bash
# Supabase CLI 설치 (필요한 경우)
npm install -g supabase

# 로컬 Supabase 시작
npm run supabase:start

# 데이터베이스 마이그레이션 적용
npm run supabase:reset

# 시드 데이터 로드 (선택사항)
supabase db seed
```

### 3. 개발 서버 실행

```bash
# 모든 앱 동시 실행
npm run dev

# 개별 앱 실행
npm run dev:user        # http://localhost:9000
npm run dev:advertiser  # http://localhost:9001
npm run dev:admin       # http://localhost:9002
```

### 4. 로컬 환경 확인

- 사용자 앱: http://localhost:9000
- 광고주 앱: http://localhost:9001
- 관리자 앱: http://localhost:9002
- Supabase Studio: http://localhost:54323

## Docker를 사용한 배포

### 1. Docker Compose로 전체 스택 실행

```bash
# Docker 이미지 빌드 및 실행
npm run docker:up

# 로그 확인
npm run docker:logs

# 서비스 중지
npm run docker:down
```

### 2. 개별 Docker 이미지 빌드

```bash
# 사용자 앱
cd treit-app
docker build -t treit-app .

# 광고주 앱
cd treit-advertiser
docker build -t treit-advertiser .

# 관리자 앱
cd treit-admin
docker build -t treit-admin .
```

## 클라우드 배포

### Vercel 배포 (권장)

#### 1. Vercel CLI 설정

```bash
# Vercel CLI 설치
npm install -g vercel

# 로그인
vercel login

# 프로젝트 연결
vercel link
```

#### 2. 환경 변수 설정

```bash
# 스테이징 환경 변수
vercel env add VITE_SUPABASE_URL preview
vercel env add VITE_SUPABASE_ANON_KEY preview

# 프로덕션 환경 변수
vercel env add VITE_SUPABASE_URL production
vercel env add VITE_SUPABASE_ANON_KEY production
```

#### 3. 배포 설정 파일

각 앱의 `vercel.json`:

```json
{
  "version": 2,
  "builds": [
    {
      "src": "package.json",
      "use": "@vercel/static-build",
      "config": {
        "distDir": "dist"
      }
    }
  ],
  "routes": [
    {
      "src": "/(.*)",
      "dest": "/index.html"
    }
  ],
  "env": {
    "VITE_SUPABASE_URL": "@vite_supabase_url",
    "VITE_SUPABASE_ANON_KEY": "@vite_supabase_anon_key"
  }
}
```

#### 4. 배포 실행

```bash
# 스테이징 배포
vercel --target preview

# 프로덕션 배포
vercel --target production

# 또는 자동 배포 (GitHub 연동 시)
git push origin main
```

### Netlify 배포

#### 1. 빌드 설정

`netlify.toml`:

```toml
[build]
  base = "treit-app/"
  publish = "dist/"
  command = "npm run build"

[build.environment]
  NODE_VERSION = "18"

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200

[context.production]
  environment = { VITE_APP_ENV = "production" }

[context.branch-deploy]
  environment = { VITE_APP_ENV = "staging" }
```

#### 2. 환경 변수 설정

Netlify 대시보드에서 설정:
- Site settings > Environment variables
- 각 환경별로 필요한 변수 추가

### AWS 배포

#### 1. S3 + CloudFront 배포

```bash
# AWS CLI 설치 및 설정
aws configure

# S3 버킷 생성
aws s3 mb s3://treitmaster-app

# 빌드 후 업로드
npm run build
aws s3 sync dist/ s3://treitmaster-app --delete

# CloudFront 무효화
aws cloudfront create-invalidation \
  --distribution-id YOUR_DISTRIBUTION_ID \
  --paths "/*"
```

#### 2. Amplify 배포

```bash
# Amplify CLI 설치
npm install -g @aws-amplify/cli

# 프로젝트 초기화
amplify init

# 호스팅 추가
amplify add hosting

# 배포
amplify publish
```

## Supabase 환경 설정

### 1. Supabase 프로젝트 생성

```bash
# 새 프로젝트 생성 (Supabase 대시보드에서)
# 또는 CLI로
supabase projects create treitmaster-production

# 로컬 프로젝트와 연결
supabase link --project-ref YOUR_PROJECT_REF
```

### 2. 데이터베이스 마이그레이션

```bash
# 스키마 배포
supabase db push

# 또는 마이그레이션 파일 사용
supabase migration up
```

### 3. Functions 배포

```bash
# 모든 함수 배포
supabase functions deploy

# 특정 함수 배포
supabase functions deploy process-payment
```

### 4. 환경 변수 설정

```bash
# Supabase 프로젝트 환경 변수
supabase secrets set PAYMENT_API_KEY=your_api_key
supabase secrets set WEBHOOK_SECRET=your_webhook_secret
```

## CI/CD 파이프라인

### GitHub Actions 워크플로우

```yaml
name: Deploy to Production

on:
  push:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm ci
      - run: npm run test

  deploy:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      # 사용자 앱 배포
      - name: Deploy User App
        run: |
          cd treit-app
          npm ci
          npm run build
          vercel --token ${{ secrets.VERCEL_TOKEN }} --prod
      
      # 광고주 앱 배포
      - name: Deploy Advertiser App
        run: |
          cd treit-advertiser
          npm ci
          npm run build
          vercel --token ${{ secrets.VERCEL_TOKEN }} --prod
      
      # 관리자 앱 배포
      - name: Deploy Admin App
        run: |
          cd treit-admin
          npm ci
          npm run build
          vercel --token ${{ secrets.VERCEL_TOKEN }} --prod
```

## 도메인 설정

### 커스텀 도메인 연결

1. **DNS 설정**
   ```
   app.treitmaster.com      → 사용자 앱
   advertiser.treitmaster.com → 광고주 앱
   admin.treitmaster.com    → 관리자 앱
   ```

2. **SSL 인증서**
   - Let's Encrypt (자동)
   - CloudFlare (권장)
   - AWS Certificate Manager

3. **CORS 설정**
   ```typescript
   // Supabase CORS 설정
   const corsOrigins = [
     'https://app.treitmaster.com',
     'https://advertiser.treitmaster.com',
     'https://admin.treitmaster.com'
   ];
   ```

## 성능 최적화

### 1. 빌드 최적화

```bash
# 프로덕션 빌드
npm run build

# 번들 분석
npm run build:analyze
```

### 2. CDN 설정

- 정적 자산 CDN 배포
- 이미지 최적화
- 캐싱 정책 설정

### 3. 모니터링 설정

```typescript
// 성능 모니터링
import { getCLS, getFID, getFCP, getLCP, getTTFB } from 'web-vitals';

getCLS(console.log);
getFID(console.log);
getFCP(console.log);
getLCP(console.log);
getTTFB(console.log);
```

## 모니터링 및 로깅

### 1. 애플리케이션 모니터링

- **Sentry**: 에러 추적
- **LogRocket**: 사용자 세션 재생
- **DataDog**: APM 및 로그 수집

### 2. 인프라 모니터링

- **Vercel Analytics**: 성능 메트릭
- **Supabase Metrics**: 데이터베이스 성능
- **CloudFlare Analytics**: 트래픽 분석

### 3. 알림 설정

```yaml
# .github/workflows/monitor.yml
- name: Health Check
  run: |
    curl -f https://app.treitmaster.com/health || exit 1
    curl -f https://advertiser.treitmaster.com/health || exit 1
    curl -f https://admin.treitmaster.com/health || exit 1
```

## 백업 및 복구

### 1. 데이터베이스 백업

```bash
# Supabase 데이터베이스 백업
supabase db dump --file=backup.sql

# 복구
supabase db reset --from-file backup.sql
```

### 2. 저장소 백업

```bash
# Supabase Storage 백업 스크립트
node scripts/backup-storage.js

# 복구
node scripts/restore-storage.js
```

## 보안 설정

### 1. 환경 변수 보안

- **절대 하지 말 것**: `.env` 파일을 Git에 커밋
- **권장사항**: 환경별 secret 관리 도구 사용

### 2. HTTPS 강제

```typescript
// vite.config.ts
export default defineConfig({
  server: {
    https: process.env.NODE_ENV === 'production'
  }
});
```

### 3. Content Security Policy

```html
<meta http-equiv="Content-Security-Policy" 
      content="default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline';">
```

## 트러블슈팅

### 자주 발생하는 배포 문제

1. **빌드 실패**
   ```bash
   # 캐시 정리
   rm -rf node_modules package-lock.json
   npm install
   
   # 타입 체크
   npm run typecheck
   ```

2. **환경 변수 누락**
   ```bash
   # 환경 변수 확인
   echo $VITE_SUPABASE_URL
   
   # Vercel 환경 변수 확인
   vercel env ls
   ```

3. **CORS 에러**
   - Supabase 대시보드에서 허용된 origin 확인
   - 로컬 개발 시 `localhost` 포함 확인

4. **라우팅 문제**
   - SPA 라우팅을 위한 fallback 설정 확인
   - `_redirects` 또는 `vercel.json` 설정 확인

### 로그 확인

```bash
# Vercel 로그
vercel logs

# Supabase Functions 로그
supabase functions logs process-payment

# Docker 로그
docker logs treitmaster-app
```

## 롤백 절차

### 1. 즉시 롤백

```bash
# Vercel 이전 배포로 롤백
vercel rollback

# GitHub을 통한 롤백
git revert HEAD
git push origin main
```

### 2. 데이터베이스 롤백

```bash
# 마이그레이션 롤백
supabase migration down

# 특정 시점으로 복원
supabase db reset --from-backup backup-20240101.sql
```

## 체크리스트

### 배포 전 확인사항

- [ ] 모든 테스트 통과
- [ ] 타입스크립트 에러 없음
- [ ] 환경 변수 설정 완료
- [ ] 데이터베이스 마이그레이션 적용
- [ ] 보안 설정 확인
- [ ] 성능 테스트 완료

### 배포 후 확인사항

- [ ] 모든 앱 정상 동작
- [ ] API 엔드포인트 동작
- [ ] 인증 플로우 정상
- [ ] 결제 시스템 동작
- [ ] 모니터링 알림 설정
- [ ] 백업 스케줄 확인

## 지원 및 문의

배포 관련 문제나 질문:

1. **문서 확인**: 이 배포 가이드 재검토
2. **이슈 검색**: GitHub Issues에서 유사한 문제 검색
3. **새 이슈 생성**: 적절한 라벨과 상세한 정보 포함
4. **팀 연락**: Slack 또는 이메일로 긴급 지원 요청

---

*이 문서는 프로젝트 진행에 따라 지속적으로 업데이트됩니다.*