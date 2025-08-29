# Treit - CPC 기반 인플루언서 마케팅 플랫폼

## 📌 프로젝트 개요

**Treit**은 일반 사용자들이 기업의 홍보 템플릿을 자신의 SNS에 공유하고, 클릭당 리워드를 받을 수 있는 CPC(Cost Per Click) 기반 마케팅 플랫폼입니다.

### 핵심 가치
- 🎯 **사용자**: 간단한 복사-붙여넣기로 부수입 창출
- 💼 **광고주**: 효과적이고 투명한 마케팅 채널
- 📊 **플랫폼**: 자동화된 추적 및 정산 시스템

## 🏗️ 시스템 구성

### 3개의 독립 애플리케이션

| 시스템 | 경로 | 기술 스택 | 설명 |
|--------|------|-----------|------|
| **사용자 앱** | `/treit-app` | React + Vite | 일반 사용자용 모바일 웹앱 |
| **광고주 사이트** | `/treit-advertiser` | React + Vite | 광고주 캠페인 관리 대시보드 |
| **관리자 대시보드** | `/treit-admin` | React + Vite | 시스템 전체 모니터링 및 관리 |

## 🛠️ 기술 스택

### Backend
- **Supabase**: PostgreSQL 데이터베이스, 인증, 실시간 구독
- **Edge Functions**: 서버리스 API (Deno)
- **Row Level Security**: 데이터 보안

### Frontend
- **React + TypeScript**: 타입 안정성
- **Tailwind CSS**: 유틸리티 기반 스타일링
- **Shadcn/UI**: 재사용 가능한 컴포넌트
- **Vite**: 빠른 개발 환경

### Infrastructure
- **Vercel**: 프론트엔드 배포
- **Supabase Cloud**: 백엔드 인프라
- **PostHog**: 분석 및 모니터링
- **Sentry**: 에러 추적

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- pnpm (권장) 또는 npm
- Supabase CLI
- Git

### 설치 및 실행

```bash
# 저장소 클론
git clone https://github.com/your-username/TreitMaster.git
cd TreitMaster

# 의존성 설치 (각 앱별로)
cd treit-app && pnpm install
cd ../treit-advertiser && pnpm install
cd ../treit-admin && pnpm install

# 환경변수 설정 (각 앱의 .env.example 참고)
cp .env.example .env.local

# 개발 서버 실행
pnpm dev
```

### Supabase 설정

```bash
# Supabase CLI 로그인
supabase login

# 프로젝트 초기화
supabase init

# 데이터베이스 마이그레이션
supabase db push

# Edge Functions 배포
supabase functions deploy
```

## 📁 프로젝트 구조

```
TreitMaster/
├── treit-app/              # 사용자 앱
│   ├── src/
│   │   ├── components/     # UI 컴포넌트
│   │   ├── lib/           # 유틸리티
│   │   └── styles/        # 스타일
│   └── package.json
│
├── treit-advertiser/       # 광고주 대시보드
│   ├── src/
│   │   ├── components/
│   │   ├── lib/
│   │   └── styles/
│   └── package.json
│
├── treit-admin/           # 관리자 대시보드
│   ├── src/
│   │   ├── components/
│   │   ├── lib/
│   │   └── styles/
│   └── package.json
│
├── supabase/              # Supabase 설정
│   ├── migrations/        # DB 스키마
│   ├── functions/         # Edge Functions
│   └── config.toml        # 설정 파일
│
├── shared/                # 공통 코드
│   ├── types/            # TypeScript 타입
│   └── utils/            # 공통 유틸리티
│
└── docs/                  # 문서
    ├── ARCHITECTURE.md    # 시스템 설계
    ├── DATABASE.md        # DB 설계
    ├── API.md            # API 명세
    └── DEPLOYMENT.md     # 배포 가이드
```

## 🔑 주요 기능

### 사용자 앱
- ✅ SNS 계정 연동
- ✅ 캠페인 템플릿 복사
- ✅ 실시간 수익 추적
- ✅ 레벨업 시스템
- ✅ 리워드 상점

### 광고주 사이트
- ✅ 캠페인 생성/관리
- ✅ 실시간 성과 분석
- ✅ 예산 관리
- ✅ 타겟팅 설정
- ✅ 결제 시스템

### 관리자 대시보드
- ✅ 사용자/광고주 관리
- ✅ 캠페인 승인
- ✅ 어뷰징 감지
- ✅ 정산 관리
- ✅ 시스템 모니터링

## 📊 데이터베이스 스키마

주요 테이블:
- `users` - 사용자 정보
- `businesses` - 광고주 정보
- `campaigns` - 캠페인 데이터
- `templates` - 홍보 템플릿
- `click_events` - 클릭 추적
- `user_earnings` - 수익 관리
- `business_billing` - 결제 정보

자세한 스키마는 [DATABASE.md](./DATABASE.md) 참고

## 🔒 보안

- **Row Level Security (RLS)**: 모든 테이블에 적용
- **인증**: Supabase Auth (JWT)
- **권한 관리**: RBAC 기반
- **어뷰징 방지**: IP 추적, 중복 클릭 방지
- **웹훅 검증**: 서명 검증

## 📈 모니터링

- **PostHog**: 사용자 행동 분석
- **Sentry**: 에러 추적
- **Supabase Dashboard**: DB 모니터링
- **Vercel Analytics**: 성능 모니터링

## 🚢 배포

### Production 환경
- **Frontend**: Vercel
- **Backend**: Supabase Cloud
- **Domain**: tre-it.com (예정)

### 환경변수
각 앱의 `.env.example` 파일 참고

## 📝 API 문서

Edge Functions API 명세는 [API.md](./docs/API.md) 참고

## 🤝 기여 가이드

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 라이선스

이 프로젝트는 MIT 라이선스를 따릅니다.

## 📞 연락처

- Email: admin@tre-it.com
- GitHub: [TreitMaster](https://github.com/TreitMaster)

## 🙏 Acknowledgments

- Supabase Team
- Vercel Team
- React Community
- Shadcn/UI

---

**Made with ❤️ by Treit Team**