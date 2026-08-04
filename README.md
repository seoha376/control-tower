# Control Tower MVP

여러 웹사이트의 배포 상태, Google AdSense 신청·심사 상태, 오늘 수익과 월 수익을 한 화면에서 관리하는 개인 운영 대시보드입니다.

## 현재 가능한 기능

- 서비스 추가, 수정, 삭제
- AdSense 상태 관리: 신청 전 / 심사 중 / 승인 / 심사 실패
- 배포 상태 관리: 정상 / 확인 필요 / 오류 / 미확인
- 오늘 수익과 이번 달 수익 합산
- 상태별 필터
- 브라우저 localStorage 자동 저장
- 모바일 반응형 화면
- GitHub Pages 자동 배포

## 실행

Node.js가 설치되어 있다면 테스트부터 실행합니다.

```bash
npm test
npm run serve
```

브라우저에서 `http://localhost:4173`을 엽니다.

## GitHub에 올리기

```bash
git init
git add .
git commit -m "feat: build Control Tower MVP"
git branch -M main
git remote add origin https://github.com/사용자명/control-tower.git
git push -u origin main
```

그다음 GitHub 저장소의 `Settings → Pages → Source`에서 **GitHub Actions**를 선택합니다.

## 중요한 제한

현재 버전의 AdSense 상태와 수익은 직접 입력합니다. Google AdSense API로 수익을 자동 조회하려면 OAuth 인증과 안전한 백엔드가 필요하므로, API 비밀값을 공개 GitHub Pages 코드에 넣으면 안 됩니다.

다음 버전에서는 Supabase 또는 별도 서버를 붙여 여러 기기 동기화와 AdSense·GitHub·Analytics API 자동 연동을 추가할 수 있습니다.
