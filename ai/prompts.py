# ai/prompts.py

def get_segment_filtering_prompt(product_name, website_url, scraped_text, segments_list_str, num_to_filter: int = 40):
    """(★신규) 1단계: 필터링용 프롬프트"""
    return f"""
당신은 **광고 전략 전문가**입니다.
당신의 임무는 "제품 정보"와 "웹사이트 내용"을 바탕으로, "전체 세그먼트 목록"에서 **조금이라도 관련성이 있어 보이는 후보를 관련성 순으로 {num_to_filter}개** 선별(필터링)하는 것입니다.

* 순서는 중요하지 않습니다.
* 점수나 추천 이유는 필요 없습니다.
* **오직 목록에 있는 세그먼트의 '이름'만** JSON 리스트 형식으로 반환하세요.

---
[제품 정보]
* 제품명: {product_name}
* 웹사이트: {website_url or "없음"}

[웹사이트 참고 내용]
{scraped_text or "없음"}

[전체 세그먼트 목록] (이 목록에서만 선택해야 함):
{segments_list_str}
---

[응답 형식 (JSON 예시)]
{{
  "candidate_segments": [
    "세그먼트 이름 1",
    "세그먼트 이름 5",
    "세그먼트 이름 20"
    // ... 요청한 {num_to_filter}개 만큼의 이름 ...
  ]
}}
    """

def get_segment_recommendation_prompt(product_name, website_url, scraped_text, segments_list_str, num_to_recommend: int = 3):
    """(기존) 2단계: 정밀 분석 및 추천용 프롬프트"""
    return f"""
당신은 **광고 전략 전문가이자 타겟 오디언스 분석가**입니다.

당신의 임무는 2가지입니다:

1️⃣ **제품 분석**: 주어진 "제품 정보"와 "웹사이트 참고 내용"을 바탕으로 제품을 1-2줄의 친절한 설명으로 요약합니다.
   - 웹사이트 참고 내용이 있다면 제품명보다 웹사이트 내용을 최우선으로 참고하세요.

2️⃣ **타겟 추천**: "제공된 세그먼트 목록"에서 제품과 가장 관련성이 높은 세그먼트 **정확히 {num_to_recommend}개**를 선택합니다.
   - 각 세그먼트마다 다음 정보를 제공하세요:
     * **추천 이유** (reason): 왜 이 세그먼트가 적합한지 1-2줄로 설명
     * **적합도 점수** (confidence_score): 0-100점 척도로 평가 (높을수록 확신)
     * **핵심 매칭 요소** (key_factors): 제품과 세그먼트를 연결하는 핵심 키워드 2-4개

---

**[제품 정보]**
* 제품명: {product_name}
* 웹사이트: {website_url or "없음"}

**[웹사이트 참고 내용]**
{scraped_text or "없음"}

**[제공된 세그먼트 목록]** (이 목록에서만 선택해야 함):
{segments_list_str}

---

**[중요한 규칙]**
✅ 세그먼트는 **반드시 위 목록에 있는 이름**만 사용하세요.
✅ 추천 세그먼트는 **정확히 {num_to_recommend}개**여야 합니다. (이보다 많거나 적으면 절대 안 됨)
✅ 적합도 점수는 **신중하게 평가**하세요:
   - 90-100점: 거의 완벽하게 매칭
   - 80-89점: 매우 적합
   - 70-79점: 적합
   - 60-69점: 어느 정도 관련성 있음
✅ 핵심 매칭 요소는 **구체적이고 명확**하게 작성하세요.
✅ 다른 텍스트 없이 **오직 JSON 형식으로만** 응답하세요.

---

**[응답 형식 (JSON 예시 - {num_to_recommend}개 항목 포함)]**
{{
  "product_understanding": "AI가 웹사이트를 기반으로 친절하게 요약한 제품 설명...",
  "recommended_segments": [
    {{
      "name": "세그먼트1 이름",
      "reason": "이 세그먼트를 추천하는 상세한 이유...",
      "confidence_score": 95,
      "key_factors": ["키워드1", "키워드2", "키워드3"]
    }},
    {{
      "name": "세그먼트2 이름",
      "reason": "이 세그먼트를 추천하는 상세한 이유...",
      "confidence_score": 88,
      "key_factors": ["키워드1", "키워드2"]
    }}
    // ... 요청한 {num_to_recommend}개 만큼의 항목이 여기에 포함됩니다 ...
  ]
}}
    """