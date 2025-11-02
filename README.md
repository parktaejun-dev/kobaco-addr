# 📺 KOBACO AI 전략 컨설턴트

어드레서블 TV 광고를 위한 AI 기반 타겟 분석 및 견적 시스템

## 🚀 빠른 시작

```bash
# 1. 패키지 설치
pip install -r requirements.txt

# 2. API 키 설정 (.env 파일)
GEMINI_API_KEY=your_api_key_here

# 3. 실행
streamlit run app.py
```

## ✨ 주요 기능

- **AI 타겟 분석**: 제품 정보 기반 최적 세그먼트 추천 (적합도 점수 포함)
- **견적 계산**: 채널별 예산 배분 및 노출수 계산
- **전략 제안서**: PDF 다운로드 가능한 전문가급 리포트 생성

## 📁 프로젝트 구조

```
kobaco-addr/
├── app.py              # 메인 실행 파일
├── core/               # 데이터 관리, 견적 계산
├── ai/                 # AI 추천, 프롬프트
├── ui/                 # UI 컴포넌트, 페이지
├── utils/              # 포맷팅, 검증
├── reports/            # 리포트 생성
└── data/               # 채널, 보너스, 할증 데이터
```

## 🔑 주요 모듈

| 모듈 | 설명 |
|------|------|
| `app.py` | 메인 애플리케이션 진입점 |
| `ai/recommender.py` | Gemini 기반 세그먼트 추천 |
| `core/calculator.py` | 견적 계산 엔진 |
| `reports/html_generator.py` | HTML 리포트 생성 |

## 🛠️ 기술 스택

- **Framework**: Streamlit
- **AI**: Google Gemini API
- **Data**: Pandas, JSON
- **Report**: Jinja2, HTML/CSS

## 📊 데이터 관리

### 채널 데이터 (`data/channels.csv`)
- 채널명, 기본 CPV 설정

### 보너스 정책 (`data/bonuses.csv`)
- 기본/기간/볼륨/프로모션 보너스 정책

### 할증 정책 (`data/surcharges.csv`)
- 지역/커스텀 타겟팅 할증

### 세그먼트 (`data/segments.json`)
- 모바일 데이터 기반 92개 세그먼트

## 🎯 사용 예시

1. **제품 정보 입력** → 광고주명, 제품명, URL
2. **AI 타겟 분석 요청** → 3개 세그먼트 추천 (적합도 점수)
3. **예산 설정** → 채널별 예산 배분
4. **플랜 생성** → 견적 결과 확인
5. **제안서 다운로드** → PDF 저장

## ⚙️ 설정

### Gemini API 키
```bash
# .env 파일
GEMINI_API_KEY=your_key_here
```

### 관리자 로그인
```toml
# .streamlit/secrets.toml
admin_id = "admin"
admin_password = "your_password"
```

## 📞 문의

- 📧 tj1000@kobaco.co.kr
- 🤖 [AI 챗봇](https://notebooklm.google.com/notebook/ab573898-2bb6-4034-8694-bc1c08d480c7)

## 📝 라이선스

© 2025 KOBACO. All rights reserved.
