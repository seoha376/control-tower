# Control Tower

내가 운영하는 여러 웹서비스의 GitHub 주소, 배포 주소, AdSense 상태, 수익 기록을 한 곳에서 관리하는 개인 운영 대시보드입니다.

이 프로젝트는 기본적으로 **나만 쓰는 도구**입니다. 다른 사용자가 각자 사이트를 등록하는 SaaS가 아닙니다.

## 현재 기능

- Supabase Auth 기반 GitHub 로그인 준비
- `allowedEmail` 설정을 통한 소유자 이메일 제한
- Supabase RLS 정책으로 소유자 이메일만 DB 접근 허용
- Supabase `projects` 테이블 저장
- 서비스 추가, 수정, 삭제
- AdSense 상태 관리: 신청 전, 심사 중, 승인, 심사 실패
- 배포 상태 관리: 정상, 확인 필요, 오류, 미확인
- 오늘 수익과 이번 달 수익 합산
- 상태별 필터
- Vercel 정적 배포 예정 구조

## 로컬 실행

Windows PowerShell에서 `npm` 실행 정책 오류가 나면 `npm.cmd`를 사용합니다.

```bash
npm.cmd test
npm.cmd run serve
```

브라우저에서 `http://localhost:4173`을 엽니다.

## Supabase 설정

1. Supabase 프로젝트를 만듭니다.
2. Supabase SQL Editor에서 [docs/supabase-schema.sql](./docs/supabase-schema.sql)을 실행합니다.
4. Authentication Providers에서 GitHub OAuth를 활성화합니다.
5. Site URL과 Redirect URL에 로컬/Vercel 배포 주소를 등록합니다.
   - 로컬: `http://localhost:4173`
   - Vercel: `https://control-tower-wheat.vercel.app/`
6. [src/config.js](./src/config.js)에 값을 입력합니다.

```js
export const CONTROL_TOWER_CONFIG = {
  supabaseUrl: 'https://프로젝트ID.supabase.co',
  supabaseAnonKey: 'Supabase anon public key',
  allowedEmail: '내이메일@example.com',
  redirectTo: 'https://control-tower-wheat.vercel.app/'
};
```

`allowedEmail`은 반드시 실제 내 로그인 이메일이어야 합니다. 비어 있거나 `YOUR_EMAIL@example.com` 그대로면 앱은 로그인 버튼을 보여주지 않습니다.

`supabaseAnonKey`는 브라우저 앱에서 쓰는 public anon key입니다. 실제 데이터 보호는 `docs/supabase-schema.sql`의 RLS 정책이 담당합니다.

현재 Vercel 배포 URL은 `https://control-tower-wheat.vercel.app/`입니다. Supabase Auth Redirect URLs에도 같은 주소를 추가하세요. 로컬 테스트를 계속하려면 `http://localhost:4173`도 함께 등록합니다.

## 다음 연동 후보

- GitHub API: Repository 상태, 마지막 커밋, Actions 성공/실패, 마지막 배포 시간
- AdSense API: 승인 여부, 오늘 수익, 이번 달 수익
- Google Analytics API: 방문자, 세션, 인기 페이지
- Search Console API: 검색 유입, 클릭수, 노출수
- AI 운영 분석: 수익 감소 원인, 방문자 증가 원인, 배포 실패 요약
