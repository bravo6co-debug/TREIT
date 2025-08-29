가능. Treit에 맞춰 **Supabase 중심 스택**으로 재설계해 반영한다.

1. init project rules → 2\) plan\_task → 3\) split\_tasks → 4\) research\_mode → 5\) analyze\_task → 6\) execute\_task

---

# **1\) init** 

# **project rules**

* 루트: `C:\dev-project\TreitMaster`

* 패키지 매니저: pnpm 권장

* 워크스페이스

TreitMaster/  
├─ treit-admin/        \# Next.js 14 (관리자)  
├─ treit-advertiser/   \# Next.js 14 (광고주)  
├─ treit-app/          \# React Native Expo (유저)  
├─ shared/             \# 공통 타입(Zod/TS)  
└─ supabase/           \# DB 스키마·RLS·Edge Functions

* 환경변수 접두어: `TREIT_*`

* 데이터 원천: **Supabase (Auth+DB+Storage+Edge Functions)**

* 결제: **Stripe \+ 토스페이먼츠(어댑터)**

* 배포: **Vercel(웹) \+ Supabase Cloud(DB/Functions)**

* 모니터링: **PostHog \+ Sentry**

---

# **2\) plan\_task**

* 목표: Treit MVP 4개 표면(관리자·광고주·유저앱·Edge API) 가동

* 성공기준

  * RLS 적용된 테이블+정합 검증

  * 클릭 추적 Edge Function p95 \< 100ms

  * Stripe 결제→크레딧 적립 웹훅 동작

  * 대시보드 실시간(초당 집계) 반영

* 산출물: SQL 스키마, RLS 정책, Edge Functions, Next.js/Expo 클라이언트, 결제 웹훅, 모니터링 세팅, Vercel/Supabase 환경값

---

# **3\) split\_tasks**

**DB/RLS**

* 타입/테이블 생성

* 인덱스·파티셔닝(클릭 로그)

* RLS 정책 작성·테스트

**Edge Functions (Deno)**

* `tracking-click`

* `matching-join`

* `share-report`

* `stripe-webhook` / `toss-webhook`

* `admin-approve-business`

**Admin (Next.js)**

* 대시보드, 승인, 캠페인/유저 관리

**Advertiser (Next.js)**

* 캠페인 CRUD·분석, 크레딧 충전

**User App (Expo)**

* 로그인/미션/캠페인 참여/공유

**공통**

* PostHog·Sentry·Feature Flags

* CI/CD(Vercel/Supabase)

---

# **4\) research\_mode 요약 결정**

* **Supabase**: Auth(RBAC), Row Level Security, Realtime, Storage, Edge Functions로 백엔드 대체.

* **분석**: PostHog로 이벤트·퍼널. 대시보드는 DB 뷰+머티리얼라이즈드 뷰.

* **결제**: Stripe 기본. 국내 PG는 **토스**를 어댑터로 동일 웹훅 경로에 분기.

* **실시간**: Edge Function → `click_events` insert → Realtime 채널 구독(관리자 대시보드).

---

# **5\) analyze\_task**

* 리스크: RLS 누락, 웹훅 위변조, 클릭 스팸, 예산 초과, 다국 PG 정합

* 완화:

  * 모든 테이블 **RLS ON** \+ 정책 테스트

  * 웹훅 서명 검증 \+ 재시도 멱등키

  * 클릭 `unique(templateId, ip, minute_bucket)` 세이프가드 \+ 속도제한

  * 예산 트리거: `daily_spend <= daily_budget`

  * PG 이중 장부: 결제원장 테이블 별도

---

# **6\) execute\_task**

## **6.1 Supabase 스키마(SQL)**

`supabase/migrations/001_init.sql`

\-- Enums  
create type user\_status as enum ('ACTIVE','INACTIVE','SUSPENDED');  
create type business\_status as enum ('PENDING','ACTIVE','SUSPENDED','REJECTED');  
create type campaign\_category as enum ('CAFE','BEAUTY','FITNESS','SHOPPING','EDUCATION','ENTERTAINMENT','OTHER');  
create type social\_platform as enum ('INSTAGRAM','FACEBOOK','TWITTER','TIKTOK','YOUTUBE');  
create type matching\_status as enum ('ACTIVE','COMPLETED','PAUSED','CANCELLED');

\-- Core tables (IDs use uuid default gen\_random\_uuid())  
create table users (  
  id uuid primary key default gen\_random\_uuid(),  
  auth\_uid uuid unique not null,               \-- supabase.auth.users.id  
  email text unique not null,  
  nickname text not null,  
  level int not null default 1,  
  xp int not null default 0,  
  total\_earnings numeric not null default 0,  
  status user\_status not null default 'ACTIVE',  
  created\_at timestamptz default now(),  
  updated\_at timestamptz default now()  
);

create table businesses (  
  id uuid primary key default gen\_random\_uuid(),  
  auth\_uid uuid unique not null,  
  email text unique not null,  
  company\_name text not null,  
  business\_number text,  
  phone text,  
  status business\_status not null default 'PENDING',  
  created\_at timestamptz default now(),  
  updated\_at timestamptz default now()  
);

create table campaigns (  
  id uuid primary key default gen\_random\_uuid(),  
  business\_id uuid not null references businesses(id) on delete cascade,  
  title text not null,  
  description text,  
  landing\_page\_url text not null,  
  category campaign\_category not null,  
  cpc\_rate numeric not null,  
  daily\_budget numeric,  
  total\_budget numeric,  
  is\_active boolean not null default true,  
  created\_at timestamptz default now(),  
  updated\_at timestamptz default now(),  
  expires\_at timestamptz  
);

create table templates (  
  id uuid primary key default gen\_random\_uuid(),  
  campaign\_id uuid not null references campaigns(id) on delete cascade,  
  design\_data jsonb not null,  
  preview\_image\_url text,  
  usage\_count int not null default 0,  
  performance\_score numeric not null default 0,  
  created\_at timestamptz default now()  
);

create table user\_campaigns (  
  id uuid primary key default gen\_random\_uuid(),  
  user\_id uuid not null references users(id) on delete cascade,  
  campaign\_id uuid not null references campaigns(id) on delete cascade,  
  template\_id uuid not null references templates(id),  
  shared\_at timestamptz default now(),  
  platform social\_platform not null,  
  status matching\_status not null default 'ACTIVE',  
  unique(user\_id, campaign\_id, template\_id)  
);

create table click\_events (  
  id uuid primary key default gen\_random\_uuid(),  
  user\_id uuid references users(id),  
  campaign\_id uuid not null references campaigns(id),  
  template\_id uuid not null references templates(id),  
  clicked\_at timestamptz default now(),  
  ip\_address inet,  
  user\_agent text,  
  referrer\_url text,  
  converted boolean not null default false,  
  commission\_amount numeric not null default 0,  
  minute\_bucket timestamptz generated always as (date\_trunc('minute', clicked\_at)) stored  
);  
create index idx\_click\_events\_campaign\_time on click\_events(campaign\_id, clicked\_at desc);  
create unique index uq\_click\_guard on click\_events(template\_id, ip\_address, minute\_bucket);

create table user\_earnings (  
  user\_id uuid primary key references users(id) on delete cascade,  
  total\_amount numeric not null default 0,  
  pending\_amount numeric not null default 0,  
  paid\_amount numeric not null default 0,  
  last\_payout\_at timestamptz,  
  payment\_method jsonb  
);

create table business\_billing (  
  business\_id uuid primary key references businesses(id) on delete cascade,  
  total\_spent numeric not null default 0,  
  remaining\_credits numeric not null default 0,  
  auto\_recharge boolean not null default false,  
  payment\_method jsonb,  
  last\_charged\_at timestamptz,  
  billing\_cycle text not null default 'monthly'  
);

\-- RLS  
alter table users enable row level security;  
alter table businesses enable row level security;  
alter table campaigns enable row level security;  
alter table templates enable row level security;  
alter table user\_campaigns enable row level security;  
alter table click\_events enable row level security;  
alter table user\_earnings enable row level security;  
alter table business\_billing enable row level security;

\-- Helpers: map auth.uid() to profile rows  
create function public.uid() returns uuid language sql stable as $$ select auth.uid() $$;

\-- Policies (대표 예시)  
create policy "users self read" on users  
for select using (auth.uid() \= auth\_uid);

create policy "users self update" on users  
for update using (auth.uid() \= auth\_uid);

create policy "biz self read" on businesses  
for select using (auth.uid() \= auth\_uid);

create policy "biz self update" on businesses  
for update using (auth.uid() \= auth\_uid);

\-- 캠페인 열람: 활성만 전체 공개, 비활성은 해당 광고주만  
create policy "campaigns public active" on campaigns  
for select using (is\_active \= true);

create policy "campaigns owner readwrite" on campaigns  
for all using (  
  exists(select 1 from businesses b where b.id \= campaigns.business\_id and b.auth\_uid \= auth.uid())  
);

\-- 템플릿 읽기: 활성 캠페인 공개  
create policy "templates read" on templates  
for select using (  
  exists(select 1 from campaigns c where c.id \= templates.campaign\_id and c.is\_active \= true)  
);

\-- user\_campaigns: 본인 레코드만  
create policy "user\_campaigns self" on user\_campaigns  
for all using (user\_id in (select id from users where auth\_uid \= auth.uid()));

\-- click\_events: 인서트는 Edge Function 키로만  
create policy "click insert by service role" on click\_events  
for insert with check (current\_setting('request.jwt.claims', true)::jsonb ? 'role' and  
                       (current\_setting('request.jwt.claims',true)::jsonb-\>\>'role') in ('service\_role'));

\-- earnings/billing: 각 소유자만  
create policy "earnings self" on user\_earnings for select using (user\_id in (select id from users where auth\_uid \= auth.uid()));  
create policy "billing owner" on business\_billing for select using (  
  exists(select 1 from businesses b where b.id \= business\_billing.business\_id and b.auth\_uid \= auth.uid())  
);

## **6.2 Edge Functions (Deno, TypeScript)**

`supabase/functions/tracking-click/index.ts`

import { serve } from "https://deno.land/std/http/server.ts";  
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

serve(async (req) \=\> {  
  const supabase \= createClient(Deno.env.get("SUPABASE\_URL")\!, Deno.env.get("SUPABASE\_SERVICE\_ROLE\_KEY")\!);  
  const { templateId, campaignId, userId } \= await req.json();  
  const ip \= req.headers.get("x-forwarded-for") ?? req.headers.get("cf-connecting-ip");  
  const ua \= req.headers.get("user-agent") ?? "";  
  const ref \= req.headers.get("referer") ?? "";

  const { error } \= await supabase.from("click\_events").insert({  
    template\_id: templateId,  
    campaign\_id: campaignId,  
    user\_id: userId ?? null,  
    ip\_address: ip,  
    user\_agent: ua,  
    referrer\_url: ref  
  });  
  if (error) return new Response(JSON.stringify({ ok:false, error:error.message }), { status: 400 });  
  return new Response(JSON.stringify({ ok:true }), { headers: { "content-type":"application/json" }});  
});

`supabase/functions/stripe-webhook/index.ts` 〔서명검증 후〕

// 1\) 이벤트 파싱 → 2\) 결제 성공시 business\_billing.remaining\_credits 증가 → 3\) 원장 기록

`supabase/functions/matching-join/index.ts`

// 사용자 auth.uid 매핑 → user\_campaigns upsert → 템플릿 usage\_count 증가

## **6.3 Next.js 클라이언트 공통 초기화**

`shared/supabaseClient.ts`

import { createBrowserClient } from "@supabase/ssr";  
export const supabase \= createBrowserClient(process.env.NEXT\_PUBLIC\_SUPABASE\_URL\!, process.env.NEXT\_PUBLIC\_SUPABASE\_ANON\_KEY\!);

예시: 캠페인 목록

const { data } \= await supabase.from("campaigns").select("\*").eq("is\_active", true).order("created\_at",{ascending:false});

Edge 호출(클릭):

await fetch(\`${process.env.NEXT\_PUBLIC\_SUPABASE\_FUNCTIONS\_URL}/tracking-click\`, {  
  method:"POST",  
  headers:{ "content-type":"application/json" },  
  body: JSON.stringify({ templateId, campaignId, userId })  
});

## **6.4 결제 연동 요약**

* 클라이언트: Stripe Elements or Toss Payments 위젯

* 성공 후 서버는 결제원장에 `pending` 기록

* **웹훅**이 최종 단일 진실원장. 서명 검증 후:

  * `business_billing.remaining_credits += amount`

  * `business_billing.total_spent += fee`

  * 멱등키: `event.id`로 UPSERT

## **6.5 스토리지**

* 버킷 `templates` 공개 읽기, 업로드는 광고주 소유자만 정책

## **6.6 인덱스·집계**

* 집계 뷰:

create materialized view mv\_campaign\_clicks as  
select campaign\_id, date\_trunc('hour', clicked\_at) as hour, count(\*) as clicks  
from click\_events group by 1,2;  
create index on mv\_campaign\_clicks (campaign\_id, hour desc);

## **6.7 모니터링**

* PostHog: 웹·앱에 키 주입, 이벤트 `click_logged`, `campaign_joined`

* Sentry: Next.js(Edge/Node)·Expo 초기화, Release=Git SHA

## **6.8 배포**

* Vercel: `treit-admin`, `treit-advertiser` 각각 프로젝트

* 환경변수

  * `NEXT_PUBLIC_SUPABASE_URL`

  * `NEXT_PUBLIC_SUPABASE_ANON_KEY`

  * `SUPABASE_SERVICE_ROLE_KEY`(서버 전용)

  * `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`

  * `TOSS_SECRET_KEY`, `TOSS_WEBHOOK_SECRET`

  * `POSTHOG_KEY`, `SENTRY_DSN`

* Supabase: SQL 적용 → Functions 배포

supabase db push  
supabase functions deploy tracking-click  
supabase functions deploy matching-join  
supabase functions deploy stripe-webhook

---

## **체크리스트(갭 전용)**

* `treit-backend` 불필요. 대신 **supabase/functions** 사용

* SQL/RLS 적용 및 테스트

* Functions 3종 배포

* Admin/Advertiser Next.js 연결

* Expo 앱 로그인·참여·공유 연결

* Stripe/Toss 웹훅 검증 및 크레딧 적립

* PostHog/Sentry 배선

원하면 위 **SQL 파일**과 **Functions 스켈레톤 3종**을 바로 파일 형태로 더 상세히 써서 제공한다.

