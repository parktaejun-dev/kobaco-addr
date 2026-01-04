# 🚀 배포 가이드 (Deployment Guide)

이 프로젝트는 **Vercel** 환경에 최적화되어 있으며, 별도의 데이터베이스 설정 없이 즉시 배포 가능합니다.

## 1. 전제 조건
- GitHub 계정
- Vercel 계정
- Sanity.io 계정 (랜딩 페이지 편집용)

## 2. Vercel 배포 순서
1. 이 저장소(Git Repository)를 본인의 GitHub에 푸시합니다.
2. [Vercel Dashboard](https://vercel.com/dashboard)에서 **"Add New" -> "Project"**를 클릭합니다.
3. GitHub 저장소를 연결하고 **"Import"**를 누릅니다.
4. **Environment Variables** 섹션에 아래 환경 변수를 추가합니다:
   
   **🔐 관리자 인증 (필수)**
   - `ADMIN_USER`: 관리자 아이디 (예: `admin`)
   - `ADMIN_PASSWORD`: 관리자 비밀번호 (강력한 비밀번호 권장)
   
   **⚠️ 주의: 위 환경변수를 설정하지 않으면 /admin 페이지 접근이 완전히 차단됩니다.**
   
   **📦 선택 사항**
   - `NEXT_PUBLIC_SANITY_PROJECT_ID`: Sanity 프로젝트 ID
   - `NEXT_PUBLIC_SANITY_DATASET`: `production`
5. **"Deploy"** 버튼을 누르면 배포가 완료됩니다.

## 3. Sanity CMS 연결 (랜딩 페이지 편집기)
1. 터미널에서 프로젝트 루트로 이동하여 Sanity CLI를 설치합니다: `npm install -g sanity`
2. `sanity login`으로 로그인합니다.
3. `sanity init`을 실행하여 프로젝트를 연결하거나, Sanity 대시보드에서 새 프로젝트를 생성합니다.
4. `/schema` 폴더(추후 생성 예정)의 내용을 바탕으로 스키마를 배포합니다: `sanity deploy`
5. 배포된 Sanity Studio 주소에서 팀장님이 직접 텍스트를 수정할 수 있습니다.

## 4. 로컬 개발 환경 실행
```bash
npm install
npm run dev
```
접속 주소: http://localhost:3000
