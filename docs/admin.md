# 관리자 시스템 및 통계 매뉴얼 (Admin Manual)

## 1. 환경 변수 설정 (Environment Setup)
관리자 기능(통계, 이미지 업로드, 데이터 저장 등)을 완벽하게 사용하려면 Vercel 프로젝트 설정에서 다음 환경 변수들을 반드시 설정해야 합니다.

- `REDIS_URL` (또는 `KV_URL`): Redis 데이터베이스 연결 문자열입니다. (Vercel KV 또는 Upstash Redis 사용)
- `BLOB_READ_WRITE_TOKEN`: 이미지 저장을 위한 Vercel Blob 토큰입니다.
- `ADMIN_USER` & `ADMIN_PASS`: 관리자 API 경로 보안을 위한 계정 정보(Basic Auth)입니다.
   - 예: `ADMIN_USER=admin`, `ADMIN_PASS=password123`

## 2. 데이터 저장 구조 (Architecture)
본 시스템은 **Redis**를 메인 데이터베이스로 사용합니다.

- **랜딩 페이지 설정**: `landing:home`
  - 섹션 순서, 활성화 여부 등 전체 구성을 저장합니다.
- **섹션 데이터**: `landing:section:{id}`
  - 각 섹션별 실제 콘텐츠(JSON)를 저장합니다.
  - 저장 시 `lib/sections/schemas.ts`에 정의된 Zod 스키마 검증을 거칩니다.
- **통계 데이터 (Stats)**:
  - `stats:search:count:day:{Date}`: 일일 검색량
  - `stats:cta:{ctaId}:count:day:{Date}`: CTA 버튼 클릭 수
  - `stats:admin:save:day:{Date}`: 관리자 저장 횟수
  - `stats:admin:image_upload:day:{Date}`: 이미지 업로드 횟수

## 3. 관리자 패널 사용법
`/admin` 경로로 접속하여 관리자 기능을 사용할 수 있습니다.

### 대시보드 (Dashboard)
- 최근 30일간의 시스템 통계를 시각적으로 확인합니다.
- 검색어 트렌드, 버튼 클릭률 등을 모니터링합니다.

### 콘텐츠 에디터 (Section Management)
- **순서 변경**: 사이드바에서 섹션 카드를 드래그하여 순서를 변경합니다.
- **공개/비공개**: 토글 스위치로 섹션을 즉시 숨기거나 표시합니다.
- **편집 (Edit)**: "수정" 버튼을 눌러 에디터를 엽니다.
  - **텍스트**: 제목, 설명 등을 수정합니다.
  - **이미지**: "이미지 업로드" 버튼으로 파일을 올리면 Vercel Blob에 저장되고 URL이 자동 입력됩니다.
  - **리스트**: 카드, 단계, FAQ 항목을 추가/삭제합니다.
  - **저장**: "저장 및 반영하기"를 누르면 Redis에 저장되고 랜딩 페이지가 즉시 갱신(Revalidate)됩니다.

### 정책 및 세그먼트 (Policy & Segments)
- 가격 정책과 오디언스 세그먼트 데이터를 관리합니다.
- 이 데이터들은 설정에 따라 로컬 JSON 또는 Redis에 저장될 수 있습니다. (현재 하이브리드 모드 최적화)

## 4. 데이터 초기화 및 복구
### 초기 데이터 시딩 (Seeding)
Redis DB가 비어있는 경우(초기 배포 등), 로컬 JSON 파일(`content/`)의 내용을 DB로 옮길 수 있습니다.
- **API 경로**: `POST /api/admin/seed`
- **기능**: `content/*.json` 파일을 읽어 `landing:home` 및 `landing:section:*` 키에 저장합니다.

## 5. 유지보수 및 배포
- **저장소 (Repo)**: GitHub 저장소가 Vercel에 연결되어 있어야 합니다.
- **빌드 (Build)**: `npm run build` 명령어로 빌드 오류가 없는지 확인하세요.
- **로그 (Logs)**: API 오류 발생 시 Vercel Runtime Logs를 확인하시면 됩니다.

---
**© 2026 KOBACO Addressable TV Team**
