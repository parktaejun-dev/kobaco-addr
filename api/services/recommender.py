import google.generativeai as genai
import os
import json
import time
import re
import requests
from bs4 import BeautifulSoup
from typing import List, Dict, Set, Optional
from sqlmodel import Session, select
from api.models import Segment

# Prompts are defined here to avoid circular imports or multiple files
def get_expansion_and_understanding_prompt(product_name, website_url, scraped_text):
    return f"""
당신은 **광고 전략 전문가**입니다.
당신의 임무는 2가지입니다.

1.  **[제품 분석]** "제품 정보"와 "웹사이트 내용"을 바탕으로, 이 제품의 **핵심 기능과 주 타겟 고객**을 1-2줄의 친절한 설명으로 요약하세요.
2.  **[키워드 확장]** "제품 분석" 내용을 바탕으로, 제품과 관련성이 높은 **'유사/연관 키워드'를 최대 10개**까지 확장하세요. (예: "연금보험"의 경우 "노후", "은퇴", "재산", "보험" 등을 포함)

---
[제품 정보]
* 제품명: {product_name}
* 웹사이트: {website_url or "없음"}

[웹사이트 참고 내용]
{scraped_text or "없음"}
---

[응답 형식 (JSON)]
{{
  "product_understanding": "AI가 웹사이트를 기반으로 친절하게 요약한 제품 설명...",
  "expanded_keywords": [
    "AI가 확장한 키워드 1",
    "AI가 확장한 키워드 2"
  ]
}}
"""

def get_segment_filtering_prompt(product_understanding: str, segments_list_str: str, num_to_filter: int = 40):
    return f"""
당신은 **광고 전략 전문가**입니다.
아래 "AI의 제품 분석" 내용을 바탕으로, "전체 세그먼트 목록"에서 **조금이라도 관련성이 있어 보이는 후보를 관련성 순으로 {num_to_filter}개** 선별(필터링)하세요.

* 순서는 중요하지 않습니다.
* 점수나 추천 이유는 필요 없습니다.
* **오직 목록에 있는 세그먼트의 '이름'만** JSON 리스트 형식으로 반환하세요.

---
[AI의 제품 분석 (제공됨)]
{product_understanding}

[전체 세그먼트 목록] (이 목록에서만 선택해야 함):
{segments_list_str}
---

[응답 형식 (JSON 예시)]
{{
  "candidate_segments": [
    "세그먼트 이름 1",
    "세그먼트 이름 5",
    "세그먼트 이름 20"
  ]
}}
    """

def get_segment_recommendation_prompt(product_understanding: str, segments_list_str: str, num_to_recommend: int = 3):
    return f"""
당신은 **광고 전략 전문가이자 타겟 오디언스 분석가**입니다.

당신의 임무는 "제공된 세그먼트 목록"에서 제품과 가장 관련성이 높은 세그먼트 **정확히 {num_to_recommend}개**를 선택하는 것입니다.

* "AI의 제품 분석" 내용을 바탕으로 판단하세요.
* **[참고] 이 목록은 Python이 1차 필터링한 'B급 후보'입니다. 데모그래픽 등 관련성 높은 항목을 자유롭게 선택하세요.**
* 각 세그먼트마다 다음 정보를 제공하세요:
    * **추천 이유** (reason): 왜 이 세그먼트가 적합한지 1-2줄로 설명
    * **적합도 점수** (confidence_score): 0-100점 척도로 평가 (높을수록 확신)
    * **핵심 매칭 요소** (key_factors): 제품과 세그먼트를 연결하는 핵심 키워드 2-4개

---
[AI의 제품 분석 (제공됨)]
{product_understanding}

[제공된 세그먼트 목록] (이 목록에서만 선택해야 함):
{segments_list_str}
---

[중요한 규칙]
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
[응답 형식 (JSON 예시 - {num_to_recommend}개 항목 포함)]
{{
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
  ]
}}
    """

class AISegmentRecommender:
    def __init__(self, session: Session):
        self.session = session
        self.api_key = os.getenv('GEMINI_API_KEY')
        self.model = None
        self.gemini_available = False
        self._initialize_gemini()

    def _initialize_gemini(self):
        if not self.api_key:
            print("❌ Gemini API key is missing.")
            return
        try:
            genai.configure(api_key=self.api_key)
            try:
                self.model = genai.GenerativeModel('models/gemini-flash-latest')
            except:
                self.model = genai.GenerativeModel('models/gemini-pro-latest')
            self.gemini_available = True
        except Exception as e:
            print(f"❌ Gemini API Setup Error: {str(e)}")
            self.gemini_available = False

    def _generate_with_retry(self, prompt: str, max_retries: int = 3) -> str:
        if not self.model:
            raise ValueError("Gemini model not initialized")

        retries = 0
        while retries < max_retries:
            try:
                response = self.model.generate_content(prompt)
                if not response or not response.text:
                    raise ValueError("Empty response from Gemini")
                return response.text
            except Exception as e:
                if "429" in str(e) and retries < max_retries - 1:
                    retries += 1
                    time.sleep(2 ** retries)
                else:
                    raise e
        raise Exception("API quota exceeded or failed after retries")

    def recommend_segments(self, product_name: str, website_url: str, num_recommendations: int = 3) -> Dict:
        # Default empty return
        result = {
            "recommendations": [],
            "product_understanding": "",
            "expanded_keywords": []
        }

        if not product_name.strip() and not website_url.strip():
            return result

        if not self.gemini_available or not self.model:
            return result

        # 0. URL Scraping
        scraped_text = ""
        if website_url:
            scraped_text = self._fetch_url_content(website_url)

        try:
            # 1. Load Segments from DB
            segments_db = self.session.exec(select(Segment)).all()
            all_segments_info = [seg.model_dump() for seg in segments_db]

            # 2. AI Understanding & Keyword Expansion
            try:
                expansion_json = self._get_expansion_and_understanding(product_name, website_url, scraped_text)
                product_understanding = expansion_json.get("product_understanding", "")
                expanded_keywords = expansion_json.get("expanded_keywords", [])
            except Exception as e:
                print(f"Warning: Step 0 failed: {e}")
                product_understanding = f"Product: {product_name} (Auto-analysis failed)"
                expanded_keywords = []

            if product_name and product_name not in expanded_keywords:
                expanded_keywords.insert(0, product_name)

            result["product_understanding"] = product_understanding
            result["expanded_keywords"] = expanded_keywords

            # 3. Priority Segments (Python Filter)
            priority_segments, remaining_segments = self._get_priority_segments(expanded_keywords, all_segments_info)

            # 4. B-Class Candidates (AI Filter)
            num_b_class_needed = max(0, num_recommendations - len(priority_segments))
            b_class_candidates = []

            if remaining_segments:
                candidate_names = self._filter_with_gemini(product_understanding, remaining_segments, num_to_filter=20)
                b_class_candidates = self._get_segments_by_names(candidate_names, remaining_segments)

            # 5. Final Re-ranking (AI)
            final_candidate_list = priority_segments + b_class_candidates
            if not final_candidate_list:
                final_candidate_list = all_segments_info[:20]

            all_recommendations = []
            if final_candidate_list:
                ai_response = self._recommend_with_gemini(product_understanding, final_candidate_list, num_to_recommend=max(num_recommendations, 5))
                if ai_response and ai_response.get("recommended_segments"):
                    all_recommendations = self._enrich_and_sort_segments(ai_response.get("recommended_segments"), final_candidate_list)

            # 6. Fallback and Finalizing
            final_recommendations = []
            seen_names = set()
            for seg in all_recommendations:
                if seg['name'] not in seen_names:
                    final_recommendations.append(seg)
                    seen_names.add(seg['name'])

            # Fallback padding
            num_to_pad = num_recommendations - len(final_recommendations)
            if num_to_pad > 0:
                existing_names = {seg['name'] for seg in final_recommendations}
                fallback_segments = [seg for seg in all_segments_info if seg['name'] not in existing_names]
                for i in range(min(num_to_pad, len(fallback_segments))):
                    fallback_seg = fallback_segments[i].copy()
                    fallback_seg['reason'] = "Basic recommendation due to lack of AI matches."
                    fallback_seg['confidence_score'] = 60
                    fallback_seg['key_factors'] = ["Basic Match"]
                    final_recommendations.append(fallback_seg)

            result["recommendations"] = final_recommendations[:num_recommendations]
            return result

        except Exception as e:
            print(f"Error in recommend_segments: {e}")
            return result

    def _fetch_url_content(self, url: str) -> str:
        try:
            headers = {'User-Agent': 'Mozilla/5.0'}
            response = requests.get(url, headers=headers, timeout=5)
            if response.status_code == 200:
                soup = BeautifulSoup(response.text, 'html.parser')
                meta_desc = soup.find('meta', attrs={'name': 'description'})
                if meta_desc and meta_desc.get('content'):
                    return meta_desc.get('content').strip()
                return soup.body.get_text(separator=' ', strip=True)[:1500]
        except:
            pass
        return ""

    def _get_expansion_and_understanding(self, product_name, website_url, scraped_text):
        prompt = get_expansion_and_understanding_prompt(product_name, website_url, scraped_text)
        raw_text = self._generate_with_retry(prompt)
        return self._parse_json(raw_text)

    def _filter_with_gemini(self, product_understanding, remaining_segments, num_to_filter):
        if not remaining_segments: return []
        segments_list_str = "\n".join([f"- {s['name']} ({s.get('description', '')})" for s in remaining_segments])
        prompt = get_segment_filtering_prompt(product_understanding, segments_list_str, num_to_filter)
        data = self._parse_json(self._generate_with_retry(prompt))
        return data.get("candidate_segments", [])

    def _recommend_with_gemini(self, product_understanding, candidate_segments, num_to_recommend):
        segments_list_str = "\n".join([f"- {s['name']} ({s.get('description', '')})" for s in candidate_segments])
        prompt = get_segment_recommendation_prompt(product_understanding, segments_list_str, num_to_recommend)
        return self._parse_json(self._generate_with_retry(prompt))

    def _parse_json(self, text):
        try:
            cleaned = text.strip().replace("```json", "").replace("```", "").strip()
            return json.loads(cleaned)
        except:
            return {}

    def _enrich_and_sort_segments(self, segments_from_ai, candidate_segments):
        enriched_map = {s['name']: s for s in segments_from_ai if 'name' in s}
        results = []
        for cand in candidate_segments:
            name = cand['name']
            if name in enriched_map:
                cand_copy = cand.copy()
                cand_copy.update(enriched_map[name])
                results.append(cand_copy)
        results.sort(key=lambda x: x.get('confidence_score', 0), reverse=True)
        return results

    def _get_priority_segments(self, expanded_keywords, all_segments):
        priority = []
        remaining = []
        seen = set()
        lower_keywords = [k.lower() for k in expanded_keywords if k]

        for seg in all_segments:
            text = f"{seg.get('name', '')} {seg.get('description', '')} {seg.get('recommended_advertisers', '')}".lower()
            if any(k in text for k in lower_keywords):
                priority.append(seg)
                seen.add(seg['name'])
            else:
                remaining.append(seg)
        return priority, remaining

    def _get_segments_by_names(self, names, all_segments):
        lookup = {s['name']: s for s in all_segments}
        return [lookup[n] for n in names if n in lookup]
