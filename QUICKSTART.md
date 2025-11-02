# 🚀 KOBACO AI v2.0 - 빠른 시작 가이드

## ⚡ 5분 안에 시작하기

### 1️⃣ 준비물
- Python 3.8 이상
- Gemini API 키 ([무료로 발급받기](https://aistudio.google.com/app/apikey))

### 2️⃣ 설치

```bash
# 패키지 설치
pip install -r requirements.txt
```

### 3️⃣ API 키 설정

`.env` 파일을 열고 API 키를 입력하세요:

```
GEMINI_API_KEY=여기에_본인의_API_키_입력
```

### 4️⃣ 관리자 비밀번호 설정 (선택)

`.streamlit/secrets.toml` 파일 생성:

```toml
admin_id = "admin"
admin_password = "your_password"
```

### 5️⃣ 실행

```bash
streamlit run main.py
```

브라우저가 자동으로 열립니다! 🎉

---

## 🎯 첫 사용 튜토리얼

### 시나리오: 로봇청소기 광고 전략 수립

#### Step 1: 제품 정보 입력
```
광고주명: (주)스마트홈
제품명: 신형 로봇청소기 CleanBot X1
제품 URL: https://example.com/cleanbot
```

#### Step 2: AI 타겟 분석
- "🤖 AI 타겟 분석 요청" 버튼 클릭
- 약 10초 후 결과 표시

**예상 결과:**
```
🎯 1. 영유아 부모 (적합도: 95점)
💡 육아로 바쁜 가정에서 시간 절약
🔑 육아, 청결, 시간절약

✅ 2. 1인가구 (적합도: 88점)
💡 편리한 스마트홈 기기 선호
🔑 편리성, 자동화, 1인가구

👍 3. 주부 (적합도: 82점)
💡 가사 노동 경감에 관심
🔑 가사, 효율성, 청소
```

#### Step 3: 예산 설정
```
총 월 예산: 5,000만원
- MBC: 1,500만원
- EBS: 1,000만원
- PP: 2,500만원

광고 기간: 3개월
광고 초수: 30초
```

#### Step 4: 플랜 생성
- "🧮 AI 최적화 플랜 생성" 클릭
- 결과 확인

#### Step 5: 제안서 다운로드
- "📄 AI 광고 전략 제안서 생성" 클릭
- 새 창에서 Ctrl+P → PDF로 저장

---

## 🎨 주요 기능 미리보기

### 1. 투명한 AI 추천
```
적합도 점수: ████████████████████ 95점

왜 이 타겟을 추천했나요?
→ 명확한 이유 제시

어떤 키워드가 매칭되었나요?
→ 핵심 요소 배지 표시
```

### 2. 전문적인 전략 제안서
- 📊 종합 전략 지표
- 📈 채널별 상세 내역
- 🎯 AI 추천 타겟 (점수 포함)
- 🖨️ 원클릭 PDF 저장

### 3. 직관적인 UI
- 프로그레스 바로 적합도 시각화
- 이모지로 점수 등급 구분
- 카드 레이아웃으로 정보 구조화

---

## ❓ 자주 묻는 질문 (FAQ)

### Q1: API 키가 작동하지 않아요
**A**: 
1. [Google AI Studio](https://aistudio.google.com/app/apikey)에서 키 재확인
2. `.env` 파일에 따옴표 없이 입력했는지 확인
3. 앱 재시작

### Q2: "데이터 파일을 찾을 수 없습니다" 오류
**A**: 
- `data/` 폴더가 main.py와 같은 위치에 있는지 확인
- CSV 파일이 모두 존재하는지 확인

### Q3: AI 추천이 느려요
**A**: 
- 정상입니다. 웹사이트 분석 시 10-20초 소요
- 제품 URL 없이 제품명만 입력하면 더 빠름

### Q4: 제안서 폰트가 깨져요
**A**: 
- `NanumGothic.ttf` 폰트 파일을 프로젝트 루트에 배치
- 또는 시스템에 나눔고딕 설치

### Q5: 관리자 페이지는 어떻게 들어가나요?
**A**: 
1. 왼쪽 사이드바에서 "관리자 로그인" 클릭
2. secrets.toml에 설정한 ID/PW 입력

---

## 🔧 고급 설정

### 포트 변경
```bash
streamlit run main.py --server.port 8502
```

### 외부 접속 허용
```bash
streamlit run main.py --server.address 0.0.0.0
```

### 디버그 모드
```bash
streamlit run main.py --logger.level debug
```

---

## 📦 프로젝트 구조 한눈에 보기

```
KOBACO-AI-v2/
│
├── 🎬 main.py                    ← 여기서 시작!
├── 🤖 gemini_segment_recommender_v2.py
├── 💾 data_manager.py
├── 🧮 estimate_calculator.py
│
├── 📄 README.md                  ← 상세 가이드
├── 📝 CHANGELOG.md               ← 변경사항
├── 📋 requirements.txt
├── 🔐 .env                       ← API 키 설정
│
└── 📁 data/
    ├── channels.csv
    ├── bonuses.csv
    ├── surcharges.csv
    └── segments.json
```

---

## 🎓 추천 학습 순서

### 1단계: 기본 사용법 익히기
- [ ] 앱 실행
- [ ] AI 타겟 분석 요청
- [ ] 플랜 생성
- [ ] 제안서 다운로드

### 2단계: 고급 기능 탐색
- [ ] 관리자 페이지 접속
- [ ] 채널/보너스/할증 정책 수정
- [ ] 세그먼트 커스터마이징

### 3단계: 코드 이해하기
- [ ] README.md 읽기
- [ ] CHANGELOG.md 확인
- [ ] 주석 따라가며 코드 분석

---

## 💡 프로 팁

### Tip 1: 웹사이트 URL은 필수는 아니지만...
제품 URL을 입력하면 AI가 더 정확한 분석을 합니다!

### Tip 2: 여러 제품 비교하기
- 제품 A 분석 → 결과 스크린샷
- 제품 B 분석 → 결과 스크린샷
- 비교 분석!

### Tip 3: 제안서 커스터마이징
HTML 템플릿(`estimate_calculator.py`)을 수정하여 회사 로고 추가 가능

### Tip 4: 배치 처리
여러 제품의 전략을 한 번에 분석하려면 main.py를 참고하여 스크립트 작성

---

## 🚨 문제 해결 치트시트

| 증상 | 원인 | 해결 |
|------|------|------|
| API 키 오류 | 잘못된 키 | .env 파일 확인 |
| 데이터 파일 없음 | 경로 오류 | data 폴더 위치 확인 |
| 느린 응답 | 네트워크 | 인터넷 연결 확인 |
| 폰트 깨짐 | 폰트 없음 | 나눔고딕 설치 |
| 관리자 접속 안됨 | Secrets 미설정 | secrets.toml 생성 |

---

## 🎉 성공적인 첫 실행 체크리스트

- [x] Python 설치 완료
- [x] 패키지 설치 완료
- [x] API 키 설정 완료
- [x] 앱 실행 성공
- [x] AI 타겟 분석 완료
- [x] 적합도 점수 확인
- [x] 전략 제안서 생성 완료

**모두 체크하셨다면 축하합니다! 🎊**

이제 본격적으로 KOBACO AI 전략 컨설턴트를 활용해보세요!

---

## 📞 도움이 필요하신가요?

- 📧 이메일: tj1000@kobaco.co.kr
- 🤖 AI 챗봇: [NotebookLM](https://notebooklm.google.com/notebook/ab573898-2bb6-4034-8694-bc1c08d480c7)
- 📖 상세 가이드: README.md
- 📝 변경사항: CHANGELOG.md

---

**Happy Advertising! 📺✨**
